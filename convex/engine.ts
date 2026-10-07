/**
 * The game engine: pure TypeScript, no Convex imports. Ported from the old Socket.IO Room class.
 * A mutation loads EngineState, calls one method, saves the state, then carries out the collected
 * effects (timers -> ctx.scheduler, AI jobs -> actions, sketch strokes -> the sketches table).
 * Timers are cancelled by forgetting their token: a fired timer whose token no longer matches is a no-op.
 */
import type {
  Phase, Player, Round, Drawing, PublicRoom, MeView, Stroke, PromptPair, FinalAward, ToastKind, GameMode, Modifier, Breakdown,
} from '../shared/types';
import { PHASE_MS, MIN_PLAYERS, MAX_PLAYERS, TOTAL_ROUNDS, GLOWUP_ROOM_CAP, GOLDEN_ODDS } from '../shared/types';
import { PROMPT_PAIRS } from '../shared/prompts';
import { scoreRound, resolveVotes, validScore } from './scoring';
import { doodle } from './doodle';
import demo2 from './demo/2.json';
import demo9 from './demo/9.json';
import { TARGETS, DEMO_BOTS, DEMO_TARGETS, targetById, matchOf, promptProblem, type BotAttempt } from './targets';

export type AiMode = 'openai' | 'fal' | 'mock' | 'off';

const HOST_GRACE_MS = 5_000;
const IMPOSTER_GRACE_MS = 12_000;
const LOBBY_DROP_MS = 20_000;
const STEAL_REVEAL_MS = 2_800;
/** Prompt mode: time to study the target before writing. */
const STUDY_MS = 12_000;
/** Prompt mode rule per round (round 1 plain so everyone learns the loop). */
const MODIFIERS: Modifier[] = ['none', 'taboo', 'style'];
/** The reveal stays up until every tile's staggered paint-in has played (client: revealAt in Gallery.tsx), even if the AI was fast. */
const galleryMinMs = (n: number) => 1_600 + Math.max(0, n - 1) * 900 + 1_800;
const REVOTE_MS = 12_000;
const BOT_GLOW_DELAY_MS = [1_500, 6_000];
export const ROOM_IDLE_MS = 2 * 60 * 60 * 1000;
export const JUDGE_FOG = 'My glasses fogged up.';
/** Chat author id for the AI judge's discussion hint. */
export const SKETCHY_ID = 'sketchy';

export const uid = (n = 8) => {
  const b = new Uint8Array(n); crypto.getRandomValues(b);
  return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
};
export function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const randomCode = () => Array.from({ length: 4 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
const PLAYER_COLORS = ['#FF6B6B', '#FFA94D', '#FFE066', '#63E6BE', '#4DABF7', '#B197FC', '#F783AC', '#F8F9FA'];
const PLAYER_AVATARS = ['🦊', '🐸', '🦄', '🐙', '🐼', '🦁', '🐧', '🐲'];

// ---------- demo content ----------
interface BotDrawing { strokes: Stroke[]; glowUrl?: string; golden?: boolean; match: number; sees: string; roast: string }
interface DemoContent { pairId: number; real: BotDrawing[]; decoy: BotDrawing[] }
const DEMO: Record<number, DemoContent> = { 2: demo2 as DemoContent, 9: demo9 as DemoContent };
export const BOT_NAMES = ['Pixel', 'Doodle', 'Smudge'];

function procedural(pairId: number, slot: 'real' | 'decoy', idx: number): BotDrawing {
  const seed = pairId * 1000 + (slot === 'real' ? 0 : 500) + idx * 17;
  const sees = ['a cheerful creature', 'someone having a day', 'a figure with a prop', 'a very round hero', 'legs and ambition'];
  const roasts = ['Bold lines, bolder choices.', 'The chair steals the scene.', 'Anatomy is a suggestion here.', 'I feel the energy at least.', 'Confident. Wrong, but confident.'];
  const base = slot === 'real' ? 58 + ((seed * 7) % 30) : 28 + ((seed * 3) % 25);
  return { strokes: doodle(seed), match: base, sees: sees[seed % sees.length], roast: roasts[(seed * 3) % roasts.length], golden: false };
}

// ---------- state & effects ----------
export interface Seat { player: Player; token: string }
export interface Toast { id: string; kind: ToastKind; text: string; playerId?: string }
export type TimerAction =
  | { t: 'advance' }
  | { t: 'hostGrace'; id: string }
  | { t: 'imposterGrace'; id: string }
  | { t: 'lobbyDrop'; id: string }
  | { t: 'botGlow'; round: number; id: string; gameId: string }
  | { t: 'bot'; op: 'howto' | 'draw' | 'vote' | 'steal' | 'skip' | 'chat' | 'draft' | 'final'; id: string; text?: string }
  | { t: 'botDraft'; round: number; id: string; gameId: string };

export interface EngineState {
  code: string; isDemo: boolean; hostId: string | null; hostToken: string; gameId: string;
  chat: { id: string; playerId: string; text: string }[]; verdictReady: string[];
  round: number; totalRounds: number; phase: Phase; phaseEndsAt: number | null; phaseStartedAt: number;
  seats: Seat[]; rounds: Round[]; frozen: Record<string, Drawing[]>;
  aiImageCount: number; finalAwards: FinalAward[]; imposterHistory: string[]; usedPairIds: number[];
  lastActivity: number; timers: Record<string, string>;
  forcedImposters: Record<string, string>; forcedPairs: Record<string, number>;
  botIds: string[]; botUsed: Record<string, number>; toasts: Toast[];
  mode?: GameMode; forcedTargets?: Record<string, string>; usedTargetIds?: string[];
}

export type Effect =
  | { t: 'timer'; key: string; token: string; ms: number; action: TimerAction }
  | { t: 'sketch'; round: number; playerId: string; strokes: Stroke[]; png?: string }
  | { t: 'glow'; round: number; playerId: string; gameId: string }
  | { t: 'judge'; round: number; playerId: string; gameId: string; prompt: string }
  | { t: 'hint'; round: number; gameId: string }
  | { t: 'gen'; round: number; playerId: string; gameId: string; pass: 'draft' | 'final'; prompt: string }
  | { t: 'compare'; round: number; playerId: string; gameId: string; pass: 'draft' | 'final'; attemptUrl: string; targetPath: string; styleRound: boolean };

const pickBreakdown = (b: Breakdown): Breakdown => ({ subject: b.subject, details: b.details, style: b.style, color: b.color, composition: b.composition });

export function newState(code: string, isDemo: boolean, now: number): EngineState {
  return {
    code, isDemo, hostId: null, hostToken: uid(32), gameId: uid(16), chat: [], verdictReady: [],
    round: 0, totalRounds: isDemo ? 2 : TOTAL_ROUNDS, phase: 'LOBBY', phaseEndsAt: null, phaseStartedAt: now,
    seats: [], rounds: [], frozen: {}, aiImageCount: 0, finalAwards: [], imposterHistory: [], usedPairIds: [],
    lastActivity: now, timers: {}, forcedImposters: {}, forcedPairs: {}, botIds: [], botUsed: {}, toasts: [],
    mode: 'prompt', forcedTargets: {}, usedTargetIds: [],
  };
}

export class Engine {
  effects: Effect[] = [];
  constructor(public s: EngineState, public aiMode: AiMode, public now = Date.now()) {}

  // ---------- helpers ----------
  get players(): Player[] { return this.s.seats.map((x) => x.player); }
  get activePlayers(): Player[] { return this.players.filter((p) => !p.spectator); }
  seat(id: string) { return this.s.seats.find((x) => x.player.id === id) || null; }
  findByToken(token: string) { return this.s.seats.find((x) => x.token === token) || null; }
  playersMap() { return new Map(this.players.map((p) => [p.id, p])); }
  currentRound(): Round | null { return this.s.rounds[this.s.round - 1] || null; }
  touch() { this.s.lastActivity = this.now; }
  toast(kind: ToastKind, text: string, playerId?: string) { this.s.toasts = [...this.s.toasts, { id: uid(4), kind, text, playerId }].slice(-8); }

  private schedule(key: string, ms: number, action: TimerAction) {
    const token = uid(6); this.s.timers[key] = token;
    this.effects.push({ t: 'timer', key, token, ms: Math.max(0, ms), action });
  }
  private cancel(key: string) { delete this.s.timers[key]; }
  private cancelBots() { for (const k of Object.keys(this.s.timers)) if (k.startsWith('bot:')) delete this.s.timers[k]; }
  private botLater(ms: number, op: Extract<TimerAction, { t: 'bot' }>['op'], id: string, text?: string) {
    this.schedule(`bot:${uid(4)}`, ms, { t: 'bot', op, id, text });
  }

  /** A scheduled timer fired. Returns false if it was cancelled or superseded. */
  fire(key: string, token: string, a: TimerAction): boolean {
    if (this.s.timers[key] !== token) return false;
    delete this.s.timers[key];
    switch (a.t) {
      case 'advance': this.advance(); break;
      case 'hostGrace': if (!this.seat(a.id)?.player.connected) this.passHost(); break;
      case 'imposterGrace': if (!this.seat(a.id)?.player.connected) this.imposterFled(); break;
      case 'lobbyDrop': if (this.seat(a.id) && !this.seat(a.id)!.player.connected) this.removePlayer(a.id); break;
      case 'botGlow': this.botGlowArrives(a.round, a.id, a.gameId); break;
      case 'botDraft': this.botDraftArrives(a.round, a.id, a.gameId); break;
      case 'bot': this.botAct(a.op, a.id, a.text); break;
    }
    return true;
  }

  // ---------- players ----------
  addPlayer(name: string, isBot = false): Seat | { error: string } {
    if (this.players.length >= MAX_PLAYERS) return { error: 'Room is full (8 players).' };
    let clean = name.trim().slice(0, 12) || 'Player';
    const names = new Set(this.players.map((p) => p.name.toLowerCase()));
    if (names.has(clean.toLowerCase()) || clean.toLowerCase() === SKETCHY_ID) {
      const stem = clean.slice(0, 9);
      let n = 2; while (names.has(`${stem} ${n}`.toLowerCase())) n++;
      clean = `${stem} ${n}`;
    }
    const idx = this.s.seats.length;
    const usedColors = new Set(this.players.map((p) => p.color));
    const color = PLAYER_COLORS.find((c) => !usedColors.has(c)) || PLAYER_COLORS[idx % PLAYER_COLORS.length];
    const usedAv = new Set(this.players.map((p) => p.avatar));
    const avatar = PLAYER_AVATARS.find((a) => !usedAv.has(a)) || PLAYER_AVATARS[idx % PLAYER_AVATARS.length];
    const inGame = !['LOBBY', 'FINAL'].includes(this.s.phase);
    const player: Player = {
      id: uid(6), name: clean, color, avatar, connected: true, isBot, spectator: inGame,
      score: 0, streak: 0, readyHowTo: false, hasSubmitted: false, hasVoted: false,
    };
    const seat: Seat = { player, token: uid(16) };
    this.s.seats.push(seat);
    if (this.s.isDemo && !this.s.hostId && !isBot) this.s.hostId = player.id;
    this.touch();
    return seat;
  }

  /** A client for this seat checked in (join, rejoin or heartbeat after being marked away). */
  connect(seat: Seat) {
    const was = seat.player.connected;
    seat.player.connected = true;
    this.cancel(`lobbyDrop:${seat.player.id}`);
    if (seat.player.id === this.s.hostId) this.cancel('hostGrace');
    if (this.currentRound()?.imposterId === seat.player.id) this.cancel('imposterGrace');
    this.touch();
    if (!was) this.toast('info', `${seat.player.name} is back`, seat.player.id);
  }

  /** No heartbeat from this seat for a while. */
  disconnect(seat: Seat) {
    if (!seat.player.connected || seat.player.isBot) return;
    seat.player.connected = false;
    const id = seat.player.id;
    if (this.s.phase === 'LOBBY' || this.s.phase === 'FINAL') this.schedule(`lobbyDrop:${id}`, LOBBY_DROP_MS, { t: 'lobbyDrop', id });
    if (id === this.s.hostId) this.schedule('hostGrace', HOST_GRACE_MS, { t: 'hostGrace', id });
    const r = this.currentRound();
    if (r && id === r.imposterId && ['PROMPT', 'DRAW', 'GALLERY', 'DISCUSS', 'VOTE'].includes(this.s.phase)) {
      this.schedule('imposterGrace', IMPOSTER_GRACE_MS, { t: 'imposterGrace', id });
    }
    this.checkEarlyEnd();
  }

  removePlayer(playerId: string) {
    if (!this.seat(playerId)) return;
    if (this.currentRound()?.imposterId === playerId && ['PROMPT', 'DRAW', 'GALLERY', 'DISCUSS', 'VOTE'].includes(this.s.phase)) this.imposterFled();
    this.s.seats = this.s.seats.filter((x) => x.player.id !== playerId);
    if (this.s.hostId === playerId) this.passHost();
    this.checkEarlyEnd();
  }

  private passHost() {
    // Only the creator can explicitly delegate host authority; a departed host simply leaves the room hostless.
    if (!this.seat(this.s.hostId || '')) this.s.hostId = null;
  }

  assignHost(playerId: string) {
    const p = this.seat(playerId)?.player;
    if (!p || p.isBot) return;
    this.s.hostId = playerId;
  }

  // ---------- demo ----------
  setupDemo(humanId: string) {
    const bots = BOT_NAMES.map((n) => this.addPlayer(n, true)).filter((x): x is Seat => 'player' in x);
    this.s.botIds = bots.map((b) => b.player.id);
    this.s.totalRounds = 2;
    const withContent = PROMPT_PAIRS.filter((p) => DEMO[p.id]).map((p) => p.id);
    const pool = withContent.length >= 2 ? withContent : PROMPT_PAIRS.map((p) => p.id);
    const [a, b] = shuffle(pool);
    this.s.forcedPairs = { 1: a, 2: b };
    this.s.forcedImposters = { 1: pick(this.s.botIds), 2: humanId };
    this.s.forcedTargets = { 1: DEMO_TARGETS[0], 2: DEMO_TARGETS[1] };
  }

  get mode(): GameMode { return this.s.mode || 'sketch'; }
  setMode(m: GameMode) { if (this.s.phase === 'LOBBY' || this.s.phase === 'FINAL') this.s.mode = m; }

  private botContent(round: Round, playerId: string): BotDrawing {
    const slot = playerId === round.imposterId ? 'decoy' : 'real';
    const content = DEMO[round.promptPairId];
    const key = `${round.index}:${slot}`;
    const idx = this.s.botUsed[key] || 0; this.s.botUsed[key] = idx + 1;
    return content ? content[slot][idx % content[slot].length] : procedural(round.promptPairId, slot, idx);
  }

  private demoOnPhase(phase: Phase) {
    this.cancelBots();
    const r = this.currentRound();
    const bots = this.s.botIds.filter((id) => this.seat(id));
    switch (phase) {
      case 'HOW_TO': for (const id of bots) this.botLater(300, 'howto', id); break;
      case 'DRAW': for (const id of bots) this.botLater(1500 + Math.random() * 2500, 'draw', id); break;
      case 'DRAFT': for (const id of bots) this.botLater(5000 + Math.random() * 9000, 'draft', id); break;
      case 'REFINE': for (const id of bots) this.botLater(9000 + Math.random() * 14000, 'final', id); break;
      case 'DISCUSS': {
        if (!r) break;
        // Bots argue in the chat so a solo player has something to react to; the human can skip any time.
        const names = new Map(this.players.map((p) => [p.id, p.name]));
        const others = (id: string) => shuffle(r.participantIds.filter((x) => x !== id));
        const lines = (id: string) => {
          const isImp = id === r.imposterId;
          const target = names.get(isImp ? others(id)[0] : Math.random() < 0.6 ? r.imposterId : others(id)[0]) || 'someone';
          return pick(isImp
            ? [`Honestly ${target}'s one looks a bit off to me.`, `Mine is exactly the prompt. ${target} though…`, `Why does ${target}'s have extra stuff?`]
            : [`${target}'s drawing is giving different energy.`, `Hmm, ${target}, explain yourself.`, `I'm looking at ${target}. Something doesn't match.`, `Is it just me or is ${target}'s one weird?`]);
        };
        shuffle(bots).slice(0, 3).forEach((id, i) => this.botLater(2000 + i * 3500 + Math.random() * 1000, 'chat', id, lines(id)));
        this.botLater(16_000, 'skip', bots[0] || '');
        break;
      }
      case 'VOTE': {
        if (!r) break;
        for (const id of bots) this.botLater(2500 + Math.random() * 8000, 'vote', id);
        break;
      }
      case 'STEAL': {
        if (!r || !bots.includes(r.imposterId)) break;
        this.botLater(3000 + Math.random() * 3000, 'steal', r.imposterId);
        break;
      }
    }
  }

  private botAct(op: Extract<TimerAction, { t: 'bot' }>['op'], id: string, text?: string) {
    const r = this.currentRound();
    switch (op) {
      case 'howto': return this.howToReady(id);
      case 'draw': return this.submitDrawing(id, [], '');
      case 'draft': return this.botPrompt(id, 'draft');
      case 'final': return this.botPrompt(id, 'final');
      case 'skip': return this.skip(null);
      case 'chat': if (text && ['DISCUSS', 'VOTE'].includes(this.s.phase)) this.pushChat(id, text); return;
      case 'vote': {
        if (!r) return;
        const others = (r.revote || r.participantIds).filter((x) => x !== id);
        if (!others.length) return;
        // A bot imposter frames a random artist; artist bots mostly pick the odd one out, sometimes wrong.
        const target = id === r.imposterId ? pick(others) : Math.random() < 0.65 && others.includes(r.imposterId) ? r.imposterId : pick(others);
        return this.vote(id, target);
      }
      case 'steal': if (r) return this.stealPick(id, Math.random() < 0.5 ? r.realPrompt : pick(r.stealOptions)); return;
    }
  }

  private botGlowArrives(round: number, id: string, gameId: string) {
    if (gameId !== this.s.gameId) return;
    const d = this.s.rounds[round - 1]?.drawings.find((x) => x.playerId === id); if (!d) return;
    const pre = (d as any).pendingGlow as { glowUrl?: string; golden?: boolean } | undefined;
    d.glowStatus = 'done'; d.glowUrl = pre?.glowUrl; d.glowMock = !pre?.glowUrl; d.golden = !!pre?.golden;
    delete (d as any).pendingGlow;
    if (d.golden) this.toast('golden', `${this.seat(id)?.player.name} pulled a Golden frame!`, id);
    this.checkEarlyEnd();
  }

  /** A demo bot's pre-made attempt for this round (artists by seat order; the imposter gets the imposter attempt). */
  private botAttempt(r: Round, id: string): BotAttempt | null {
    const set = DEMO_BOTS[r.targetId || '']; if (!set) return null;
    if (id === r.imposterId) return set.imposter || set.artists[0] || null;
    const artists = this.s.botIds.filter((b) => b !== r.imposterId);
    return set.artists[Math.max(0, artists.indexOf(id)) % set.artists.length] || null;
  }

  private botPrompt(id: string, pass: 'draft' | 'final') {
    const r = this.currentRound(); if (!r) return;
    const a = this.botAttempt(r, id);
    const p = this.seat(id)?.player; if (!p || !a) return;
    if (pass === 'draft') {
      if (this.s.phase !== 'DRAFT' || p.hasSubmitted) return;
      const d: Drawing = { playerId: id, strokes: [], glowStatus: 'pending', golden: false, judgeStatus: 'pending', blank: false, draftPrompt: a.draftPrompt, draftStatus: 'pending' };
      r.drawings.push(d); p.hasSubmitted = true;
      this.schedule(`botDraft:${r.index}:${id}`, 2500 + Math.random() * 3000, { t: 'botDraft', round: r.index, id, gameId: this.s.gameId });
    } else {
      const d = r.drawings.find((x) => x.playerId === id);
      if (this.s.phase !== 'REFINE' || !d || d.finalPrompt !== undefined) return;
      d.finalPrompt = a.finalPrompt; d.glowStatus = 'pending';
      const b = a.final;
      Object.assign(d, { breakdown: pickBreakdown(b), match: matchOf(b, r.modifier === 'style'), sees: b.missed, roast: b.tip, judgeStatus: 'done' });
      (d as any).pendingGlow = { glowUrl: a.finalImage, golden: false };
      this.schedule(`botGlow:${r.index}:${id}`, 3000 + Math.random() * 4000, { t: 'botGlow', round: r.index, id, gameId: this.s.gameId });
    }
    this.checkEarlyEnd();
  }

  private botDraftArrives(round: number, id: string, gameId: string) {
    if (gameId !== this.s.gameId) return;
    const r = this.s.rounds[round - 1]; const d = r?.drawings.find((x) => x.playerId === id); if (!r || !d) return;
    const a = this.botAttempt(r, id); if (!a) return;
    d.draftStatus = 'done'; d.draftUrl = a.draftImage; d.draftMatch = matchOf(a.draft, r.modifier === 'style'); d.draftMissed = a.draft.missed; d.draftTip = a.draft.tip;
  }

  // ---------- phases ----------
  private setPhase(phase: Phase, ms: number | null) {
    this.cancel('advance');
    const r = this.currentRound();
    if (phase === 'DISCUSS' && r) {
      this.s.frozen[String(r.index)] = r.drawings.map((d) => ({ ...d, glowStatus: d.glowStatus === 'pending' ? 'fallback' : d.glowStatus }));
      this.effects.push({ t: 'hint', round: r.index, gameId: this.s.gameId });
    }
    if (['UNMASK', 'VERDICT', 'SCORES', 'FINAL'].includes(phase)) this.cancel('imposterGrace');
    if (phase === 'VERDICT') {
      this.s.verdictReady = [];
      for (const d of r?.drawings || []) if (d.judgeStatus === 'pending') { d.judgeStatus = 'fallback'; d.match = undefined; d.roast = JUDGE_FOG; }
    }
    this.s.phase = phase;
    this.s.phaseStartedAt = this.now;
    this.s.phaseEndsAt = ms ? this.now + ms : null;
    if (ms) this.schedule('advance', ms, { t: 'advance' });
    this.touch();
    if (this.s.isDemo) this.demoOnPhase(phase);
    if (phase === 'GALLERY') this.checkEarlyEnd();
  }

  /** Cut the current phase short to `ms` from now (never extends). */
  private shorten(ms: number) {
    const target = this.now + ms;
    if (this.s.phaseEndsAt && this.s.phaseEndsAt <= target) return;
    this.s.phaseEndsAt = target;
    this.schedule('advance', ms, { t: 'advance' });
  }

  canStart(): string | null {
    if (this.s.phase !== 'LOBBY' && this.s.phase !== 'FINAL') return 'Already started';
    if (this.activePlayers.length < MIN_PLAYERS) return `Need ${MIN_PLAYERS} players (or try the solo demo)`;
    return null;
  }

  private resetGame() {
    for (const p of this.players) { p.score = 0; p.streak = 0; p.readyHowTo = false; p.spectator = false; }
    this.s.round = 0; this.s.rounds = []; this.s.finalAwards = []; this.s.imposterHistory = [];
    this.cancel('imposterGrace');
    this.s.gameId = uid(16); this.s.aiImageCount = 0; this.s.frozen = {}; this.s.chat = []; this.s.botUsed = {};
  }

  start() {
    const err = this.canStart(); if (err) return err;
    if (this.s.isDemo && this.s.phase === 'FINAL') {
      const human = this.players.find((p) => !p.isBot);
      const [a, b] = shuffle(Object.keys(DEMO).map(Number));
      this.s.forcedPairs = { 1: a, 2: b }; this.s.forcedImposters = { 1: pick(this.s.botIds), 2: human?.id || '' };
    }
    this.resetGame();
    this.setPhase('HOW_TO', null);
    return null;
  }

  playAgain() {
    if (this.s.phase !== 'FINAL') return;
    this.resetGame();
    this.setPhase('LOBBY', null);
  }

  howToReady(playerId: string) {
    const p = this.seat(playerId)?.player; if (!p || this.s.phase !== 'HOW_TO') return;
    p.readyHowTo = true;
    this.checkEarlyEnd();
  }

  skip(playerId: string | null) {
    if (this.s.phase === 'DISCUSS' && (playerId === null || playerId === this.s.hostId)) this.advance();
  }

  private pickImposter(ids: string[]): string {
    const forced = this.s.forcedImposters[String(this.s.round)];
    if (forced && ids.includes(forced)) return forced;
    let pool = ids.filter((id) => !this.s.imposterHistory.includes(id));
    if (!pool.length) { this.s.imposterHistory = []; pool = ids; }
    return pick(pool);
  }

  private pickPair(): PromptPair {
    const forced = this.s.forcedPairs[String(this.s.round)];
    if (forced) return PROMPT_PAIRS.find((p) => p.id === forced)!;
    let pool = PROMPT_PAIRS.filter((p) => !this.s.usedPairIds.includes(p.id));
    if (!pool.length) { this.s.usedPairIds = []; pool = PROMPT_PAIRS; }
    return pick(pool);
  }

  private pickTarget() {
    const forced = this.s.forcedTargets?.[String(this.s.round)];
    const f = forced && targetById(forced); if (f) return f;
    const used = this.s.usedTargetIds || [];
    let pool = TARGETS.filter((t) => !used.includes(t.id));
    if (!pool.length) { this.s.usedTargetIds = []; pool = TARGETS; }
    const t = pick(pool); this.s.usedTargetIds = [...(this.s.usedTargetIds || []), t.id];
    return t;
  }

  private startRound() {
    this.s.round += 1;
    for (const p of this.players) { p.spectator = false; p.hasSubmitted = false; p.hasVoted = false; }
    const ids = this.activePlayers.map((p) => p.id);
    const source = this.pickPair();
    // Randomize the real answer among the four candidates in human games so the catalog can't give it away.
    const candidates = shuffle([source.real, ...source.stealDecoys]);
    const forced = !!this.s.forcedPairs[String(this.s.round)];
    const pair = this.s.isDemo || forced ? source : { ...source, real: candidates[0], stealDecoys: candidates.slice(1) as [string, string, string] };
    this.s.chat = [];
    this.s.usedPairIds.push(pair.id);
    const imposterId = this.pickImposter(ids);
    this.s.imposterHistory.push(imposterId);
    const round: Round = {
      index: this.s.round, promptPairId: pair.id, theme: pair.theme, realPrompt: pair.real, decoyPrompt: pair.decoy,
      imposterId, participantIds: ids, drawings: [], votes: {}, revealedId: null, caught: null, escapeReason: null,
      stealOptions: shuffle([pair.real, ...pair.stealDecoys]), stealPick: null, stealCorrect: null, fled: false, awards: [],
    };
    if (this.mode === 'prompt') {
      const t = this.pickTarget();
      // The steal asks what was hidden behind the blur; "realPrompt" is that hidden detail.
      Object.assign(round, {
        mode: 'prompt', targetId: t.id, targetUrl: t.image, targetPrompt: t.prompt, theme: t.theme, promptPairId: 0,
        realPrompt: t.key, decoyPrompt: '', stealOptions: shuffle(t.stealOptions),
        modifier: MODIFIERS[(this.s.round - 1) % MODIFIERS.length],
      });
    }
    this.s.rounds.push(round);
    this.setPhase('PROMPT', this.mode === 'prompt' ? STUDY_MS : PHASE_MS.PROMPT);
  }

  private imposterFled() {
    const r = this.currentRound(); if (!r || r.fled || !['PROMPT', 'DRAW', 'GALLERY', 'DISCUSS', 'VOTE'].includes(this.s.phase)) return;
    r.fled = true; r.caught = false;
    r.awards = scoreRound(r, this.playersMap());
    this.toast('fled', 'The imposter fled! Artists get +50');
    this.setPhase('SCORES', PHASE_MS.SCORES);
  }

  /** Every timed phase ends early when everyone has acted. */
  private checkEarlyEnd() {
    const r = this.currentRound();
    const active = this.activePlayers.filter((p) => p.connected || p.isBot);
    const participants = r ? active.filter((p) => r.participantIds.includes(p.id)) : active;
    switch (this.s.phase) {
      case 'HOW_TO': if (active.length && active.every((p) => p.readyHowTo)) this.advance(); break;
      case 'DRAW': if (r && participants.every((p) => p.hasSubmitted)) this.advance(); break;
      case 'DRAFT': if (r && participants.every((p) => p.hasSubmitted)) this.advance(); break;
      case 'REFINE': if (r && participants.every((p) => r.drawings.find((d) => d.playerId === p.id)?.finalPrompt !== undefined)) this.advance(); break;
      case 'GALLERY': if (r && r.drawings.every((d) => d.glowStatus !== 'pending')) this.shorten(Math.max(0, galleryMinMs(r.drawings.length) - (this.now - this.s.phaseStartedAt))); break;
      case 'VOTE': if (r && participants.every((p) => p.hasVoted)) this.advance(); break;
      case 'VERDICT': { const humans = participants.filter((p) => !p.isBot); if (humans.length && humans.every((p) => this.s.verdictReady.includes(p.id))) this.advance(); break; }
      case 'STEAL': if (r && r.stealPick !== null) this.shorten(STEAL_REVEAL_MS); break;
    }
  }

  advance() {
    const r = this.currentRound();
    switch (this.s.phase) {
      case 'HOW_TO': return this.startRound();
      case 'PROMPT': return this.mode === 'prompt' ? this.setPhase('DRAFT', PHASE_MS.DRAFT) : this.setPhase('DRAW', PHASE_MS.DRAW);
      case 'DRAFT': {
        if (!r) return;
        for (const id of r.participantIds) {
          const p = this.seat(id)?.player;
          if (p && !p.hasSubmitted) { p.hasSubmitted = true; r.drawings.push({ playerId: id, strokes: [], glowStatus: 'fallback', golden: false, judgeStatus: 'fallback', blank: true, draftStatus: 'fallback', finalPrompt: '' }); }
        }
        return this.setPhase('REFINE', PHASE_MS.REFINE);
      }
      case 'REFINE': {
        if (!r) return;
        // No final prompt in time: the draft stands as the final.
        for (const d of r.drawings) if (d.finalPrompt === undefined) this.useDraftAsFinal(r, d);
        return this.setPhase('GALLERY', PHASE_MS.GALLERY);
      }
      case 'DRAW': {
        if (!r) return;
        for (const id of r.participantIds) {
          const p = this.seat(id)?.player;
          if (p && !p.hasSubmitted) this.submitDrawing(id, [], '', true);
        }
        return this.setPhase('GALLERY', PHASE_MS.GALLERY);
      }
      case 'GALLERY': return this.setPhase('DISCUSS', PHASE_MS.DISCUSS);
      case 'DISCUSS': return this.setPhase('VOTE', PHASE_MS.VOTE);
      case 'VOTE': {
        if (!r) return;
        const top = resolveVotes(r);
        // A tie that includes the imposter gets one quick revote between just the tied players.
        if (r.escapeReason === 'tie' && !r.revote && top.includes(r.imposterId)) {
          r.revote = top; r.votes = {}; r.revealedId = null; r.caught = null; r.escapeReason = null;
          for (const p of this.players) p.hasVoted = false;
          this.toast('info', 'It’s a tie! Quick revote between the tied players.');
          return this.setPhase('VOTE', REVOTE_MS);
        }
        return this.setPhase('UNMASK', PHASE_MS.UNMASK);
      }
      case 'UNMASK': { if (!r) return; return r.caught ? this.setPhase('STEAL', PHASE_MS.STEAL) : this.setPhase('VERDICT', null); }
      case 'STEAL': { if (!r) return; if (r.stealPick === null) r.stealCorrect = false; return this.setPhase('VERDICT', null); }
      case 'VERDICT': {
        if (!r) return;
        for (const d of r.drawings) if (d.judgeStatus === 'pending') { d.judgeStatus = 'fallback'; d.match = -1; d.roast = JUDGE_FOG; }
        r.awards = scoreRound(r, this.playersMap());
        return this.setPhase('SCORES', PHASE_MS.SCORES);
      }
      case 'SCORES': {
        if (this.s.round >= this.s.totalRounds) { this.computeFinalAwards(); return this.setPhase('FINAL', null); }
        return this.startRound();
      }
    }
  }

  private computeFinalAwards() {
    const byPlayer = new Map<string, { asImp: number[]; asArt: number[]; susVotes: number }>();
    for (const p of this.players) byPlayer.set(p.id, { asImp: [], asArt: [], susVotes: 0 });
    for (const r of this.s.rounds) {
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
    this.s.finalAwards = out;
  }

  // ---------- actions ----------
  submitDrawing(playerId: string, strokes: Stroke[], png: string, auto = false) {
    const r = this.currentRound(); const p = this.seat(playerId)?.player;
    if (!r || !p || this.s.phase !== 'DRAW' || (!auto && !!this.s.phaseEndsAt && this.now >= this.s.phaseEndsAt) || p.hasSubmitted || !r.participantIds.includes(playerId)) return;
    const d: Drawing = { playerId, strokes: [], glowStatus: 'pending', golden: false, judgeStatus: 'pending', blank: false };
    p.hasSubmitted = true;
    r.drawings.push(d);
    this.touch();
    if (p.isBot) {
      // Bots bring their own pre-made art and scores; the art "arrives" after a short delay like real AI art.
      const bd = this.botContent(r, playerId);
      Object.assign(d, { match: bd.match, sees: bd.sees, roast: bd.roast, judgeStatus: 'done' });
      (d as any).pendingGlow = { glowUrl: bd.glowUrl, golden: bd.golden ?? false };
      this.effects.push({ t: 'sketch', round: r.index, playerId, strokes: bd.strokes });
      const delay = BOT_GLOW_DELAY_MS[0] + Math.random() * (BOT_GLOW_DELAY_MS[1] - BOT_GLOW_DELAY_MS[0]);
      this.schedule(`botGlow:${r.index}:${playerId}`, delay, { t: 'botGlow', round: r.index, id: playerId, gameId: this.s.gameId });
      this.checkEarlyEnd(); return;
    }
    const blank = !png || !strokes.some((s) => s.points.length > 0 && !['#fff', '#ffffff', '#fffdf7'].includes(s.color.toLowerCase()));
    d.blank = blank;
    this.effects.push({ t: 'sketch', round: r.index, playerId, strokes, png: blank ? undefined : png });
    if (blank) {
      d.glowStatus = 'fallback';
      d.judgeStatus = 'fallback'; d.match = undefined; d.sees = 'a blank canvas'; d.roast = 'Bold choice.';
    } else {
      // Both AI jobs start the moment a drawing is submitted, in parallel.
      if (this.s.aiImageCount >= GLOWUP_ROOM_CAP || this.aiMode === 'off') d.glowStatus = 'fallback';
      else { this.s.aiImageCount += 1; this.effects.push({ t: 'glow', round: r.index, playerId, gameId: this.s.gameId }); }
      this.effects.push({ t: 'judge', round: r.index, playerId, gameId: this.s.gameId, prompt: r.realPrompt });
    }
    if (!auto) this.checkEarlyEnd();
  }

  applyGlow(round: number, playerId: string, gameId: string, res: { status: 'done' | 'fallback'; glowUrl?: string; mock?: boolean }) {
    if (gameId !== this.s.gameId) return;
    const d = this.s.rounds[round - 1]?.drawings.find((x) => x.playerId === playerId); if (!d || d.glowStatus !== 'pending') return;
    d.glowStatus = res.status;
    if (res.status === 'done') {
      d.glowUrl = res.glowUrl; d.glowMock = !!res.mock;
      d.golden = Math.random() < GOLDEN_ODDS;
      if (d.golden) this.toast('golden', `${this.seat(playerId)?.player.name} pulled a Golden frame!`, playerId);
    }
    this.checkEarlyEnd();
  }

  applyJudge(round: number, playerId: string, gameId: string, res: { status: 'done' | 'fallback'; match?: number; sees?: string; roast?: string }) {
    if (gameId !== this.s.gameId) return;
    const d = this.s.rounds[round - 1]?.drawings.find((x) => x.playerId === playerId); if (!d || d.judgeStatus !== 'pending') return;
    if (res.status === 'done') { d.judgeStatus = 'done'; d.match = res.match; d.sees = res.sees; d.roast = res.roast; }
    else { d.judgeStatus = 'fallback'; d.match = -1; d.roast = JUDGE_FOG; }
  }

  /** Prompt mode: a player locks in their draft or final prompt. Returns a message if the prompt breaks a rule. */
  submitPrompt(playerId: string, pass: 'draft' | 'final', text: string): string | null {
    const r = this.currentRound(); const p = this.seat(playerId)?.player;
    if (!r || !p || r.mode !== 'prompt' || !r.participantIds.includes(playerId)) return null;
    if (this.s.phase !== (pass === 'draft' ? 'DRAFT' : 'REFINE') || (!!this.s.phaseEndsAt && this.now >= this.s.phaseEndsAt + 1500)) return 'Too late for that step.';
    const target = targetById(r.targetId || '');
    const problem = promptProblem(text, pass, r.modifier === 'taboo' ? target?.taboo || [] : null);
    if (problem) return problem;
    const clean = text.trim().replace(/\s+/g, ' ');
    if (pass === 'draft') {
      if (p.hasSubmitted) return null;
      r.drawings.push({ playerId, strokes: [], glowStatus: 'pending', golden: false, judgeStatus: 'pending', blank: false, draftPrompt: clean, draftStatus: 'pending' });
      p.hasSubmitted = true;
    } else {
      const d = r.drawings.find((x) => x.playerId === playerId);
      if (!d || d.finalPrompt !== undefined) return null;
      d.finalPrompt = clean; d.glowStatus = 'pending'; d.blank = false;
    }
    this.touch();
    if (this.s.aiImageCount >= GLOWUP_ROOM_CAP * 2 || this.aiMode === 'off') this.applyGen(r.index, playerId, this.s.gameId, pass, { status: 'fallback' });
    else { this.s.aiImageCount += 1; this.effects.push({ t: 'gen', round: r.index, playerId, gameId: this.s.gameId, pass, prompt: clean }); }
    this.checkEarlyEnd();
    return null;
  }

  private useDraftAsFinal(r: Round, d: Drawing) {
    d.finalPrompt = d.draftPrompt || '';
    d.glowUrl = d.draftUrl; d.glowStatus = d.draftStatus === 'done' ? 'done' : d.draftStatus === 'pending' ? 'pending' : 'fallback';
    if (d.draftMatch !== undefined) { d.match = d.draftMatch; d.sees = d.draftMissed; d.roast = d.draftTip; d.judgeStatus = 'done'; }
    else if (d.draftStatus !== 'pending') { d.judgeStatus = 'fallback'; d.match = -1; }
    (d as any).finalFromDraft = true;
  }

  /** An image for a draft or final prompt came back (or failed). Final images then go to the judge. */
  applyGen(round: number, playerId: string, gameId: string, pass: 'draft' | 'final', res: { status: 'done' | 'fallback'; url?: string }) {
    if (gameId !== this.s.gameId) return;
    const r = this.s.rounds[round - 1]; const d = r?.drawings.find((x) => x.playerId === playerId); if (!r || !d) return;
    const target = targetById(r.targetId || '');
    if (pass === 'draft') {
      if (d.draftStatus !== 'pending') return;
      d.draftStatus = res.status; d.draftUrl = res.url;
      if ((d as any).finalFromDraft) { d.glowStatus = res.status; d.glowUrl = res.url; }
    } else {
      if (d.glowStatus !== 'pending') return;
      d.glowStatus = res.status; d.glowUrl = res.url;
      if (res.status === 'fallback') { d.judgeStatus = 'fallback'; d.match = -1; d.roast = 'The image model couldn’t draw that prompt.'; }
    }
    if (res.status === 'done' && res.url && target) this.effects.push({ t: 'compare', round, playerId, gameId, pass, attemptUrl: res.url, targetPath: target.image, styleRound: r.modifier === 'style' });
    this.checkEarlyEnd();
  }

  /** The judge compared an image to the target. */
  applyCompare(round: number, playerId: string, gameId: string, pass: 'draft' | 'final', res: { status: 'done' | 'fallback'; breakdown?: Breakdown; missed?: string; tip?: string; styleRound?: boolean }) {
    if (gameId !== this.s.gameId) return;
    const d = this.s.rounds[round - 1]?.drawings.find((x) => x.playerId === playerId); if (!d) return;
    const match = res.status === 'done' && res.breakdown ? matchOf(res.breakdown, !!res.styleRound) : undefined;
    // In a taboo round the judge's feedback must not hand players the banned words.
    const r = this.s.rounds[round - 1];
    const banned = r?.modifier === 'taboo' ? targetById(r.targetId || '')?.taboo || [] : [];
    const scrub = (t?: string) => banned.reduce((x, w) => x?.replace(new RegExp(`\\b${w}(s|es)?\\b`, 'gi'), '…'), t);
    res = { ...res, missed: scrub(res.missed), tip: scrub(res.tip) };
    if (pass === 'draft') {
      d.draftMatch = match; d.draftMissed = res.missed; d.draftTip = res.tip;
      if ((d as any).finalFromDraft) pass = 'final';
    }
    if (pass === 'final' && d.judgeStatus === 'pending') {
      if (match === undefined) { d.judgeStatus = 'fallback'; d.match = -1; d.roast = JUDGE_FOG; }
      else { d.judgeStatus = 'done'; d.match = match; d.breakdown = res.breakdown; d.sees = res.missed; d.roast = res.tip; }
    }
  }

  vote(voterId: string, targetId: string) {
    const r = this.currentRound(); const p = this.seat(voterId)?.player;
    if (!r || !p || this.s.phase !== 'VOTE' || (!!this.s.phaseEndsAt && this.now >= this.s.phaseEndsAt) || p.hasVoted || voterId === targetId) return;
    if (!r.participantIds.includes(voterId) || !r.participantIds.includes(targetId)) return;
    if (r.revote && !r.revote.includes(targetId)) return;
    r.votes[voterId] = targetId; p.hasVoted = true;
    this.touch(); this.checkEarlyEnd();
  }

  stealPick(playerId: string, option: string) {
    const r = this.currentRound();
    if (!r || this.s.phase !== 'STEAL' || (!!this.s.phaseEndsAt && this.now >= this.s.phaseEndsAt) || playerId !== r.imposterId || r.stealPick !== null) return;
    if (!r.stealOptions.includes(option)) return;
    r.stealPick = option; r.stealCorrect = option === r.realPrompt;
    this.touch(); this.checkEarlyEnd();
  }

  private pushChat(playerId: string, text: string) {
    this.s.chat = [...this.s.chat, { id: uid(8), playerId, text }].slice(-50);
    this.touch();
  }

  sendChat(playerId: string, text: string) {
    if (!['DISCUSS', 'VOTE'].includes(this.s.phase) || !this.currentRound()?.participantIds.includes(playerId)) return;
    const clean = text.trim().slice(0, 240); if (!clean) return;
    this.pushChat(playerId, clean);
  }

  /** The AI judge's discussion hint, posted as a chat message from Sketchy. */
  addHint(round: number, gameId: string, text: string) {
    if (gameId !== this.s.gameId || round !== this.s.round || !['DISCUSS', 'VOTE'].includes(this.s.phase)) return;
    this.pushChat(SKETCHY_ID, text.slice(0, 160));
  }

  readyVerdict(playerId: string) {
    if (this.s.phase !== 'VERDICT' || !this.currentRound()?.participantIds.includes(playerId)) return;
    if (!this.s.verdictReady.includes(playerId)) this.s.verdictReady.push(playerId);
    const humans = this.activePlayers.filter((p) => p.connected && !p.isBot);
    if (humans.length && humans.every((p) => this.s.verdictReady.includes(p.id))) this.advance();
  }

  // ---------- output ----------
  private revealImposter(round: Round) { return round.index < this.s.round || ['UNMASK', 'STEAL', 'VERDICT', 'SCORES', 'FINAL'].includes(this.s.phase); }
  private revealJudge(round: Round) { return round.index < this.s.round || ['VERDICT', 'SCORES', 'FINAL'].includes(this.s.phase); }
  /** Strokes (and redraws) stay hidden while people are still drawing. */
  showArt(roundIndex: number) { return roundIndex < this.s.round || !['PROMPT', 'DRAW', 'DRAFT', 'REFINE'].includes(this.s.phase); }
  /** Prompt mode: everyone's draft images are shared once refining starts (that's the mechanic). */
  private showDrafts(roundIndex: number) { return roundIndex < this.s.round || !['PROMPT', 'DRAFT'].includes(this.s.phase); }

  private publicRound(round: Round, viewerId: string | null = null): Round {
    const imp = this.revealImposter(round);
    const jud = this.revealJudge(round);
    const answer = jud || (this.s.phase === 'STEAL' && round.stealPick !== null);
    const art = this.showArt(round.index);
    const drawings = !jud ? this.s.frozen[String(round.index)] || round.drawings : round.drawings;
    // Explicit allowlist: adding private fields to Round cannot silently publish them.
    return {
      index: round.index, theme: round.theme,
      promptPairId: answer ? round.promptPairId : 0,
      realPrompt: answer ? round.realPrompt : '',
      decoyPrompt: answer ? round.decoyPrompt : '',
      imposterId: imp ? round.imposterId : '',
      participantIds: [...round.participantIds],
      revealedId: imp ? round.revealedId : null, caught: imp ? round.caught : null,
      escapeReason: imp ? round.escapeReason : null, fled: imp && round.fled, revote: round.revote ? [...round.revote] : undefined,
      mode: round.mode, modifier: round.modifier, targetId: imp ? round.targetId : undefined,
      targetUrl: imp ? round.targetUrl : undefined, targetPrompt: jud ? round.targetPrompt : undefined,
      stealOptions: imp ? [...round.stealOptions] : [],
      stealPick: answer ? round.stealPick : null, stealCorrect: answer ? round.stealCorrect : null,
      awards: jud ? round.awards.map((a) => ({ ...a })) : [],
      votes: imp ? { ...round.votes } : Object.fromEntries(Object.keys(round.votes).map((k) => [k, ''])),
      drawings: drawings.map((d) => ({
        playerId: d.playerId, strokes: [],
        glowUrl: art ? d.glowUrl : undefined,
        glowStatus: d.glowStatus, glowMock: d.glowMock, golden: d.golden, blank: d.blank,
        judgeStatus: jud ? d.judgeStatus : 'pending',
        match: jud ? d.match : undefined, sees: jud ? d.sees : undefined, roast: jud ? d.roast : undefined,
        breakdown: jud ? d.breakdown : undefined,
        // Prompts stay secret until the results; draft images are shared from the refine step; your own draft score is yours alone.
        draftPrompt: jud || d.playerId === viewerId ? d.draftPrompt : undefined, finalPrompt: jud || d.playerId === viewerId ? d.finalPrompt : undefined, finalIn: d.finalPrompt !== undefined,
        draftUrl: this.showDrafts(round.index) ? d.draftUrl : undefined, draftStatus: d.draftStatus,
        draftMatch: jud || d.playerId === viewerId ? d.draftMatch : undefined,
        draftMissed: jud || d.playerId === viewerId ? d.draftMissed : undefined,
        draftTip: jud || d.playerId === viewerId ? d.draftTip : undefined,
      })),
    };
  }

  build(seat: Seat | null, canHostScreen: boolean) {
    const s = this.s;
    const room: PublicRoom & { toasts: Toast[] } = {
      gameId: s.gameId, chat: s.chat, verdictReady: [...s.verdictReady],
      code: s.code, hostId: s.hostId, isDemo: s.isDemo, round: s.round, totalRounds: s.totalRounds,
      phase: s.phase, phaseEndsAt: s.phaseEndsAt, phaseStartedAt: s.phaseStartedAt,
      players: this.players, rounds: s.rounds.map((r) => this.publicRound(r, seat?.player.id || null)), mode: this.mode,
      aiImageCount: s.aiImageCount, finalAwards: s.finalAwards, aiMode: this.aiMode, toasts: s.toasts,
    };
    let me: MeView | null = null;
    if (seat) {
      const r = this.currentRound();
      const isImp = !!r && r.imposterId === seat.player.id && r.participantIds.includes(seat.player.id);
      const inRound = !!r && r.participantIds.includes(seat.player.id) && s.phase !== 'SCORES' && s.phase !== 'FINAL';
      me = {
        playerId: seat.player.id,
        prompt: inRound && r ? (isImp ? r.decoyPrompt : r.realPrompt) : null,
        isImposter: inRound && isImp, isHost: seat.player.id === s.hostId, sessionToken: seat.token,
      };
      if (r?.mode === 'prompt' && inRound) {
        const t = targetById(r.targetId || '');
        if (t) { me.targetUrl = isImp ? t.masked : t.image; me.prompt = null; if (r.modifier === 'taboo') me.taboo = t.taboo; }
      }
    }
    return { room, me, canHost: canHostScreen || !!me?.isHost };
  }
}
