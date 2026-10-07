/**
 * The two AI jobs from the PRD: the glow-up (image edit) and the judge (Match %).
 * Both have hard timeouts and designed fallbacks so a round never waits on the AI.
 * Keys live here, on the server, only.
 */
import { sha1 } from './util';

export type AiMode = 'openai' | 'mock' | 'off';

const KEY = process.env.OPENAI_API_KEY || '';
export const AI_MODE: AiMode = ((process.env.AI_MODE as AiMode) || (KEY ? 'openai' : 'mock'));
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-1-mini';
const IMAGE_QUALITY = process.env.OPENAI_IMAGE_QUALITY || 'low';
const JUDGE_MODEL = process.env.OPENAI_JUDGE_MODEL || 'gpt-4.1-mini';
const FORCE_FAIL = new Set((process.env.AI_FORCE_FAIL || '').split(',').map((s) => s.trim()).filter(Boolean));

export const GLOW_TIMEOUT_MS = 25_000;
export const JUDGE_TIMEOUT_MS = 15_000;

/** Same style instruction for everyone. The player's prompt is NEVER sent. */
const STYLE_INSTRUCTION =
  'Turn this sketch into a vibrant, playful sticker-style illustration. Keep the exact subject, pose and composition. Add no text and no new objects.';

export interface GlowResult { status: 'done' | 'fallback'; glowUrl?: string; mock?: boolean; reason?: string }
export interface JudgeResult { status: 'done' | 'fallback'; match?: number; sees?: string; roast?: string; reason?: string }

const runtimeForce = new Map<string, Set<string>>(); // roomCode -> set of forced failures (dev testing)
export function setForcedFailures(code: string, kinds: string[]) { runtimeForce.set(code, new Set(kinds)); }
function forced(code: string | undefined, kind: string) {
  return FORCE_FAIL.has(kind) || (code ? runtimeForce.get(code)?.has(kind) : false) || false;
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [head, b64] = dataUrl.split(',');
  const mime = /data:([^;]+)/.exec(head)?.[1] || 'image/png';
  return new Blob([Buffer.from(b64, 'base64')], { type: mime });
}

async function withTimeout<T>(p: (signal: AbortSignal) => Promise<T>, ms: number): Promise<T> {
  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), ms);
  try { return await p(ctl.signal); } finally { clearTimeout(t); }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Glow-up: sketch in, sticker art out. Input is the sketch only. */
export async function glowUp(pngDataUrl: string, roomCode?: string): Promise<GlowResult> {
  if (AI_MODE === 'off' || forced(roomCode, 'glow')) return { status: 'fallback', reason: 'disabled' };
  if (forced(roomCode, 'safety')) return { status: 'fallback', reason: 'safety' };
  if (AI_MODE === 'mock') {
    await sleep(1500 + Math.random() * 3500);
    return { status: 'done', glowUrl: pngDataUrl, mock: true };
  }
  try {
    return await withTimeout(async (signal) => {
      const form = new FormData();
      form.append('model', IMAGE_MODEL);
      form.append('image', dataUrlToBlob(pngDataUrl), 'sketch.png');
      form.append('prompt', STYLE_INSTRUCTION);
      form.append('size', '1024x1024');
      form.append('quality', IMAGE_QUALITY);
      form.append('n', '1');
      const res = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST', headers: { Authorization: `Bearer ${KEY}` }, body: form, signal,
      });
      if (!res.ok) {
        const text = await res.text();
        // Safety refusal or any API error: silent fallback.
        return { status: 'fallback', reason: `http ${res.status}: ${text.slice(0, 200)}` };
      }
      const json: any = await res.json();
      const b64 = json?.data?.[0]?.b64_json;
      if (!b64) return { status: 'fallback', reason: 'no image in response' };
      return { status: 'done', glowUrl: `data:image/png;base64,${b64}` };
    }, GLOW_TIMEOUT_MS);
  } catch (e: any) {
    return { status: 'fallback', reason: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) };
  }
}

const judgeCache = new Map<string, JudgeResult>();

/** Judge: raw sketch + real prompt -> strict JSON {match, sees, roast}. Cached per drawing. */
export async function judge(pngDataUrl: string, realPrompt: string, blank: boolean, roomCode?: string): Promise<JudgeResult> {
  if (blank) return { status: 'done', match: 0, sees: 'a blank canvas', roast: 'Bold choice.' };
  const key = sha1(pngDataUrl + '|' + realPrompt);
  const cached = judgeCache.get(key);
  if (cached) return cached;

  let result: JudgeResult;
  if (AI_MODE === 'off' || forced(roomCode, 'judge')) {
    result = { status: 'fallback', reason: 'disabled' };
  } else if (AI_MODE === 'mock') {
    await sleep(800 + Math.random() * 1500);
    // Deterministic pseudo-score from the image hash so the same drawing always scores the same.
    const n = parseInt(key.slice(0, 6), 16) % 61 + 30;
    const sees = ['a brave attempt', 'something with legs', 'a very confident blob', 'the general idea', 'abstract genius'];
    const roast = ['My toaster draws better, but I like it.', 'Picasso would nod. Slowly.', 'The vibes are there. Mostly.', 'I squinted and it worked.', 'Bold lines, bolder choices.'];
    result = { status: 'done', match: n, sees: sees[n % sees.length], roast: roast[n % roast.length] };
  } else {
    try {
      result = await withTimeout(async (signal) => {
        const body = {
          model: JUDGE_MODEL,
          temperature: 0.4,
          response_format: {
            type: 'json_schema',
            json_schema: {
              name: 'judge', strict: true,
              schema: {
                type: 'object', additionalProperties: false,
                properties: {
                  match: { type: 'integer', minimum: 0, maximum: 100 },
                  sees: { type: 'string' },
                  roast: { type: 'string' },
                },
                required: ['match', 'sees', 'roast'],
              },
            },
          },
          messages: [
            { role: 'system', content: 'You are the judge of a drawing party game. Score how well a rough sketch matches a prompt. Output strict JSON: match (0-100), sees (what the drawing shows, under 8 words), roast (one playful line, under 12 words, never mean about the person).' },
            { role: 'user', content: [
              { type: 'text', text: `The prompt was: "${realPrompt}". Score this sketch.` },
              { type: 'image_url', image_url: { url: pngDataUrl, detail: 'low' } },
            ] },
          ],
        };
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST', headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body), signal,
        });
        if (!res.ok) return { status: 'fallback', reason: `http ${res.status}` } as JudgeResult;
        const json: any = await res.json();
        const parsed = JSON.parse(json.choices[0].message.content);
        const match = Math.max(0, Math.min(100, Math.round(Number(parsed.match))));
        if (Number.isNaN(match)) return { status: 'fallback', reason: 'bad json' } as JudgeResult;
        return { status: 'done', match, sees: String(parsed.sees).slice(0, 60), roast: String(parsed.roast).slice(0, 90) } as JudgeResult;
      }, JUDGE_TIMEOUT_MS);
    } catch (e: any) {
      result = { status: 'fallback', reason: e?.name === 'AbortError' ? 'timeout' : String(e?.message || e) };
    }
  }
  if (result.status === 'done') judgeCache.set(key, result);
  return result;
}
