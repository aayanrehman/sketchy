import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import type { Drawing, Modifier } from '@shared/types';
import { WORD_LIMITS } from '@shared/types';
import { Button, DrawingTile, Timer } from '@/design/components';
import { Rise } from '@/shell/PhaseStage';
import { childVariants } from '@/design/motion';
import { useFitGrid } from '@/design/useFitGrid';
import { useSfx } from '@/sound/useSfx';
import { promptProblem } from '../../../convex/targets';
import { send, type MomentProps } from './common';
import './prompt.css';

export const MODIFIER_INFO: Record<Modifier, { title: string; text: string }> = {
  none: { title: 'Warm-up round', text: 'No extra rules. Get the subject, style, colors and layout right.' },
  taboo: { title: 'Taboo round', text: 'The obvious words are banned. Describe things another way.' },
  style: { title: 'Style round', text: 'Art style and colors count double. Name the medium and the lighting.' },
};

function ModifierBadge({ modifier, taboo }: { modifier?: Modifier; taboo?: string[] }) {
  const info = MODIFIER_INFO[modifier || 'none'];
  return (
    <div className={`modifier modifier--${modifier || 'none'}`}>
      <b>{info.title}</b> <span>{info.text}</span>
      {!!taboo?.length && <div className="modifier__taboo" aria-label="Banned words">{taboo.map((w) => <span key={w}>{w}</span>)}</div>}
    </div>
  );
}

/** The target you're recreating. The imposter's copy has the key detail hidden. */
function TargetCard({ url, imposter, compact }: { url?: string; imposter: boolean; compact?: boolean }) {
  return (
    <figure className={`target ${compact ? 'target--compact' : ''} ${imposter ? 'target--imp' : ''}`}>
      <div className="target__frame">
        {url ? <img src={url} alt="The target image" /> : <div className="target__none">No target this round</div>}
        {imposter && <span className="target__erased" aria-hidden>ERASED</span>}
      </div>
      <figcaption>{imposter ? 'Something in this picture has been erased. Everyone else can see it.' : 'Your target'}</figcaption>
    </figure>
  );
}

/** PROMPT phase in prompt mode: study the target. */
export function StudyPhone({ view }: MomentProps) {
  const me = view.me!; const r = view.round!;
  return (
    <div className="phase study">
      <Rise className="study__head">
        <h2 className="display-sm">{me.isImposter ? 'You’re the imposter' : 'Study your target'}</h2>
        <p className="gallery-head__sub">{me.isImposter ? 'Part of your image is blurred out. Everyone else can see it. Guess what’s there and blend in.' : 'Soon you’ll write a prompt to recreate this image as closely as you can.'}</p>
      </Rise>
      <div className="study__body">
        <Rise><TargetCard url={me.targetUrl} imposter={me.isImposter} /></Rise>
        <Rise><ModifierBadge modifier={r.modifier} taboo={me.taboo} /></Rise>
      </div>
    </div>
  );
}

/** DRAFT and REFINE: write a prompt; in REFINE, everyone's draft images are on show and you get your draft's score. */
export function WritePhone({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const sfx = useSfx();
  const room = view.room!; const me = view.me!; const r = view.round!;
  const pass = room.phase === 'DRAFT' ? 'draft' : 'final';
  const mine = r.drawings.find((d) => d.playerId === me.playerId);
  const p = view.byId.get(me.playerId);
  const locked = pass === 'draft' ? !!p?.hasSubmitted : !!mine?.finalIn;
  const [text, setText] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setText(pass === 'final' ? mine?.draftPrompt || '' : ''); setErr(null); /* eslint-disable-next-line */ }, [pass]);
  const difficulty = room.settings?.difficulty || 'normal';
  const limits = WORD_LIMITS[difficulty];
  const max = limits[pass];
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  const problem = text.trim() ? promptProblem(text, pass, me.taboo || null, difficulty) : null;
  const submit = async (value = text) => {
    if (locked || busy || !value.trim() || promptProblem(value, pass, me.taboo || null, difficulty)) return;
    setBusy(true); setErr(null);
    const res = await send().emit(pass === 'draft' ? 'prompt:draft' : 'prompt:final', { text: value });
    setBusy(false);
    if (!res.ok) setErr(res.error || 'Couldn’t send that. Try again.'); else sfx.play('submit');
  };
  // Time's nearly up and you haven't locked in: lock in what you've typed (minus banned words) so your turn isn't lost.
  const latest = useRef(text); latest.current = text;
  useEffect(() => {
    if (locked || !room.phaseEndsAt) return;
    const ms = room.phaseEndsAt - (Date.now() + view.serverOffset) - 1200;
    const id = setTimeout(() => { const v = cleanForAutoLock(latest.current, me.taboo || []); if (v) submit(v); }, Math.max(0, ms));
    return () => clearTimeout(id);
    // eslint-disable-next-line
  }, [room.phaseEndsAt, locked, pass]);
  const others = r.drawings.filter((d) => d.playerId !== me.playerId);
  const draftWords = mine?.draftPrompt ? mine.draftPrompt.trim().split(/\s+/).length : 0;
  const chars = text.trim().length;
  return (
    <div className="phase write">
      <div className="write__grid">
        <div className="write__side">
          <TargetCard url={me.targetUrl} imposter={me.isImposter} compact />
          <ModifierBadge modifier={r.modifier} taboo={me.taboo} />
        </div>
        <div className="write__main">
          <PassSteps pass={pass} limits={limits} quick={(room.settings?.pace || 'quick') === 'quick'} />
          {pass === 'final' && mine && <DraftFeedback d={mine} />}
          <motion.form key={pass} className="writer" onSubmit={(e) => { e.preventDefault(); submit(); }}
            initial={{ opacity: 0, y: rm ? 0 : 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: rm ? 0.16 : 0.32 }}>
            <label htmlFor="prompt" className="writer__label">
              {pass === 'draft' ? 'Quick draft' : mine?.draftPrompt ? 'Expand your draft into the final prompt' : 'Final prompt'}
              <small>{pass === 'draft' ? `up to ${limits.draft} words · a first try; next you get up to ${limits.final}` : `up to ${limits.final} words · only your final image is scored`}</small>
            </label>
            {pass === 'final' && mine?.draftPrompt && (
              <p className="writer__from"><span>Your draft ({draftWords} word{draftWords === 1 ? '' : 's'})</span>“{mine.draftPrompt}” <em>· it’s pre-filled below, add up to {Math.max(0, limits.final - draftWords)} more words</em></p>
            )}
            <textarea id="prompt" className="field writer__input" rows={pass === 'draft' ? 2 : 3} value={text} disabled={locked}
              placeholder={pass === 'draft' ? 'e.g. frog drumming on a lily pad, watercolor' : 'Add the details, style, colors and lighting your draft missed'}
              onChange={(e) => { setText(capWords(e.target.value, max)); setErr(null); }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }} />
            <div className="writer__meta">
              <span className={words >= max ? 'is-bad' : ''}>
                {words}/{max} words{words >= max ? ' · limit reached' : pass === 'final' && draftWords ? ` · ${words - draftWords >= 0 ? '+' : ''}${words - draftWords} since your draft` : ''}
                {chars > 260 && <> · {chars}/320 characters</>}
              </span>
              {(err || problem) && <span className="writer__err" role="alert">{err || problem}</span>}
            </div>
            {locked
              ? <Button variant="lime" size="lg" block disabled>{pass === 'draft' ? `Draft locked ✓ next: expand it to ${limits.final} words` : 'Final locked ✓ waiting for the others'}</Button>
              : <Button type="submit" variant="secondary" size="lg" block disabled={!text.trim() || !!problem || busy}>{busy ? 'Sending…' : pass === 'draft' ? 'Lock in draft (step 1 of 2)' : 'Lock in final prompt (step 2 of 2)'}</Button>}
          </motion.form>
          {pass === 'final' && others.length > 0 && (
            <section className="drafts">
              <h3>Everyone’s drafts <small>(prompts stay secret until the end)</small></h3>
              <div className="drafts__row">
                {others.map((d) => (
                  <motion.div key={d.playerId} variants={childVariants(rm)} initial="initial" animate="enter" className="drafts__item">
                    <DraftImage d={d} />
                    <span>{view.byId.get(d.playerId)?.name}</span>
                  </motion.div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** The two writing passes, always visible so the 8-word draft and the 30-word final never blur together. */
function PassSteps({ pass, limits, quick }: { pass: 'draft' | 'final'; limits: { draft: number; final: number }; quick: boolean }) {
  return (
    <ol className="pass" aria-label="Writing steps">
      <li className={pass === 'draft' ? 'is-on' : 'is-done'}><b>1</b><span>Quick draft</span><small>{limits.draft} words · {quick ? 25 : 35} s</small></li>
      <li className="pass__arrow" aria-hidden>→</li>
      <li className={pass === 'final' ? 'is-on' : ''}><b>2</b><span>Final prompt</span><small>{limits.final} words · {quick ? 30 : 40} s · scored</small></li>
    </ol>
  );
}

function DraftImage({ d }: { d: Drawing }) {
  if (d.draftStatus === 'done' && d.draftUrl) return <img src={d.draftUrl} alt="" className="drafts__img" />;
  if (d.draftStatus === 'pending' || !d.draftStatus) return <div className="drafts__img drafts__img--pending"><i /></div>;
  return <div className="drafts__img drafts__img--none">{d.blank ? 'No draft' : 'Couldn’t draw'}</div>;
}

/** Your own draft image with its score, what it missed and one tip. This is the "iterate" lesson. */
function DraftFeedback({ d }: { d: Drawing }) {
  const scored = typeof d.draftMatch === 'number';
  return (
    <section className="feedback">
      <DraftImage d={d} />
      <div className="feedback__body">
        <h3>Your draft {scored && <b className="feedback__score">{d.draftMatch}/100</b>}</h3>
        <p className="feedback__why">Practice only. Fix what it missed in your final prompt below; improving earns a bonus.</p>
        {d.draftStatus === 'pending' ? <p>Generating your draft image…</p>
          : !scored ? <p>{d.draftStatus === 'done' ? 'Scoring it against the target…' : 'You missed the draft. No problem: your final prompt still counts in full.'}</p>
          : <>
              {d.draftMissed && <p><b>Missed:</b> {d.draftMissed}</p>}
              {d.draftTip && <p><b>Tip:</b> {d.draftTip}</p>}
            </>}
      </div>
    </section>
  );
}

/** TV screen during DRAFT / REFINE. It never shows the target: the imposter can see the TV too. */
export function WriteMain({ view }: MomentProps) {
  const room = view.room!; const r = view.round!;
  const parts = room.players.filter((p) => r.participantIds.includes(p.id));
  const done = room.phase === 'DRAFT' ? parts.filter((p) => p.hasSubmitted).length : r.drawings.filter((d) => d.finalIn).length;
  const grid = useFitGrid(r.drawings.length, { gap: 14, reserve: 40, max: 300 });
  return (
    <div className="phase" style={{ justifyItems: 'center' }}>
      <Rise className="gallery-head" style={{ width: '100%' }}>
        <div>
          <h2 className="display-md">{room.phase === 'DRAFT' ? 'Writing quick drafts' : 'Refining prompts'}</h2>
          <p className="gallery-head__sub">{done}/{parts.length} locked in · {MODIFIER_INFO[r.modifier || 'none'].title}</p>
        </div>
        <Timer endsAt={room.phaseEndsAt} serverOffset={view.serverOffset} />
      </Rise>
      {room.phase === 'REFINE' && (
        <div ref={grid.ref} style={grid.style}>
          {r.drawings.map((d) => (
            <figure key={d.playerId} className="drafts__item drafts__item--tv"><DraftImage d={d} /><span>{view.byId.get(d.playerId)?.name}’s draft</span></figure>
          ))}
        </div>
      )}
    </div>
  );
}

/** Tiny bars for the five judged areas. */
export function BreakdownBars({ b }: { b: NonNullable<Drawing['breakdown']> }) {
  const rows = useMemo(() => [['Subject', b.subject], ['Details', b.details], ['Style', b.style], ['Color', b.color], ['Layout', b.composition]] as const, [b]);
  return (
    <div className="bars">
      {rows.map(([k, n]) => <div key={k} className="bars__row"><span>{k}</span><i><em style={{ width: `${(n / 20) * 100}%` }} /></i><b>{n}</b></div>)}
    </div>
  );
}

/** Keep at most `max` words while typing (whitespace is kept so typing feels normal). */
function capWords(v: string, max: number) {
  const parts = v.split(/(\s+)/); let n = 0; let out = '';
  for (const part of parts) { if (!part.trim()) { if (n < max) out += part; continue; } if (++n > max) break; out += part; }
  return out;
}
/** For auto-lock at the buzzer: drop banned words so the prompt is accepted. */
function cleanForAutoLock(v: string, taboo: string[]) {
  let t = v;
  for (const w of taboo) t = t.replace(new RegExp(`\\b${w}(s|es)?\\b`, 'gi'), '');
  return t.replace(/\s+/g, ' ').trim();
}
