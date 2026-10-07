import type {
  Phase, Player, Round, Drawing, PublicRoom, MeView, StateMessage, Stroke, PromptPair,
  FinalAward, ToastMessage, ToastKind,
} from '../../shared/types';
import {
  PHASE_MS, MIN_PLAYERS, MAX_PLAYERS, TOTAL_ROUNDS,
  GLOWUP_ROOM_CAP, GOLDEN_ODDS,
} from '../../shared/types';
import { PROMPT_PAIRS } from '../../shared/prompts';
import { uid, shuffle, pick, PLAYER_COLORS, PLAYER_AVATARS } from './util';
import { glowUp, judge, AI_MODE } from './ai';
import { scoreRound, resolveVotes, validScore } from './scoring';

export interface Seat { player: Player; token: string; socketIds: Set<string> }
export type Emitter = (code: string, build: (seat: Seat | null) => StateMessage, toast?: ToastMessage) => void;

const HOST_GRACE_MS = 5_000;
const IMPOSTER_GRACE_MS = 8_000;
const LOBBY_DROP_MS = 15_000;
const STEAL_REVEAL_MS = 2_800;
/** The gallery stays up at least this long so the glow-up morph is seen, even if the AI was fast. */
const GALLERY_MIN_MS = 4_000;
const BOT_GLOW_DELAY_MS = [1_500, 6_000];
export const ROOM_IDLE_MS = 2 * 60 * 60 * 1000;

/** The judge's own scripted lines for designed fallback states. */
export const JUDGE_FOG = 'My glasses fogged up.';
export const GLOW_SPEECHLESS = 'The AI was speechless.';

export class Room {
  code: string;
  isDemo: boolean;
  hostId: string | null = null;
  readonly hostToken = uid(32);
  gameId = uid(16);
  private destroyed = false;
  private frozen = new Map<Round, Drawing[]>();
  chat: { id: string; playerId: string; text: string }[] = [];
  verdictReady = new Set<string>();
  round = 0;
  totalRounds = TOTAL_ROUNDS;
  phase: Phase = 'LOBBY';
  phaseEndsAt: number | null = null;
  phaseStartedAt = Date.now();
  seats = new Map<string, Seat>();         // playerId -> seat
  order: string[] = [];                     // join order
  rounds: Round[] = [];
  aiImageCount = 0;
  finalAwards: FinalAward[] = [];
  imposterHistory: string[] = [];
  usedPairIds: number[] = [];
  lastActivity = Date.now();
  screens = new Set<string>();             // main-screen socket ids (room creator devices)
  private timer: NodeJS.Timeout | null = null;
  private hostGrace: NodeJS.Timeout | null = null;
  private imposterGrace: NodeJS.Timeout | null = null;
  private lobbyDrops = new Map<string, NodeJS.Timeout>();
  /** Hooks for the demo director. */
  onPhase: ((phase: Phase) => void) | null = null;
  onDestroy: (() => void) | null = null;
  /** Demo: force who is imposter per round index. */
  forcedImposters: Record<number, string> = {};
  forcedPairs: Record<number, number> = {};
  /** Pre-made drawing payloads for bots (demo). */
  botContent: ((round: Round, playerId: string) => Partial<Drawing> | null) | null = null;

  constructor(code: string, private emit: Emitter, isDemo = false, private ai = { glowUp, judge }) {
    this.code = code;
    this.isDemo = isDemo;
  }

  // ---------- players ----------
  get players(): Player[] { return this.order.map((id) => this.seats.get(id)!.player); }
  get activePlayers(): Player[] { return this.players.filter((p) => !p.spectator); }
  playersMap(): Map<string, Player> { return new Map(this.players.map((p) => [p.id, p])); }
  currentRound(): Round | null { return this.rounds[this.round - 1] || null; }

  touch() { this.lastActivity = Date.now(); }

  addPlayer(name: string, isBot = false): { seat: Seat } | { error: string } {
    if (this.players.length >= MAX_PLAYERS) return { error: 'Room is full (8 players).' };
    let clean = name.trim().slice(0, 12) || 'Player';
    const names = new Set(this.players.map((p) => p.name.toLowerCase()));
    if (names.has(clean.toLowerCase())) {
      const stem = clean.slice(0, 9);
      let n = 2; while (names.has(`${stem} ${n}`.toLowerCase())) n++;
      clean = `${stem} ${n}`;
    }
    const idx = this.order.length;
    const usedColors = new Set(this.players.map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !usedColors.has(c)) || PLAYER_COLORS[idx % PLAYER_COLORS.length];
    const usedAv = new Set(this.players.map((p) => p.avatar));
    const avatar = PLAYER_AVATARS.find((a) => !usedAv.has(a)) || PLAYER_AVATARS[idx % PLAYER_AVATARS.length];
    const inGame = !['LOBBY', 'FINAL'].includes(this.phase);
    const player: Player = {
      id: uid(6), name: clean, color, avatar, connected: true, isBot, spectator: inGame,
      score: 0, streak: 0, readyHowTo: false, hasSubmitted: false, hasVoted: false,
    };
    const seat: Seat = { player, token: uid(16), socketIds: new Set() };
    this.seats.set(player.id, seat);
    this.order.push(player.id);
    if (this.isDemo && !this.hostId && !isBot) this.hostId = player.id;
    this.touch();
    return { seat };
  }

  findByToken(token: string): Seat | null {
    for (const s of this.seats.values()) if (s.token === token) return s;
    return null;
  }

  connect(seat: Seat, socketId: string) {
    seat.socketIds.add(socketId);
    const wasDisconnected = !seat.player.connected;
    seat.player.connected = true;
    const drop = this.lobbyDrops.get(seat.player.id);
    if (drop) { clearTimeout(drop); this.lobbyDrops.delete(seat.player.id); }
    if (seat.player.id === this.hostId && this.hostGrace) { clearTimeout(this.hostGrace); this.hostGrace = null; }
    const r = this.currentRound();
    if (r && seat.player.id === r.imposterId && this.imposterGrace) { clearTimeout(this.imposterGrace); this.imposterGrace = null; }
    this.touch();
    return wasDisconnected;
  }

  disconnect(socketId: string): Seat | null {
    for (const seat of this.seats.values()) {
      if (!seat.socketIds.has(socketId)) continue;
      seat.socketIds.delete(socketId);
      if (seat.socketIds.size === 0) {
        seat.player.connected = false;
        if (!this.destroyed) this.onPlayerGone(seat);
      }
      return seat;
    }
    this.screens.delete(socketId);
    return null;
  }

  removePlayer(playerId: string) {
    const seat = this.seats.get(playerId); if (!seat) return;
    if (this.currentRound()?.imposterId === playerId && ['PROMPT','DRAW','GALLERY','DISCUSS','VOTE'].includes(this.phase)) this.imposterFled();
    this.seats.delete(playerId);
    this.order = this.order.filter((id) => id !== playerId);
    if (this.hostId === playerId) this.passHost();
    this.checkEarlyEnd();
    this.broadcast();
  }

  private onPlayerGone(seat: Seat) {
    const id = seat.player.id;
    if (this.phase === 'LOBBY' || this.phase === 'FINAL') {
      this.lobbyDrops.set(id, setTimeout(() => {
        this.lobbyDrops.delete(id);
        if (!seat.player.connected) this.removePlayer(id);
      }, LOBBY_DROP_MS));
    }
    if (id === this.hostId) {
      this.hostGrace = setTimeout(() => { this.hostGrace = null; if (!seat.player.connected) this.passHost(); }, HOST_GRACE_MS);
    }
    const r = this.currentRound();
    if (r && id === r.imposterId && ['PROMPT', 'DRAW', 'GALLERY', 'DISCUSS', 'VOTE'].includes(this.phase)) {
      this.imposterGrace = setTimeout(() => { this.imposterGrace = null; if (!seat.player.connected) this.imposterFled(); }, IMPOSTER_GRACE_MS);
    }
    this.checkEarlyEnd();
    this.broadcast();
  }

  private passHost() {
    const next = undefined as Player | undefined; // Only the creator can explicitly delegate host authority.
    if (!next) { if (!this.seats.has(this.hostId || '')) this.hostId = null; return; }
    this.hostId = next.id;
    this.broadcast({ id: uid(4), kind: 'host', text: `${next.name} is now the host`, playerId: next.id });
  }

  // ---------- phases ----------
  private setPhase(phase: Phase, ms: number | null) {
    if (this.timer) { clearTimeout(this.timer); this.timer = null; }
    if (phase === 'DISCUSS' && this.currentRound()) {
      const r = this.currentRound()!;
      this.frozen.set(r, r.drawings.map(d => ({ ...d, glowStatus: d.glowStatus === 'pending' ? 'fallback' : d.glowStatus })));
    }
    if (['UNMASK','VERDICT','SCORES','FINAL'].includes(phase) && this.imposterGrace) { clearTimeout(this.imposterGrace); this.imposterGrace = null; }
    if (phase === 'VERDICT') {
      this.verdictReady.clear();
      for (const d of this.currentRound()?.drawings || []) if (d.judgeStatus === 'pending') {
        d.judgeStatus = 'fallback'; d.match = undefined; d.roast = JUDGE_FOG;
      }
    }
    this.phase = phase;
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = ms ? Date.now() + ms : null;
    if (ms) this.timer = setTimeout(() => this.advance(), ms);
    this.touch();
    this.onPhase?.(phase);
    if (phase === 'GALLERY') this.checkEarlyEnd();
    this.broadcast();
  }

  /** Cut the current phase short to `ms` from now (never extends). */
  private shorten(ms: number) {
    const target = Date.now() + ms;
    if (this.phaseEndsAt && this.phaseEndsAt <= target) return;
    if (this.timer) clearTimeout(this.timer);
    this.phaseEndsAt = target;
    this.timer = setTimeout(() => this.advance(), ms);
  }

  canStart(): string | null {
    if (this.destroyed) return 'This room has ended';
    if (this.phase !== 'LOBBY' && this.phase !== 'FINAL') return 'Already started';
    if (this.activePlayers.length < MIN_PLAYERS) return `Need ${MIN_PLAYERS} players (or try Demo Mode)`;
    return null;
  }

  start() {
    const err = this.canStart(); if (err) return err;
    for (const p of this.players) { p.score = 0; p.streak = 0; p.readyHowTo = false; p.spectator = false; }
    this.round = 0; this.rounds = []; this.finalAwards = []; this.imposterHistory = [];
    if (this.imposterGrace) { clearTimeout(this.imposterGrace); this.imposterGrace = null; }
    this.gameId = uid(16); this.aiImageCount = 0; this.frozen.clear(); this.chat = [];
    this.setPhase('HOW_TO', null);
    return null;
  }

  playAgain() {
    if (this.phase !== 'FINAL') return;
    for (const p of this.players) { p.score = 0; p.streak = 0; p.spectator = false; p.readyHowTo = false; }
    this.round = 0; this.rounds = []; this.finalAwards = [];
    if (this.imposterGrace) { clearTimeout(this.imposterGrace); this.imposterGrace = null; }
    this.gameId = uid(16); this.aiImageCount = 0; this.frozen.clear(); this.chat = [];
    this.setPhase('LOBBY', null);
  }

  howToReady(playerId: string) {
    const p = this.seats.get(playerId)?.player; if (!p || this.phase !== 'HOW_TO') return;
    p.readyHowTo = true;
    this.checkEarlyEnd();
    this.broadcast();
  }

  skip(playerId: string | null) {
    if (this.phase === 'DISCUSS' && (playerId === null || playerId === this.hostId)) this.advance();
  }

  private pickImposter(ids: string[]): string {
    if (this.forcedImposters[this.round]) return this.forcedImposters[this.round];
    let pool = ids.filter((id) => !this.imposterHistory.includes(id));
    if (!pool.length) { this.imposterHistory = []; pool = ids; }
    return pick(pool);
  }

  private pickPair(): PromptPair {
    if (this.forcedPairs[this.round]) return PROMPT_PAIRS.find((p) => p.id === this.forcedPairs[this.round])!;
    let pool = PROMPT_PAIRS.filter((p) => !this.usedPairIds.includes(p.id));
    if (!pool.length) { this.usedPairIds = []; pool = PROMPT_PAIRS; }
    return pick(pool);
  }

  private startRound() {
    this.round += 1;
    for (const p of this.players) { p.spectator = false; p.hasSubmitted = false; p.hasVoted = false; }
    const ids = this.activePlayers.map((p) => p.id);
    const source = this.pickPair();
    // Randomize the real answer among all four candidates in human games. A theme or
    // knowledge of the source catalog must not reveal which option is correct.
    const candidates = shuffle([source.real, ...source.stealDecoys]);
    const pair = this.isDemo || this.forcedPairs[this.round] ? source : { ...source, real: candidates[0], stealDecoys: candidates.slice(1) as [string, string, string] };
    this.chat = [];
    this.usedPairIds.push(pair.id);
    const imposterId = this.pickImposter(ids);
    this.imposterHistory.push(imposterId);
    const round: Round = {
      index: this.round, promptPairId: pair.id, theme: pair.theme, realPrompt: pair.real, decoyPrompt: pair.decoy,
      imposterId, participantIds: ids, drawings: [], votes: {}, revealedId: null, caught: null, escapeReason: null,
      stealOptions: shuffle([pair.real, ...pair.stealDecoys]), stealPick: null, stealCorrect: null,
      fled: false, awards: [],
    };
    this.rounds.push(round);
    this.setPhase('PROMPT', PHASE_MS.PROMPT);
  }

  private imposterFled() {
    const r = this.currentRound(); if (!r || r.fled || !['PROMPT','DRAW','GALLERY','DISCUSS','VOTE'].includes(this.phase)) return;
    r.fled = true; r.caught = false;
    r.awards = scoreRound(r, this.playersMap());
    this.broadcast({ id: uid(4), kind: 'fled', text: 'The imposter fled! Artists get +50' });
    this.setPhase('SCORES', PHASE_MS.SCORES);
  }

  /** Every timed phase ends early when everyone has acted. */
  private checkEarlyEnd() {
    const r = this.currentRound();
    const active = this.activePlayers.filter((p) => p.connected || p.isBot);
    const participants = r ? active.filter((p) => r.participantIds.includes(p.id)) : active;
    switch (this.phase) {
      case 'HOW_TO': if (active.length && active.every((p) => p.readyHowTo)) this.advance(); break;
      case 'DRAW': if (r && participants.every((p) => p.hasSubmitted)) this.advance(); break;
      case 'GALLERY': if (r && r.drawings.every((d) => d.glowStatus !== 'pending')) this.shorten(Math.max(0, GALLERY_MIN_MS - (Date.now() - this.phaseStartedAt))); break;
      case 'VOTE': if (r && participants.every((p) => p.hasVoted)) this.advance(); break;
      case 'VERDICT': if (participants.filter(p => !p.isBot).length && participants.filter(p => !p.isBot).every(p => this.verdictReady.has(p.id))) this.advance(); break;
      case 'STEAL': if (r && r.stealPick !== null) this.shorten(STEAL_REVEAL_MS); break;
    }
  }

  advance() {
    const r = this.currentRound();
    switch (this.phase) {
      case 'HOW_TO': return this.startRound();
      case 'PROMPT': return this.setPhase('DRAW', PHASE_MS.DRAW);
      case 'DRAW': {
        if (!r) return;
        for (const id of r.participantIds) {
          const p = this.seats.get(id)?.player;
          if (p && !p.hasSubmitted) this.submitDrawing(id, [], '', true);
        }
        return this.setPhase('GALLERY', PHASE_MS.GALLERY);
      }
      case 'GALLERY': return this.setPhase('DISCUSS', PHASE_MS.DISCUSS);
      case 'DISCUSS': return this.setPhase('VOTE', PHASE_MS.VOTE);
      case 'VOTE': {
        if (!r) return;
        resolveVotes(r);
        return this.setPhase('UNMASK', PHASE_MS.UNMASK);
      }
      case 'UNMASK': {
        if (!r) return;
        if (r.caught) return this.setPhase('STEAL', PHASE_MS.STEAL);
        return this.setPhase('VERDICT', null);
      }
      case 'STEAL': {
        if (!r) return;
        if (r.stealPick === null) r.stealCorrect = false;
        return this.setPhase('VERDICT', null);
      }
      case 'VERDICT': {
        if (!r) return;
        // Any judge still pending at this point counts as a fallback (should not happen: 15 s timeout).
        for (const d of r.drawings) if (d.judgeStatus === 'pending') { d.judgeStatus = 'fallback'; d.match = -1; d.roast = JUDGE_FOG; }
        r.awards = scoreRound(r, this.playersMap());
        return this.setPhase('SCORES', PHASE_MS.SCORES);
      }
      case 'SCORES': {
        if (this.round >= this.totalRounds) { this.computeFinalAwards(); return this.setPhase('FINAL', null); }
        return this.startRound();
      }
    }
  }

  private computeFinalAwards() {
    const byPlayer = new Map<string, { asImp: number[]; asArt: number[]; susVotes: number }>();
    for (const p of this.players) byPlayer.set(p.id, { asImp: [], asArt: [], susVotes: 0 });
    for (const r of this.rounds) {
      for (const d of r.drawings) {
        if (!validScore(d)) continue;
        const b = byPlayer.get(d.playerId); if (!b) continue;
        (d.playerId === r.imposterId ? b.asImp : b.asArt).push(d.match);
      }
      for (const t of Object.values(r.votes)) if (t !== r.imposterId) { const b = byPlayer.get(t); if (b) b.susVotes++; }
    }
    const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : -1);
    const best = (f: (b: { asImp: number[]; asArt: number[]; susVotes: number }) => number) => {
      let bestId: string | null = null; let bestV = -Infinity;
      for (const [id, b] of byPlayer) { const v = f(b); if (v > bestV) { bestV = v; bestId = id; } }
      return bestV > 0 ? { id: bestId!, v: bestV } : null;
    };
    const out: FinalAward[] = [];
    const bd = best((b) => avg(b.asImp)); if (bd) out.push({ title: 'Best Disguise', playerId: bd.id, detail: `${Math.round(bd.v)}/100 AI match as the imposter` });
    const jp = best((b) => avg(b.asArt)); if (jp) out.push({ title: "Judge's Pet", playerId: jp.id, detail: `${Math.round(jp.v)}/100 average AI match` });
    const ms = best((b) => b.susVotes); if (ms) out.push({ title: 'Most Sus Innocent', playerId: ms.id, detail: `${ms.v} wrongful vote${ms.v === 1 ? '' : 's'}` });
    this.finalAwards = out;
  }

  // ---------- actions ----------
  submitDrawing(playerId: string, strokes: Stroke[], png: string, auto = false) {
    const r = this.currentRound(); const p = this.seats.get(playerId)?.player;
    if (!r || !p || this.phase !== 'DRAW' || (!auto && !!this.phaseEndsAt && Date.now() >= this.phaseEndsAt) || p.hasSubmitted || !r.participantIds.includes(playerId)) return;
    const blank = !png || !strokes.some(s => s.points.length > 0 && !['#fff', '#ffffff', '#fffdf7'].includes(s.color.toLowerCase()));
    const gameId = this.gameId;
    const validJob = () => !this.destroyed && this.gameId === gameId && this.rounds.includes(r);
    const d: Drawing = {
      playerId, strokes, glowStatus: 'pending', golden: false, judgeStatus: 'pending', blank,
    };
    p.hasSubmitted = true;
    r.drawings.push(d);
    this.touch();
    // Bots bring their own pre-made art and scores.
    const pre = this.botContent?.(r, playerId);
    if (pre) {
      const { glowStatus, glowUrl, golden, ...rest } = pre;
      Object.assign(d, rest);
      // Bots' art arrives like real AI art: after a short delay, so the glow-up choreography plays.
      const delay = BOT_GLOW_DELAY_MS[0] + Math.random() * (BOT_GLOW_DELAY_MS[1] - BOT_GLOW_DELAY_MS[0]);
      setTimeout(() => {
        if (!validJob()) return;
        d.glowStatus = glowStatus || 'done'; d.glowUrl = glowUrl; d.golden = !!golden;
        if (d.golden) this.toast('golden', `${p.name} pulled a Golden frame!`, p.id);
        this.checkEarlyEnd(); this.broadcast();
      }, delay);
      this.checkEarlyEnd(); this.broadcast(); return;
    }
    // Both AI jobs start the moment a drawing is submitted, in parallel.
    if (blank) {
      d.glowStatus = 'fallback';
      d.judgeStatus = 'fallback'; d.match = undefined; d.sees = 'a blank canvas'; d.roast = 'Bold choice.';
    } else {
      if (this.aiImageCount >= GLOWUP_ROOM_CAP || AI_MODE === 'off') {
        d.glowStatus = 'fallback';
      } else {
        this.aiImageCount += 1;
        this.ai.glowUp(png, this.code).then((res) => {
          if (!validJob()) return;
          d.glowStatus = res.status;
          if (res.status === 'done') {
            d.glowUrl = res.glowUrl; d.glowMock = !!res.mock;
            d.golden = Math.random() < GOLDEN_ODDS;
            if (d.golden) this.toast('golden', `${p.name} pulled a Golden frame!`, p.id);
          } 
          this.checkEarlyEnd(); this.broadcast();
        });
      }
      this.ai.judge(png, r.realPrompt, blank, this.code).then((res) => {
        if (!validJob() || d.judgeStatus !== 'pending') return;
        if (res.status === 'done') { d.judgeStatus = 'done'; d.match = res.match; d.sees = res.sees; d.roast = res.roast; }
        else { d.judgeStatus = 'fallback'; d.match = -1; d.roast = JUDGE_FOG;  }
        this.broadcast();
      });
    }
    if (!auto) this.checkEarlyEnd();
    this.broadcast();
  }

  vote(voterId: string, targetId: string) {
    const r = this.currentRound(); const p = this.seats.get(voterId)?.player;
    if (!r || !p || this.phase !== 'VOTE' || (!!this.phaseEndsAt && Date.now() >= this.phaseEndsAt) || p.hasVoted || voterId === targetId) return;
    if (!r.participantIds.includes(voterId) || !r.participantIds.includes(targetId)) return;
    // The imposter votes too (to frame someone); their vote can never earn points since self-votes are blocked.
    r.votes[voterId] = targetId; p.hasVoted = true;
    this.touch(); this.checkEarlyEnd(); this.broadcast();
  }

  stealPick(playerId: string, option: string) {
    const r = this.currentRound();
    if (!r || this.phase !== 'STEAL' || (!!this.phaseEndsAt && Date.now() >= this.phaseEndsAt) || playerId !== r.imposterId || r.stealPick !== null) return;
    if (!r.stealOptions.includes(option)) return;
    r.stealPick = option; r.stealCorrect = option === r.realPrompt;
    this.touch(); this.checkEarlyEnd(); this.broadcast();
  }

  // ---------- output ----------
  toast(kind: ToastKind, text: string, playerId?: string) { this.emit(this.code, (s) => this.build(s), { id: uid(4), kind, text, playerId }); }
  broadcast(toast?: ToastMessage) { this.emit(this.code, (s) => this.build(s), toast); }

  private revealImposter(round: Round) {
    return round.index < this.round || ['UNMASK', 'STEAL', 'VERDICT', 'SCORES', 'FINAL'].includes(this.phase);
  }
  private revealJudge(round: Round) {
    return round.index < this.round || ['VERDICT', 'SCORES', 'FINAL'].includes(this.phase);
  }

  private publicRound(round: Round, viewerId: string | null): Round {
    const imp = this.revealImposter(round);
    const jud = this.revealJudge(round);
    const answer = jud || (this.phase === 'STEAL' && round.stealPick !== null);
    const showStrokes = round.index < this.round || !['PROMPT', 'DRAW'].includes(this.phase);
    const drawings = !jud ? this.frozen.get(round) || round.drawings : round.drawings;
    // Explicit allowlist: adding private fields to Round cannot silently publish them.
    return {
      index: round.index, theme: round.theme,
      promptPairId: answer ? round.promptPairId : 0,
      realPrompt: answer ? round.realPrompt : '',
      decoyPrompt: answer ? round.decoyPrompt : '',
      imposterId: imp ? round.imposterId : '',
      participantIds: [...round.participantIds],
      revealedId: imp ? round.revealedId : null, caught: imp ? round.caught : null,
      escapeReason: imp ? round.escapeReason : null, fled: imp && round.fled,
      stealOptions: imp ? [...round.stealOptions] : [],
      stealPick: answer ? round.stealPick : null, stealCorrect: answer ? round.stealCorrect : null,
      awards: jud ? round.awards.map(a => ({ ...a })) : [],
      votes: imp ? { ...round.votes } : Object.fromEntries(Object.keys(round.votes).map(k => [k, ''])),
      drawings: drawings.map(d => ({
        playerId: d.playerId, strokes: showStrokes ? d.strokes : [],
        glowUrl: showStrokes ? d.glowUrl : undefined,
        glowStatus: d.glowStatus, glowMock: d.glowMock, golden: d.golden, blank: d.blank,
        judgeStatus: jud ? d.judgeStatus : 'pending',
        match: jud ? d.match : undefined, sees: jud ? d.sees : undefined, roast: jud ? d.roast : undefined,
      })),
    };
  }

  assignHost(playerId: string) {
    const p = this.seats.get(playerId)?.player;
    if (!p || p.isBot) return;
    this.hostId = playerId; this.broadcast();
  }

  sendChat(playerId: string, text: string) {
    if (!['DISCUSS', 'VOTE'].includes(this.phase) || !this.currentRound()?.participantIds.includes(playerId)) return;
    const clean = text.trim().slice(0, 240); if (!clean) return;
    this.chat.push({ id: uid(8), playerId, text: clean });
    this.chat = this.chat.slice(-50); this.touch(); this.broadcast();
  }

  readyVerdict(playerId: string) {
    if (this.phase !== 'VERDICT' || !this.currentRound()?.participantIds.includes(playerId)) return;
    this.verdictReady.add(playerId);
    const humans = this.activePlayers.filter(p => p.connected && !p.isBot);
    if (humans.length && humans.every(p => this.verdictReady.has(p.id))) this.advance();
    else this.broadcast();
  }

  build(seat: Seat | null): StateMessage {
    const viewerId = seat?.player.id || null;
    const room: PublicRoom = {
      gameId: this.gameId, chat: this.chat, verdictReady: [...this.verdictReady],
      code: this.code, hostId: this.hostId, isDemo: this.isDemo, round: this.round, totalRounds: this.totalRounds,
      phase: this.phase, phaseEndsAt: this.phaseEndsAt, phaseStartedAt: this.phaseStartedAt,
      players: this.players, rounds: this.rounds.map((r) => this.publicRound(r, viewerId)),
      aiImageCount: this.aiImageCount, finalAwards: this.finalAwards, aiMode: AI_MODE,
    };
    let me: MeView | null = null;
    if (seat) {
      const r = this.currentRound();
      const isImp = !!r && r.imposterId === seat.player.id && r.participantIds.includes(seat.player.id);
      const inRound = !!r && r.participantIds.includes(seat.player.id) && this.phase !== 'SCORES' && this.phase !== 'FINAL';
      me = {
        playerId: seat.player.id,
        prompt: inRound && r ? (isImp ? r.decoyPrompt : r.realPrompt) : null,
        isImposter: inRound && isImp,
        isHost: seat.player.id === this.hostId,
        sessionToken: seat.token,
      };
    }
    return { room, me, serverNow: Date.now() };
  }

  destroy() {
    this.destroyed = true; this.onDestroy?.(); this.onPhase = null;
    if (this.timer) clearTimeout(this.timer);
    if (this.hostGrace) clearTimeout(this.hostGrace);
    if (this.imposterGrace) clearTimeout(this.imposterGrace);
    for (const t of this.lobbyDrops.values()) clearTimeout(t);
  }
}
