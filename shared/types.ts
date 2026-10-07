// Shared types between server and client. The server is the source of truth.

export type Phase =
  | 'LOBBY' | 'HOW_TO' | 'PROMPT' | 'DRAW' | 'GALLERY' | 'DISCUSS'
  | 'VOTE' | 'UNMASK' | 'STEAL' | 'VERDICT' | 'SCORES' | 'FINAL';

export const PHASE_ORDER: Phase[] = [
  'LOBBY', 'HOW_TO', 'PROMPT', 'DRAW', 'GALLERY', 'DISCUSS',
  'VOTE', 'UNMASK', 'STEAL', 'VERDICT', 'SCORES', 'FINAL',
];

/** Fixed phase lengths from the PRD (ms). VERDICT is computed per round. */
export const PHASE_MS: Record<Exclude<Phase, 'LOBBY' | 'FINAL' | 'VERDICT'>, number> = {
  HOW_TO: 10_000,
  PROMPT: 5_000,
  DRAW: 50_000,
  GALLERY: 20_000,
  DISCUSS: 30_000,
  VOTE: 20_000,
  UNMASK: 9_000,
  STEAL: 10_000,
  SCORES: 10_000,
};
/** VERDICT: intro + one meter per drawing. */
export const VERDICT_BASE_MS = 4_000;
export const VERDICT_PER_DRAWING_MS = 3_200;

export const MIN_PLAYERS = 4;
export const MAX_PLAYERS = 8;
export const TOTAL_ROUNDS = 3;
export const GLOWUP_ROOM_CAP = 24;
export const GOLDEN_ODDS = 1 / 15;

export interface Point { x: number; y: number }
export interface Stroke { color: string; size: number; points: Point[] }

export type GlowStatus = 'pending' | 'done' | 'fallback';
export type JudgeStatus = 'pending' | 'done' | 'fallback';

export interface Drawing {
  playerId: string;
  strokes: Stroke[];
  pngUrl?: string;      // data URL; server only, never sent to clients
  glowUrl?: string;     // data URL of AI art (or sketch png in mock mode)
  glowStatus: GlowStatus;
  glowMock?: boolean;   // true when AI_MODE=mock produced this "glow"
  golden: boolean;
  match?: number;       // 0-100, undefined while pending, -1 means "??" fallback
  sees?: string;
  roast?: string;
  judgeStatus: JudgeStatus;
  blank: boolean;
}

export interface PromptPair {
  id: number;
  theme: string;
  real: string;
  decoy: string;
  stealDecoys: [string, string];
}

export interface Award { playerId: string; points: number; reason: AwardReason }
export type AwardReason =
  | 'caught_vote' | 'caught_vote_streak' | 'escape' | 'steal'
  | 'perfect_disguise' | 'judges_favorite' | 'imposter_fled';

export interface Round {
  index: number;
  promptPairId: number;
  theme: string;
  realPrompt: string;
  decoyPrompt: string;
  imposterId: string;
  participantIds: string[];
  drawings: Drawing[];
  votes: Record<string, string>;      // voterId -> targetId
  revealedId: string | null;          // most voted player, null on tie/no votes
  caught: boolean | null;             // null until UNMASK
  escapeReason: 'tie' | 'novotes' | 'innocent' | null;
  stealOptions: string[];
  stealPick: string | null;
  stealCorrect: boolean | null;
  fled: boolean;
  awards: Award[];
}

export interface Player {
  id: string;
  name: string;
  color: string;
  avatar: string;      // emoji glyph
  connected: boolean;
  isBot: boolean;
  spectator: boolean;
  score: number;
  streak: number;
  readyHowTo: boolean;
  hasSubmitted: boolean;
  hasVoted: boolean;
}

export interface FinalAward { title: string; playerId: string; detail: string }

/** What every client receives. Secrets are stripped per recipient on the server. */
export interface PublicRoom {
  code: string;
  hostId: string | null;
  isDemo: boolean;
  round: number;             // 1-based current round, 0 before start
  totalRounds: number;
  phase: Phase;
  phaseEndsAt: number | null;
  phaseStartedAt: number;
  players: Player[];
  rounds: Round[];           // current + past rounds, secrets stripped by phase
  aiImageCount: number;
  finalAwards: FinalAward[];
  aiMode: 'openai' | 'mock' | 'off';
}

export interface MeView {
  playerId: string;
  prompt: string | null;
  isImposter: boolean;
  isHost: boolean;
  sessionToken: string;
}

export interface StateMessage {
  room: PublicRoom;
  me: MeView | null;
  serverNow: number;
}

export type ToastKind = 'join' | 'leave' | 'host' | 'streak' | 'golden' | 'info' | 'fled';
export interface ToastMessage { id: string; kind: ToastKind; text: string; playerId?: string }

// Socket events
export interface ClientToServer {
  'screen:create': (cb: (res: { ok: true; code: string } | { ok: false; error: string }) => void) => void;
  'screen:watch': (p: { code: string }, cb: (res: { ok: boolean; error?: string }) => void) => void;
  'join': (p: { code: string; name: string; token?: string }, cb: (res: { ok: true; token: string; playerId: string } | { ok: false; error: string }) => void) => void;
  'demo:create': (p: { name: string }, cb: (res: { ok: true; code: string; token: string; playerId: string } | { ok: false; error: string }) => void) => void;
  'host:start': () => void;
  'host:skip': () => void;
  'host:playAgain': () => void;
  'howto:ready': () => void;
  'draw:submit': (p: { strokes: Stroke[]; png: string }) => void;
  'vote': (p: { targetId: string }) => void;
  'steal:pick': (p: { option: string }) => void;
  'leave': () => void;
}

export interface ServerToClient {
  'state': (s: StateMessage) => void;
  'toast': (t: ToastMessage) => void;
  'error': (e: { message: string }) => void;
}

export const LEVEL_TITLES = [
  'Doodler', 'Scribbler', 'Sketcher', 'Inker', 'Illustrator',
  'Art Fiend', 'Gallery Regular', 'Master Faker', 'Imposter Hunter', 'Sketch Lord',
];
export const XP_PER_LEVEL = 500;
