import { motion, useReducedMotion } from 'framer-motion';
import { Button, DrawingTile, Mascot } from '@/design/components';
import { childVariants } from '@/design/motion';
import { send, type MomentProps } from './common';
import { BreakdownBars, MODIFIER_INFO } from './PromptMode';

/** Round results on one screen: who it was, both prompts, and every drawing with its votes and match score. */
export function VerdictMoment({ view }: MomentProps) {
  const rm = !!useReducedMotion();
  const r = view.round!; const me = view.me;
  const ready = !!me && view.room?.verdictReady?.includes(me.playerId);
  const imposter = view.byId.get(r.imposterId);
  const order = [...r.drawings].sort((a, b) => Number(b.playerId === r.imposterId) - Number(a.playerId === r.imposterId));
  const caughtLine = r.caught
    ? `Caught! ${imposter?.name} was the imposter${r.stealCorrect ? ', but stole the round by guessing the prompt' : ''}.`
    : `${imposter?.name} was the imposter and got away${r.escapeReason === 'tie' ? ' on a tied vote' : r.escapeReason === 'novotes' ? ' (no votes)' : ''}.`;
  const waiting = (view.room?.players || []).filter((p) => !p.isBot && r.participantIds.includes(p.id) && !view.room?.verdictReady?.includes(p.id)).length;
  if (r.mode === 'prompt') return <PromptVerdict view={view} ready={!!ready} waiting={waiting} caughtLine={caughtLine} />;
  return (
    <div className="verdict">
      <header className="verdict__head">
        <Mascot mood={r.caught ? 'judge' : 'imposter'} size={72} />
        <div>
          <h2 className="display-md">{caughtLine}</h2>
          <div className="verdict__prompts">
            <span className="verdict__prompt"><small>Everyone drew</small>{r.realPrompt}</span>
            <span className="verdict__prompt verdict__prompt--imp"><small>{imposter?.name} drew</small>{r.decoyPrompt}</span>
          </div>
        </div>
      </header>
      <div className="verdict__grid">
        {order.map((d) => {
          const p = view.byId.get(d.playerId);
          const votes = Object.values(r.votes).filter((id) => id === d.playerId).length;
          const isImp = d.playerId === r.imposterId;
          const scored = d.judgeStatus === 'done' && typeof d.match === 'number' && d.match >= 0;
          return (
            <motion.article key={d.playerId} className={`result ${isImp ? 'result--imp' : ''}`} variants={childVariants(rm)}>
              <DrawingTile drawing={d} player={p} size={240} hideName />
              <div className="result__who">
                <b>{p?.name}{d.playerId === me?.playerId ? ' (you)' : p?.isBot ? ' (bot)' : ''}</b>
                <span className={`result__role ${isImp ? 'result__role--imp' : ''}`}>{isImp ? 'Imposter' : 'Artist'}</span>
              </div>
              <div className="result__votes">{votes} vote{votes === 1 ? '' : 's'}</div>
              <div className="result__score" title="How closely the AI judge thinks this sketch matches the real prompt">
                <span>Match with “{r.realPrompt}”</span>
                <div className="result__bar"><i style={{ transform: `scaleX(${scored ? d.match! / 100 : 0})` }} /></div>
                <b>{scored ? `${d.match}/100` : '—'}</b>
              </div>
              {(d.sees || d.roast) && <p className="result__note">{d.sees && <>Looks like {d.sees}. </>}{d.roast}</p>}
            </motion.article>
          );
        })}
      </div>
      <footer className="verdict__foot">
        <p className="dim">The AI judge scores each <b>original sketch</b> (not the redraw) against the real prompt. Best artist match: +50. An imposter who matches as well as the typical artist: +100.{view.room?.players.some((p) => p.isBot) ? ' Bot drawings and scores are pre-made examples; yours were redrawn and scored live.' : ''}</p>
        {me && r.participantIds.includes(me.playerId)
          ? <Button size="lg" variant={ready ? 'ghost' : 'primary'} disabled={ready} onClick={() => send().emit('verdict:ready')}>{ready ? (waiting ? `Waiting for ${waiting} player${waiting === 1 ? '' : 's'}…` : 'Starting…') : 'See scores →'}</Button>
          : <p className="phase__sub">Players continue when they’re ready.</p>}
      </footer>
    </div>
  );
}

/** Prompt mode results: the target and the prompt behind it, then each player's prompts, image and score breakdown. */
function PromptVerdict({ view, ready, waiting, caughtLine }: MomentProps & { ready: boolean; waiting: number; caughtLine: string }) {
  const rm = !!useReducedMotion();
  const r = view.round!; const me = view.me;
  const order = [...r.drawings].sort((a, b) => (b.match ?? -1) - (a.match ?? -1));
  return (
    <div className="verdict">
      <header className="pverdict__head">
        {r.targetUrl && <img className="pverdict__target" src={r.targetUrl} alt="The target image" />}
        <div className="pverdict__copy">
          <h2 className="display-md">{caughtLine}</h2>
          <p className="pverdict__hidden">The imposter couldn’t see: <b>{r.realPrompt}</b></p>
          <div className="pverdict__prompt"><small>The prompt behind the target</small>“{r.targetPrompt}”</div>
          <p className="dim">{MODIFIER_INFO[r.modifier || 'none'].title}{r.modifier === 'style' ? ': style and color counted double.' : '.'} Compare your prompt with the original. That’s the fastest way to get better.</p>
        </div>
      </header>
      <div className="verdict__grid">
        {order.map((d) => {
          const p = view.byId.get(d.playerId);
          const isImp = d.playerId === r.imposterId;
          const votes = Object.values(r.votes).filter((id) => id === d.playerId).length;
          const scored = d.judgeStatus === 'done' && typeof d.match === 'number' && d.match >= 0;
          return (
            <motion.article key={d.playerId} className={`result ${isImp ? 'result--imp' : ''}`} variants={childVariants(rm)}>
              <DrawingTile drawing={d} player={p} size={240} hideName />
              <div className="result__who">
                <b>{p?.name}{d.playerId === me?.playerId ? ' (you)' : p?.isBot ? ' (bot)' : ''}</b>
                <span className={`result__role ${isImp ? 'result__role--imp' : ''}`}>{isImp ? 'Imposter' : 'Artist'}</span>
              </div>
              <div className="result__votes">{votes} vote{votes === 1 ? '' : 's'}{typeof d.draftMatch === 'number' && scored ? ` · draft ${d.draftMatch} → final ${d.match}` : ''}</div>
              {d.finalPrompt && <p className="result__prompt">“{d.finalPrompt}”</p>}
              {d.draftPrompt && d.draftPrompt !== d.finalPrompt && <p className="result__draft">Draft: “{d.draftPrompt}”</p>}
              <div className="result__score"><span>Match with the target</span><div className="result__bar"><i style={{ transform: `scaleX(${scored ? d.match! / 100 : 0})` }} /></div><b>{scored ? `${d.match}/100` : '—'}</b></div>
              {d.breakdown && <BreakdownBars b={d.breakdown} />}
              {(d.sees || d.roast) && <p className="result__note">{d.sees && <><b>Missed:</b> {d.sees}. </>}{d.roast && <><b>Tip:</b> {d.roast}</>}</p>}
            </motion.article>
          );
        })}
      </div>
      <footer className="verdict__foot">
        <p className="dim">An AI judge compares each final image with the target in five areas (0–20 each). Everyone earns half their match score; the closest artist gets +50.{view.room?.players.some((p) => p.isBot) ? ' Bot prompts and scores are pre-made examples; yours are live.' : ''}</p>
        {me && r.participantIds.includes(me.playerId)
          ? <Button size="lg" variant={ready ? 'ghost' : 'primary'} disabled={ready} onClick={() => send().emit('verdict:ready')}>{ready ? (waiting ? `Waiting for ${waiting} player${waiting === 1 ? '' : 's'}…` : 'Starting…') : 'See scores →'}</Button>
          : <p className="phase__sub">Players continue when they’re ready.</p>}
      </footer>
    </div>
  );
}
