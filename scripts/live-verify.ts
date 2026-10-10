/**
 * Drives the LIVE site in a real browser and screenshots every step.
 * Usage: node --import tsx scripts/live-verify.ts [landing|daily|demo|mp|all]   (SITE=... to override)
 * Extra seats are scripted through the Convex client (VITE_CONVEX_URL from .env.local). Costs real AI jobs.
 */
import 'dotenv/config';
import { chromium, type Page, type BrowserContext } from '@playwright/test';
import { ConvexHttpClient } from 'convex/browser';
import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import { api } from '../convex/_generated/api';
import lib from '../convex/targets.json';

const SITE = process.env.SITE || 'https://sketchy-blue.vercel.app';
const url = process.env.VITE_CONVEX_URL; if (!url) throw new Error('Set VITE_CONVEX_URL');
const c = new ConvexHttpClient(url);
const out = 'artifacts/live'; await fs.mkdir(out, { recursive: true });
const PHONE = { width: 390, height: 844 }; const LAPTOP = { width: 1366, height: 820 };
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const log = (...a: unknown[]) => console.log(new Date().toISOString().slice(11, 19), ...a);
const notes: string[] = []; const note = (s: string) => { notes.push(s); log('✓', s); };
const targets = lib.targets as { id: string; prompt: string; taboo: string[]; image: string; masked: string }[];
const targetOf = (u?: string) => targets.find((t) => u && (u.endsWith(t.image) || u.endsWith(t.masked)));
/** A prompt for this target that respects the word limit and the taboo list. */
const promptFor = (u: string | undefined, max: number, taboo: string[] = []) => {
  const words = (targetOf(u)?.prompt || 'a cheerful cartoon animal outdoors, watercolor').split(/\s+/)
    .filter((w) => !taboo.some((t) => new RegExp(`^${t}(s|es)?[.,]?$`, 'i').test(w)));
  return words.slice(0, max).join(' ');
};

const browser = await chromium.launch({ headless: true });
const errors: string[] = [];
async function page(ctx: BrowserContext, viewport: { width: number; height: number }) {
  const p = await ctx.newPage(); await p.setViewportSize(viewport);
  p.on('pageerror', (e) => errors.push(e.message));
  p.on('console', (m) => { if (m.type() === 'error') log('console.error:', m.text().slice(0, 200)); });
  return p;
}
async function shot(p: Page, name: string) {
  await p.evaluate(() => document.fonts.ready).catch(() => {});
  await p.locator('#splash').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => {});
  await sleep(400);
  const v = p.viewportSize()!; const file = `${out}/${name}-${v.width}x${v.height}.png`;
  await p.screenshot({ path: file }); log('📸', file);
}
type View = Awaited<ReturnType<typeof state>>;
const state = (code: string, token?: string, hostToken?: string) => c.query(api.game.state, { code, token, hostToken });
async function waitPhase(code: string, token: string | undefined, phases: string | string[], ms = 90_000, hostToken?: string): Promise<NonNullable<View>> {
  const want = ([] as string[]).concat(phases); const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    const v = await state(code, token, hostToken);
    if (v?.room && want.includes(v.room.phase)) return v;
    await sleep(500);
  }
  const v = await state(code, token, hostToken);
  throw new Error(`timed out waiting for ${want.join('|')} (at ${v?.room?.phase})`);
}
const waitUntil = async <T,>(fn: () => Promise<T>, ok: (t: T) => boolean, ms = 60_000, label = 'condition') => {
  const t0 = Date.now(); let last: T;
  while (Date.now() - t0 < ms) { last = await fn(); if (ok(last)) return last; await sleep(500); }
  throw new Error(`timed out waiting for ${label}: ${JSON.stringify(last!)?.slice(0, 300)}`);
};
const mine = (v: NonNullable<View>) => v.room.rounds[v.room.round - 1]?.drawings.find((d) => d.playerId === v.me?.playerId);

// ---------------------------------------------------------------- a. landing
async function landing(ctx: BrowserContext) {
  for (const vp of [PHONE, LAPTOP]) {
    const p = await page(ctx, vp);
    await p.goto(SITE); await p.getByRole('button', { name: 'Host a game' }).waitFor();
    const icon = await p.locator('link[rel="icon"]').first().getAttribute('href');
    assert.equal(icon, '/favicon.ico');
    const res = await p.request.get(`${SITE}/favicon.ico`); assert.equal(res.status(), 200);
    const card = p.getByRole('button', { name: "Play today's target" });
    const blur = await card.locator('img').evaluate((el) => getComputedStyle(el).filter);
    assert.match(blur, /blur\(10px\)/, 'daily card blurred before playing');
    assert.equal(await card.locator('.daily__streak').count(), 0, 'no streak before playing');
    assert.match(await card.innerText(), /One picture, one prompt/);
    await shot(p, 'a-landing');
    await p.close();
  }
  note('Landing: favicon.ico linked and served; daily card blurred, no streak, before the first play');
}

// ---------------------------------------------------------------- shared solo driver
async function playSolo(p: Page, path: '/daily' | '/demo', tag: string, opts: { rounds: number; name?: string; url?: string }) {
  const key = path === '/daily' ? 'sketchy.daily' : 'sketchy.demo';
  await p.goto(opts.url || `${SITE}${path}`);
  await p.getByLabel('Your name', { exact: true }).fill(opts.name || 'Tester');
  await shot(p, `${tag}-entry`);
  await p.getByRole('button', { name: 'Start', exact: true }).click();
  const sess = await waitUntil(() => p.evaluate((k) => sessionStorage.getItem(k), key), (s) => !!s, 20_000, 'demo session');
  const { code, token } = JSON.parse(sess!);
  log('room', code);
  await waitPhase(code, token, 'HOW_TO');
  await shot(p, `${tag}-howto`);
  await p.getByRole('button', { name: 'Let’s play' }).click();
  const results: NonNullable<View>[] = [];
  for (let round = 1; round <= opts.rounds; round++) {
    let v = await waitPhase(code, token, 'PROMPT');
    await p.locator('.target__frame img').waitFor();
    await shot(p, `${tag}-r${round}-study`);
    const imp = !!v.me?.isImposter; const taboo = v.me?.taboo || [];
    if (imp) {
      assert.ok(await p.locator('.target__erased').isVisible(), 'ERASED stamp visible for the imposter');
      assert.equal(await p.locator('.target__erased').innerText(), 'ERASED');
      const dashed = await p.locator('.target--imp .target__frame').evaluate((el) => getComputedStyle(el, '::before').borderTopStyle);
      assert.equal(dashed, 'dashed', 'imposter target has a dashed frame');
      assert.match(await p.locator('.target figcaption').innerText(), /erased/i);
      note(`${tag} round ${round}: imposter view shows the ERASED stamp, dashed red frame and "erased" copy`);
    }
    v = await waitPhase(code, token, 'DRAFT');
    const limits = v.room.settings?.difficulty === 'hard' ? { draft: 6, final: 18 } : v.room.settings?.difficulty === 'easy' ? { draft: 10, final: 40 } : { draft: 8, final: 30 };
    const draft = promptFor(v.me?.targetUrl, Math.min(limits.draft, 6), taboo);
    await p.locator('#prompt').fill(draft);
    await shot(p, `${tag}-r${round}-draft`);
    await p.getByRole('button', { name: 'Lock in draft (step 1 of 2)' }).click();
    await waitUntil(() => state(code, token), (x) => !!x!.room.players.find((pl) => pl.id === x!.me!.playerId)?.hasSubmitted, 15_000, 'draft locked');
    await shot(p, `${tag}-r${round}-draft-locked`).catch(() => {});
    v = await waitPhase(code, token, 'REFINE');
    await p.locator('.pass li.is-on', { hasText: 'Final prompt' }).waitFor();
    assert.equal(await p.locator('#prompt').inputValue(), draft, 'draft pre-filled in Refine');
    await p.locator('#prompt').fill(`${draft} with soft lighting`);
    assert.match(await p.locator('.writer__meta').innerText(), /\+3 since your draft/);
    await waitUntil(() => state(code, token), (x) => typeof mine(x!)?.draftMatch === 'number' || mine(x!)?.draftStatus === 'fallback', 40_000, 'draft score').catch((e) => log('(draft score not in before refine ended)', e.message));
    await shot(p, `${tag}-r${round}-refine`);
    await p.locator('#prompt').fill(promptFor(v.me?.targetUrl, limits.final, taboo));
    await p.getByRole('button', { name: 'Lock in final prompt (step 2 of 2)' }).click();
    await waitUntil(() => state(code, token), (x) => mine(x!)?.finalPrompt !== undefined, 15_000, 'final locked');
    await waitPhase(code, token, 'GALLERY', 120_000); await sleep(4000); await shot(p, `${tag}-r${round}-reveal`);
    await waitPhase(code, token, 'DISCUSS'); await sleep(1500); await shot(p, `${tag}-r${round}-discuss`);
    v = await waitPhase(code, token, 'VOTE');
    const r = v.room.rounds[v.room.round - 1];
    const bots = v.room.players.filter((x) => x.isBot).map((x) => x.id);
    const pick = imp ? bots[0] : bots.find((b) => b !== r.imposterId) || bots[0];
    await p.locator(`[data-tile="${pick}"]`).click();
    await shot(p, `${tag}-r${round}-vote`);
    v = await waitPhase(code, token, ['UNMASK', 'STEAL', 'VERDICT'], 60_000);
    await sleep(2500); await shot(p, `${tag}-r${round}-unmask`);
    v = await waitPhase(code, token, ['STEAL', 'VERDICT'], 60_000);
    if (v.room.phase === 'STEAL') {
      await sleep(1000); await shot(p, `${tag}-r${round}-steal`);
      if (imp) await p.getByRole('button', { name: /^Option 1:/ }).click();
    }
    v = await waitPhase(code, token, 'VERDICT', 90_000);
    await p.getByRole('button', { name: 'See scores →' }).waitFor();
    await sleep(1200); await shot(p, `${tag}-r${round}-results`);
    await p.getByRole('button', { name: 'See scores →' }).click();
    const btn = await p.locator('.verdict__foot button').innerText().catch(() => '');
    log('after See scores:', btn);
    v = await waitPhase(code, token, ['SCORES', 'FINAL'], 60_000);
    const rr = v.room.rounds[round - 1];
    for (const d of rr.drawings) assert.notEqual(d.judgeStatus, 'pending', 'no score left pending after SCORES');
    results.push(v);
    if (v.room.phase === 'SCORES') { await sleep(1500); await shot(p, `${tag}-r${round}-scores`); }
    log(`round ${round} scores`, rr.drawings.map((d) => `${v.room.players.find((x) => x.id === d.playerId)?.name}:${d.draftMatch ?? '-'}→${d.match ?? '-'} ${d.glowStatus}/${d.judgeStatus}`).join(' '));
  }
  const v = await waitPhase(code, token, 'FINAL', 60_000);
  await p.getByRole('button', { name: 'Share your result' }).waitFor();
  const toasts = await waitUntil(() => p.locator('.toast').allInnerTexts(), () => true, 1000, 'toasts').catch(() => [] as string[]);
  await sleep(800); await shot(p, `${tag}-final`);
  return { code, token, v, results, toasts: [...toasts, ...(await p.locator('.toast').allInnerTexts())] };
}

// ---------------------------------------------------------------- b. daily
async function daily(ctx: BrowserContext) {
  const today = new Date().toISOString().slice(0, 10);
  // First play (phone)
  const p = await page(ctx, PHONE);
  const first = await playSolo(p, '/daily', 'b-daily1', { rounds: 1 });
  assert.equal(first.v.room.daily, today, 'room is today’s daily');
  const myMatch = Math.max(0, ...first.v.room.rounds.flatMap((r) => r.drawings.filter((d) => d.playerId === first.v.me!.playerId).map((d) => (typeof d.match === 'number' ? d.match : 0))));
  const streakToast = first.toasts.find((t) => /streak/i.test(t));
  assert.ok(streakToast, `streak toast shown (toasts: ${JSON.stringify(first.toasts)})`);
  note(`Daily first play: scored ${myMatch}/100, toast "${streakToast!.replace(/\n/g, ' ')}"`);
  const prog = JSON.parse(await p.evaluate(() => localStorage.getItem('sketchy.progress') || '{}'));
  assert.equal(prog.daily.played[today], myMatch); assert.equal(prog.daily.streak, 1);
  // Copy challenge
  await p.getByRole('button', { name: 'Share your result' }).click();
  await p.locator('.share__preview img').waitFor({ timeout: 30_000 });
  await shot(p, 'b-daily1-share');
  await p.getByRole('button', { name: 'Copy challenge' }).click();
  await p.getByText('Challenge copied').waitFor();
  const clip = await p.evaluate(() => navigator.clipboard.readText());
  assert.equal(clip, `I scored ${myMatch}/100 on today’s Sketchy target. Beat me: ${SITE}/daily`);
  note(`Copy challenge → "${clip}"`);
  await p.keyboard.press('Escape');
  // Landing now shows the score, unblurred, with a streak
  await p.getByRole('button', { name: 'Host a real game' }).click();
  const card = p.getByRole('button', { name: "Play today's target" }); await card.waitFor();
  assert.equal(await card.locator('img').evaluate((el) => getComputedStyle(el).filter), 'none');
  assert.match(await card.innerText(), new RegExp(`You scored ${myMatch}/100`));
  assert.equal(await card.locator('.daily__streak').innerText(), '🔥 1');
  await shot(p, 'b-daily-landing-after');
  note(`Landing after play: card unblurred, "You scored ${myMatch}/100", 🔥 1`);
  await p.close();
  // Second play the same day (laptop), same browser profile: practice, streak unchanged
  const p2 = await page(ctx, LAPTOP);
  await p2.goto(`${SITE}/daily`);
  assert.match(await p2.locator('.entry, main, body').first().innerText(), new RegExp(`You scored ${myMatch} today. Play again for practice.`));
  const second = await playSolo(p2, '/daily', 'b-daily2', { rounds: 1 });
  assert.ok(!second.toasts.some((t) => /streak/i.test(t)), `no streak toast on the practice play (toasts: ${JSON.stringify(second.toasts)})`);
  const prog2 = JSON.parse(await p2.evaluate(() => localStorage.getItem('sketchy.progress') || '{}'));
  assert.equal(prog2.daily.played[today], myMatch, 'first score kept'); assert.equal(prog2.daily.streak, 1, 'streak unchanged');
  note('Daily second play: entry says "practice", no streak toast, first score and streak unchanged');
  await p2.close();
}

// ---------------------------------------------------------------- c. demo
async function demo(ctx: BrowserContext) {
  const p = await page(ctx, LAPTOP);
  const res = await playSolo(p, '/demo', 'c-demo', { rounds: 2 });
  const r2 = res.v.room.rounds[1];
  assert.equal(r2.imposterId, res.v.me!.playerId, 'human is the imposter in round 2');
  for (const [i, r] of res.v.room.rounds.entries()) {
    const t = targets.find((x) => x.id === r.targetId)!;
    const recorded = ['frog-band', 'cat-dj'].includes(r.targetId!);
    for (const d of r.drawings.filter((d) => d.playerId !== res.v.me!.playerId)) {
      assert.equal(d.glowStatus, 'done', `bot final image present (round ${i + 1})`);
      assert.equal(d.draftStatus, 'done', `bot draft image present (round ${i + 1})`);
      assert.ok(typeof d.match === 'number' && d.match >= 0, 'bot scored');
      if (!recorded) assert.ok(d.glowUrl!.endsWith(t.image) || d.glowUrl!.endsWith(t.masked), `placeholder bot uses the target/masked image: ${d.glowUrl}`);
    }
    note(`Demo round ${i + 1}: target ${r.targetId} (${recorded ? 'recorded bots' : 'placeholder bots'}), resolved to scores`);
  }
  await p.close();
}

// ---------------------------------------------------------------- d/e/f. multiplayer lobby + prompt mode
async function mp(ctx: BrowserContext) {
  const tv = await page(ctx, LAPTOP);
  await tv.goto(`${SITE}/host`); await tv.waitForURL('**/host?code=*');
  const code = new URL(tv.url()).searchParams.get('code')!;
  const hostToken = (await tv.evaluate((c) => localStorage.getItem(`sketchy.host.${c}`), code))!;
  log('room', code);
  const ph = await page(ctx, PHONE); // phone 1 (will be made host)
  await ph.goto(`${SITE}/play?code=${code}`);
  await ph.getByLabel('Your name', { exact: true }).fill('Aayan'); await ph.getByRole('button', { name: 'Join game' }).click();
  await ph.getByText('Pace').waitFor();
  const ctx2 = await browser.newContext({ reducedMotion: 'reduce' }); const p2 = await page(ctx2, PHONE); // phone 2 (never host)
  await p2.goto(`${SITE}/play?code=${code}`);
  await p2.getByLabel('Your name', { exact: true }).fill('Nia'); await p2.getByRole('button', { name: 'Join game' }).click();
  await p2.getByText('Pace').waitFor();
  const bots: { name: string; token: string; id: string }[] = [];
  for (const name of ['Ben', 'Cy']) { const r = await c.mutation(api.game.join, { code, name }); if (!r.ok) throw new Error(r.error); bots.push({ name, token: r.token, id: r.playerId }); }
  const beat = setInterval(() => bots.forEach((b) => c.mutation(api.game.heartbeat, { code, token: b.token }).catch(() => {})), 5000);
  const act = (token: string | undefined, action: any, host = false) => c.mutation(api.game.act, { code, token, hostToken: host ? hostToken : undefined, action });
  try {
    await waitUntil(() => state(code, undefined, hostToken), (v) => v!.room.players.length === 4, 20_000, '4 players');
    await shot(tv, 'd-lobby-tv'); await shot(ph, 'd-lobby-phone'); await shot(p2, 'd-lobby-phone2');
    // Non-hosts see the choices but can't change them.
    for (const name of ['Quick', 'Classic', 'Easy', 'Normal', 'Hard']) assert.ok(await p2.getByRole('radio', { name }).isDisabled(), `${name} disabled for a non-host`);
    assert.ok(await ph.getByRole('radio', { name: 'Hard' }).isEnabled(), 'first player to join is the phone host');
    // TV host switches pace and difficulty.
    await tv.getByRole('radio', { name: 'Classic' }).click();
    await waitUntil(() => state(code, undefined, hostToken), (v) => v!.room.settings?.pace === 'classic' && v!.room.totalRounds === 3, 10_000, 'classic');
    await waitUntil(() => ph.getByRole('radio', { name: 'Classic' }).getAttribute('aria-checked'), (a) => a === 'true', 10_000, 'phone sees Classic');
    await tv.getByRole('radio', { name: 'Quick' }).click();
    await waitUntil(() => state(code, undefined, hostToken), (v) => v!.room.settings?.pace === 'quick' && v!.room.totalRounds === 2, 10_000, 'quick');
    await tv.getByRole('radio', { name: 'Easy' }).click();
    await waitUntil(() => state(code, undefined, hostToken), (v) => v!.room.settings?.difficulty === 'easy', 10_000, 'easy');
    // The phone host can change it too.
    await ph.getByRole('radio', { name: 'Hard' }).click();
    await waitUntil(() => state(code, undefined, hostToken), (v) => v!.room.settings?.difficulty === 'hard', 10_000, 'hard');
    assert.ok(await p2.getByRole('radio', { name: 'Hard' }).isDisabled(), 'other phone still can’t change settings');
    assert.equal(await p2.getByRole('radio', { name: 'Hard' }).getAttribute('aria-checked'), 'true');
    await shot(tv, 'd-lobby-tv-hard'); await shot(ph, 'd-lobby-phone-host'); await shot(p2, 'd-lobby-phone2-hard');
    note('Lobby: TV switched Classic (3 rounds) → Quick (2 rounds) and Easy; the phone host switched Hard; the other phone sees the choice but its radios are disabled');

    const phTok = (await ph.evaluate((c) => JSON.parse(localStorage.getItem('sketchy.tokens') || '{}')[c], code))!;
    const p2Tok = (await p2.evaluate((c) => JSON.parse(localStorage.getItem('sketchy.tokens') || '{}')[c], code))!;
    const seats = [{ name: 'Aayan', token: phTok, page: ph }, { name: 'Nia', token: p2Tok, page: p2 }];
    await tv.getByRole('button', { name: 'Start the show' }).click();
    await waitPhase(code, phTok, 'HOW_TO');
    for (const b of bots) await act(b.token, { t: 'howto' });
    for (const s of seats) await s.page.getByRole('button', { name: 'Let’s play' }).click();
    const idOf = async (token: string) => (await state(code, token))!.me!.playerId;
    const ids = { ph: await idOf(phTok), p2: await idOf(p2Tok) };
    for (let round = 1; round <= 2; round++) {
      let v = await waitPhase(code, phTok, ['PROMPT', 'DRAFT']);
      const r = v.room.rounds[round - 1];
      assert.ok(r.modifier && r.modifier !== 'none', `Hard: a rule every round (round ${round}: ${r.modifier})`);
      if (v.room.phase === 'PROMPT') { await ph.locator('.target__frame img').waitFor(); await shot(ph, `e-r${round}-study-phone`); await shot(tv, `e-r${round}-study-tv`); }
      v = await waitPhase(code, phTok, 'DRAFT');
      assert.equal(v.room.phaseEndsAt! - v.room.phaseStartedAt, 25_000, 'Quick draft is 25 s');
      assert.match((await ph.locator('.pass').textContent()) || '', /6 words · 25 s[\s\S]*18 words · 30 s · scored/, 'Hard + Quick strip copy');
      assert.match(await ph.locator('.writer__label').innerText(), /up to 6 words/, 'Hard draft limit shown');
      const views = await Promise.all(seats.map((s) => state(code, s.token)));
      const impSeat = seats.find((s, i) => views[i]!.me?.isImposter);
      if (impSeat) { await impSeat.page.locator('.target__erased').waitFor(); assert.match(await impSeat.page.locator('.target figcaption').innerText(), /erased/i); await shot(impSeat.page, `e-r${round}-imposter-phone`); note(`Round ${round}: ${impSeat.name} is the imposter; phone shows the ERASED stamp and copy`); }
      for (const b of bots) { const bv = (await state(code, b.token))!; const res = await act(b.token, { t: 'draft', text: promptFor(bv.me?.targetUrl, 6, bv.me?.taboo || []) }); assert.ok(res.ok, `bot draft: ${res.error}`); }
      // Round 1: both phones draft. Round 2: Aayan misses the draft on purpose (the timer runs out).
      for (const [i, s] of seats.entries()) {
        if (round === 2 && s.name === 'Aayan') continue;
        const d = promptFor(views[i]!.me?.targetUrl, 6, views[i]!.me?.taboo || []);
        await s.page.locator('#prompt').fill(d);
        if (s.name === 'Aayan') await shot(ph, `e-r${round}-draft-phone`);
        await s.page.getByRole('button', { name: 'Lock in draft (step 1 of 2)' }).click();
        await waitUntil(() => state(code, s.token), (x) => !!x!.room.players.find((p) => p.id === x!.me!.playerId)?.hasSubmitted || x!.room.phase !== 'DRAFT', 15_000, `${s.name} draft locked`);
        if (s.name === 'Aayan') await shot(ph, `e-r${round}-draft-locked-phone`).catch(() => {});
      }
      if (round === 2) { await shot(ph, 'e-r2-draft-missed-waiting'); }
      v = await waitPhase(code, phTok, 'REFINE', 60_000);
      assert.equal(v.room.phaseEndsAt! - v.room.phaseStartedAt, 30_000, 'Quick refine is 30 s');
      const lateFinals = round === 2; // lock finals near the buzzer so the judge may still be scoring at the results screen
      for (const [i, s] of seats.entries()) {
        const sv = (await state(code, s.token))!; const m = mine(sv)!;
        await s.page.locator('.pass li.is-on', { hasText: 'Final prompt' }).waitFor();
        if (round === 2 && s.name === 'Aayan') {
          assert.equal(m.draftPrompt, undefined, 'no draft recorded'); assert.equal(m.draftStatus, 'fallback');
          assert.ok(await ph.locator('#prompt').isEnabled(), 'final prompt still writable after a missed draft');
          assert.match(await ph.locator('.feedback').innerText(), /You missed the draft/);
          await shot(ph, 'e-r2-refine-after-missed-draft');
        } else {
          assert.equal(await s.page.locator('#prompt').inputValue(), m.draftPrompt, 'draft pre-filled');
          assert.match(await s.page.locator('.writer__from').innerText(), new RegExp(`Your draft \\(${m.draftPrompt!.split(' ').length} words?\\)`, 'i'));
          await s.page.locator('#prompt').fill(`${m.draftPrompt} in warm light`);
          assert.match(await s.page.locator('.writer__meta').innerText(), /\+3 since your draft/);
        }
        if (s.name === 'Aayan' && round === 1) { await waitUntil(() => state(code, s.token), (x) => typeof mine(x!)?.draftMatch === 'number' || mine(x!)?.draftStatus === 'fallback', 25_000, 'draft score').catch(() => {}); await shot(ph, 'e-r1-refine-phone'); await shot(tv, 'e-r1-refine-tv'); }
        await s.page.locator('#prompt').fill(promptFor(sv.me?.targetUrl, 18, sv.me?.taboo || []));
        if (lateFinals) continue; // locked below, near the buzzer
        await s.page.getByRole('button', { name: 'Lock in final prompt (step 2 of 2)' }).click();
        await waitUntil(() => state(code, s.token), (x) => mine(x!)?.finalPrompt !== undefined || x!.room.phase !== 'REFINE', 15_000, `${s.name} final locked`);
        if (round === 2 && s.name === 'Aayan') { const fv = (await state(code, s.token))!; assert.ok(mine(fv)!.finalPrompt, 'final prompt accepted after a missed draft'); note('Round 2: Aayan skipped the draft (timer ran out) and still locked a final prompt'); }
      }
      if (lateFinals) { const left = (await state(code, phTok))!.room.phaseEndsAt! - Date.now(); if (left > 12_000) await sleep(left - 12_000); }
      for (const b of bots) { const bv = (await state(code, b.token))!; const res = await act(b.token, { t: 'final', text: promptFor(bv.me?.targetUrl, 18, bv.me?.taboo || []) }); if (!res.ok) log(`bot final (${b.name}) not accepted: ${res.error}; the draft stands as the final`); }
      if (lateFinals) {
        for (const s of seats) await s.page.getByRole('button', { name: 'Lock in final prompt (step 2 of 2)' }).click();
        const fv = await waitUntil(() => state(code, phTok), (x) => mine(x!)?.finalPrompt !== undefined, 15_000, 'Aayan final locked');
        assert.ok(mine(fv!)!.finalPrompt, 'final prompt accepted after a missed draft'); note('Round 2: Aayan skipped the draft (timer ran out) and still locked a final prompt');
      }
      await waitUntil(() => state(code, phTok), (x) => x!.room.phase !== 'REFINE' || x!.room.rounds[round - 1].drawings.every((d) => d.finalPrompt !== undefined), 60_000, 'finals in');
      await waitPhase(code, phTok, 'GALLERY', 120_000); await sleep(4000); await shot(ph, `e-r${round}-reveal-phone`); await shot(tv, `e-r${round}-reveal-tv`);
      v = await waitPhase(code, phTok, 'DISCUSS'); await sleep(1000); await shot(tv, `e-r${round}-discuss-tv`);
      await act(undefined, { t: 'skip' }, true);
      v = await waitPhase(code, phTok, 'VOTE');
      const rr = v.room.rounds[round - 1];
      const all = [...seats.map((s, i) => ({ token: s.token, id: i === 0 ? ids.ph : ids.p2, page: s.page })), ...bots.map((b) => ({ token: b.token, id: b.id, page: null as Page | null }))];
      const allViews = await Promise.all(all.map((x) => state(code, x.token)));
      const imp = all[allViews.findIndex((x) => x!.me?.isImposter)]!.id; // hidden from the public round until Unmask
      const innocents = all.filter((x) => x.id !== imp).map((x) => x.id);
      // Round 1: catch the imposter (steal happens). Round 2: everyone piles on an innocent (imposter escapes).
      for (const x of all) {
        const target = round === 1 ? (x.id === imp ? innocents[0] : imp) : (x.id === innocents[0] ? innocents[1] : innocents[0]);
        if (x.page) { await x.page.locator(`[data-tile="${target}"]`).click(); } else await act(x.token, { t: 'vote', targetId: target });
      }
      await shot(ph, `e-r${round}-vote-phone`);
      v = await waitPhase(code, phTok, ['UNMASK', 'STEAL', 'VERDICT'], 60_000); await sleep(2500); await shot(tv, `e-r${round}-unmask-tv`);
      v = await waitPhase(code, phTok, ['STEAL', 'VERDICT'], 60_000);
      if (v.room.phase === 'STEAL') {
        const impSeat2 = all.find((x) => x.id === imp)!;
        await sleep(800); await shot(impSeat2.page || tv, `e-r${round}-steal`);
        if (impSeat2.page) await impSeat2.page.getByRole('button', { name: /^Option 1:/ }).click(); else { const iv = (await state(code, impSeat2.token))!; const opts = iv.room.rounds[round - 1].stealOptions; assert.ok(opts.length === 4, 'imposter sees 4 steal options'); const res = await act(impSeat2.token, { t: 'steal', option: opts[0] }); assert.ok(res.ok, `steal: ${res.error}`); }
      }
      // f. Everyone taps "See scores" as early as possible. (Quick pace moves on fast: read the round back from state afterwards.)
      v = await waitPhase(code, phTok, ['VERDICT', 'SCORES', 'PROMPT', 'DRAFT', 'FINAL'], 90_000);
      let btn = '(verdict already over)'; let pendingAtVerdict = -1; let pendingAfter = -1;
      if (v.room.phase === 'VERDICT') {
        pendingAtVerdict = v.room.rounds[round - 1].drawings.filter((d) => d.judgeStatus === 'pending').length;
        await Promise.all([...bots.map((b) => act(b.token, { t: 'verdictReady' })), ph.getByRole('button', { name: 'See scores →' }).click(), p2.getByRole('button', { name: 'See scores →' }).click()]);
        btn = await ph.locator('.verdict__foot button').innerText().catch(() => '(gone)');
        const sv = (await state(code, phTok))!;
        pendingAfter = sv.room.rounds[round - 1].drawings.filter((d) => d.judgeStatus === 'pending').length;
        log(`VERDICT r${round}: pending at entry=${pendingAtVerdict}, after everyone ready: phase=${sv.room.phase}, pending=${pendingAfter}, button="${btn}"`);
        if (sv.room.phase === 'VERDICT' && pendingAfter > 0) {
          await shot(ph, `f-r${round}-waiting-for-judge`); await shot(tv, `f-r${round}-waiting-for-judge-tv`);
          assert.equal(btn, 'Waiting for the judge’s last score…');
          const settled = await waitUntil(() => state(code, phTok), (x) => x!.room.phase !== 'VERDICT', 40_000, 'verdict to settle');
          note(`Round ${round}: all four tapped "See scores" with ${pendingAfter} score(s) still pending; button read "${btn}", the phase waited, then moved on (${settled!.room.phase})`);
        } else note(`Round ${round}: every score had landed before "See scores" (pending at VERDICT entry: ${pendingAtVerdict}); the wait state could not be exercised live this round`);
        await shot(ph, `f-r${round}-results-phone`).catch(() => {}); await shot(tv, `f-r${round}-results-tv`).catch(() => {});
      } else log(`VERDICT r${round} was already over (phase ${v.room.phase})`);
      v = await waitPhase(code, phTok, ['SCORES', 'PROMPT', 'DRAFT', 'FINAL'], 60_000);
      const done = v.room.rounds[round - 1];
      for (const d of done.drawings) { assert.notEqual(d.judgeStatus, 'pending'); assert.ok(d.judgeStatus === 'done' ? typeof d.match === 'number' && d.match >= 0 : true, 'done scores are real'); }
      const awardTotal = done.awards.reduce((n, a) => n + a.points, 0);
      log(`round ${round} awards`, done.awards.map((a) => `${v.room.players.find((p) => p.id === a.playerId)?.name}+${a.points}(${a.reason})`).join(' '), '| total', awardTotal, '| scores', v.room.players.map((p) => `${p.name}:${p.score}`).join(' '));
      log(`round ${round} judge`, done.drawings.map((d) => `${v.room.players.find((p) => p.id === d.playerId)?.name}:${d.draftMatch ?? '-'}→${d.match ?? '-'} ${d.judgeStatus}`).join(' '));
      assert.ok(done.drawings.every((d) => d.judgeStatus === 'done'), `every final image was judged (no fallback) in round ${round}`);
      if (v.room.phase === 'SCORES') { await sleep(1200); await shot(tv, `f-r${round}-scores-tv`); await shot(ph, `f-r${round}-scores-phone`); }
    }
    const fv = await waitPhase(code, phTok, 'FINAL', 60_000);
    const sum = fv.room.rounds.flatMap((r) => r.awards).reduce((n, a) => n + a.points, 0);
    assert.equal(fv.room.players.reduce((n, p) => n + p.score, 0), sum, 'player totals equal the sum of awards');
    note(`Game total ${sum} points = sum of every award; no score dropped`);
    await sleep(1500); await shot(tv, 'f-final-tv'); await shot(ph, 'f-final-phone');
    // Keep this group as a crew: the TV host taps once; both phones (the seats with device ids) are in.
    await tv.getByRole('button', { name: 'Keep this group as a crew' }).click();
    await waitUntil(() => ph.evaluate(() => localStorage.getItem('sketchy.crew')), (c) => !!c, 15_000, 'phone saved the crew');
    const crewA = await ph.evaluate(() => localStorage.getItem('sketchy.crew')); const crewB = await p2.evaluate(() => localStorage.getItem('sketchy.crew'));
    assert.equal(crewA, crewB, 'both phones saved the same crew');
    await ph.goto(SITE); await ph.locator('.crew__board').waitFor();
    await waitUntil(() => ph.locator('.crew__board li').count(), (n) => n === 2, 15_000, 'crew board with both phones');
    await shot(ph, 'f-crew-from-room');
    note(`Party game → "Keep this group as a crew": both phones joined crew ${crewA}; the home page shows the board`);
  } finally { clearInterval(beat); await ctx2.close(); }
}

// ---------------------------------------------------------------- g. tiers, challenge links, duel, crew
async function social(ctx: BrowserContext) {
  const p = await page(ctx, PHONE);
  const first = await playSolo(p, '/daily', 'g-a-daily', { rounds: 1 });
  const myScore = Math.max(0, ...first.v.room.rounds.flatMap((r) => r.drawings.filter((d) => d.playerId === first.v.me!.playerId).map((d) => (typeof d.match === 'number' ? d.match : 0))));
  const tierToast = first.toasts.find((t) => /Gold|Silver|Bronze/.test(t));
  log('tier/streak toasts:', JSON.stringify(first.toasts));
  if (myScore >= 60) assert.ok(tierToast, 'tier toast for a Bronze+ score');
  assert.ok((await p.locator('.final-ranks .tier').count()) >= (myScore >= 60 ? 1 : 0), 'tier badge in the final ranks');
  await shot(p, 'g-a-final');
  // Challenge link (the attempt row lands a moment after the score).
  await p.getByRole('button', { name: 'Share your result' }).click();
  await p.locator('.share__preview img').waitFor({ timeout: 30_000 });
  const clip = await waitUntil(async () => { await p.getByRole('button', { name: 'Copy challenge' }).click(); await sleep(300); return p.evaluate(() => navigator.clipboard.readText()); }, (t) => t.includes('/daily?c='), 20_000, 'challenge link');
  const link = clip.match(/https?:\S+/)![0];
  assert.match(clip, new RegExp(`^I scored ${myScore}/100( \\((Gold|Silver|Bronze)\\))? on this Sketchy picture\\. Beat me: `));
  note(`Challenge copied: "${clip}"`);
  await p.keyboard.press('Escape');
  // Another device opens the link, sees the challenge, plays the same picture and gets the duel.
  const ctxB = await browser.newContext({ reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
  const pb = await page(ctxB, LAPTOP);
  await pb.goto(link);
  await pb.locator('.challenge').waitFor();
  assert.match(await pb.locator('.challenge').innerText(), new RegExp(`Tester scored ${myScore}/100`));
  assert.match(await pb.locator('h1').innerText(), /challenged/i);
  await shot(pb, 'g-b-challenge-entry');
  const second = await playSolo(pb, '/daily', 'g-b-duel', { rounds: 1, name: 'Rival', url: link });
  assert.equal(second.v.room.challenge?.score, myScore, 'room carries the challenge');
  assert.equal(second.v.room.rounds[0].targetId, first.v.room.rounds[0].targetId, 'same picture');
  await pb.locator('.duel').waitFor();
  await waitUntil(() => pb.locator('.duel img').count(), (n) => n >= 2, 15_000, 'both duel images');
  const duel = await pb.locator('.duel').innerText();
  log('duel:', duel.replace(/\n/g, ' | ').slice(0, 200));
  assert.match(duel, /You beat Tester!|A dead heat!|Tester holds the record\./);
  await shot(pb, 'g-b-duel');
  note(`Duel shown on the challenged device: "${duel.split('\n')[0]}"`);
  // Crew: A starts one from the landing, B joins through the invite link; both scores appear on the board.
  await p.goto(SITE); await p.getByRole('button', { name: 'Start a crew' }).click();
  await p.getByText('Crew started').waitFor();
  const invite = await p.evaluate(() => navigator.clipboard.readText());
  assert.match(invite, /\/\?crew=[A-Z0-9]{6}$/);
  await pb.goto(invite);
  await pb.getByText('You joined').waitFor({ timeout: 15_000 });
  await waitUntil(() => pb.locator('.crew__board li').count(), (n) => n === 2, 15_000, 'two crew members');
  const board = await pb.locator('.crew__board').innerText();
  assert.match(board, /Tester/); assert.match(board, /Rival \(you\)/);
  assert.match(board, new RegExp(String(myScore)));
  await shot(pb, 'g-b-crew-board'); await p.reload(); await p.locator('.crew__board').waitFor(); await shot(p, 'g-a-crew-board');
  note('Crew: started on device A, joined from the invite link on device B; the board lists both with today’s scores and weekly totals');
  await ctxB.close(); await p.close();
}

const which = process.argv[2] || 'all';
const ctx = await browser.newContext({ reducedMotion: 'reduce', permissions: ['clipboard-read', 'clipboard-write'] });
try {
  const flows: Record<string, (ctx: BrowserContext) => Promise<void>> = { landing, daily, demo, mp, social };
  for (const [name, fn] of Object.entries(flows)) {
    if (which !== 'all' && which !== name) continue;
    log(`=== ${name}`);
    await fn(ctx);
  }
  assert.deepEqual(errors, [], 'no page errors');
  console.log('\nPASS\n' + notes.map((n) => ' - ' + n).join('\n'));
} finally { await browser.close(); }
