import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, Card, Modal, Mascot, Scenery } from '@/design/components';
import { load, level, levelTitle, levelProgress } from '@/progression/store';
import { childVariants, phaseVariants } from '@/design/motion';
import { unlockAudio } from '@/sound/sfx';
import { HowTo } from '@/shell/HowTo';

/** / landing: Host a game, Join a game, Try it solo. Shows your level and gallery. */
export function Landing() {
  const rm = !!useReducedMotion();
  const prog = load();
  const [gallery, setGallery] = useState(false);
  const [help, setHelp] = useState(false);
  return (
    <div className="landing landing--home">
      <Scenery density={3} />
      <motion.div className="landing__inner landing__home-grid" variants={phaseVariants(rm)} initial="initial" animate="enter">
        <div className="landing__scene">
        <span className="landing__eyebrow">A LITTLE ART. A LOT OF ACCUSATIONS.</span>
        <motion.div className="landing__hero" variants={childVariants(rm)}><Mascot mood="happy" size={132} float /></motion.div>
        <motion.h1 className="landing__logo gold-text" variants={childVariants(rm)}>SKETCHY</motion.h1>
        <motion.p className="landing__tag" variants={childVariants(rm)}>One of you is drawing something different.<br />Spot the imposter. Defend your doodle.</motion.p>
        <div className="landing__samples" aria-label="Three DJs. One suspicious chef.">{[0, 1, 3].map((i) => <div key={i} className={`landing__sample ${i === 3 ? 'landing__sample--sus' : ''}`}><img src={`/demo-art/cat-${i}.webp`} alt={i === 3 ? 'The imposter drew a chef' : 'An artist drew a cat DJ'} />{i === 3 && <span>IMPOSTER?</span>}</div>)}</div>
        </div>
        <div className="landing__menu">
        <p className="landing__menu-title">Who's looking sketchy?</p>
        <motion.div variants={childVariants(rm)}><Button size="lg" block onClick={() => { unlockAudio(); location.href = '/host'; }}>Host a game</Button></motion.div>
        <motion.div variants={childVariants(rm)}><Button variant="secondary" size="lg" block onClick={() => { unlockAudio(); location.href = '/play'; }}>Join a game</Button></motion.div>
        <motion.div variants={childVariants(rm)}><Button variant="lime" size="lg" block onClick={() => { unlockAudio(); location.href = '/demo'; }}>Try it solo</Button></motion.div>
        <motion.p className="dim" style={{ fontWeight: 800, fontSize: 'var(--t-body-sm)' }} variants={childVariants(rm)}>4 to 8 players · 3 rounds · play at your pace · no login · draw by touch or pointer</motion.p>
        <motion.div variants={childVariants(rm)} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="level-chip" onClick={() => setGallery(true)} aria-label="Your progress and gallery">
            <span>Lv {level(prog.xp)} {levelTitle(prog.xp)}</span><span className="level-bar"><i style={{ transform: `scaleX(${levelProgress(prog.xp)})` }} /></span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setHelp(true)}>How to play</Button>
        </motion.div>
        </div>
      </motion.div>
      <Modal open={help} onClose={() => setHelp(false)} label="How to play"><HowTo onDone={() => setHelp(false)} cta="Close" /></Modal>
      <Modal open={gallery} onClose={() => setGallery(false)} label="Your gallery">
        <div style={{ display: 'grid', gap: 12 }}>
          <h2 className="display-md">Lv {level(prog.xp)} · {levelTitle(prog.xp)}</h2>
          <p className="dim" style={{ fontWeight: 700 }}>{prog.xp} XP · {prog.games} game{prog.games === 1 ? '' : 's'}</p>
          <Card variant="flat"><b>Personal bests</b><p className="dim" style={{ fontWeight: 700 }}>Best AI score: {prog.bests.match}/100 · Longest catch streak: {prog.bests.streak} · Escapes as imposter: {prog.bests.escapes}</p></Card>
          <p className="dim">Saved AI images are available for 30 days. Download a result card to keep it.</p><b>Your glow-ups {prog.gallery.length ? `(${prog.gallery.filter((g) => g.golden).length} golden)` : ''}</b>
          {prog.gallery.length ? (
            <div className="mini-gallery">{prog.gallery.slice().reverse().map((g, i) => <div key={i} className={`mini-gallery__item ${g.golden ? 'mini-gallery__item--golden' : ''}`} title={g.prompt}><img src={g.url} alt={g.prompt} onError={e => { e.currentTarget.style.visibility = 'hidden'; e.currentTarget.parentElement?.setAttribute('data-expired', 'Image expired'); }} /></div>)}</div>
          ) : <p className="mute" style={{ fontWeight: 700 }}>Play a game to fill your gallery. New canvas colors unlock at levels 2, 3, 5 and 7.</p>}
          <Button variant="ghost" onClick={() => setGallery(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
