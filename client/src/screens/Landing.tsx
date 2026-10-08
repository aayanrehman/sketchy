import { SoundControl } from '@/design/components';
import { useState } from 'react';
import { go } from '@/nav';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, Card, Modal, Mascot, Scenery } from '@/design/components';
import { load, level, levelTitle, levelProgress } from '@/progression/store';
import { childVariants, phaseVariants } from '@/design/motion';
import { unlockAudio } from '@/sound/sfx';
import { HowTo } from '@/shell/HowTo';
import { LiveDemo } from './LiveDemo';

/** / landing: Host a game, Join a game, Try it solo. Shows your level and gallery. */
export function Landing() {
  const rm = !!useReducedMotion();
  const prog = load();
  const [gallery, setGallery] = useState(false);
  const [help, setHelp] = useState(false);
  return (
    <div className="landing landing--home"><div className="corner-sound"><SoundControl /></div>
      <Scenery density={3} lively />
      <motion.div className="landing__inner landing__home-grid" variants={phaseVariants(rm)} initial="initial" animate="enter">
        <div className="landing__left">
        <span className="landing__eyebrow">A LITTLE PROMPTING. A LOT OF ACCUSATIONS.</span>
        <motion.div className="landing__brand" variants={childVariants(rm)}><Mascot mood="happy" size={112} float /><h1 className="landing__logo gold-text">SKETCHY</h1></motion.div>
        <motion.p className="landing__tag" variants={childVariants(rm)}>Recreate the picture with an AI prompt.<br />One of you can’t see all of it. Find them.</motion.p>
        <div className="landing__menu">
        <p className="landing__menu-title">Who's looking sketchy?</p>
        <motion.div variants={childVariants(rm)}><Button size="lg" block onClick={() => { unlockAudio(); go('/host'); }}>Host a game</Button></motion.div>
        <motion.div variants={childVariants(rm)}><Button variant="secondary" size="lg" block onClick={() => { unlockAudio(); go('/play'); }}>Join a game</Button></motion.div>
        <motion.div variants={childVariants(rm)}><Button variant="lime" size="lg" block onClick={() => { unlockAudio(); go('/demo'); }}>Play solo vs. bots</Button></motion.div>
        <motion.p className="dim" style={{ fontWeight: 800, fontSize: 'var(--t-body-sm)' }} variants={childVariants(rm)}>4–8 players · 3 rounds · no login · phone or laptop · get better at prompting</motion.p>
        <motion.div variants={childVariants(rm)} style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button type="button" className="level-chip" onClick={() => setGallery(true)} aria-label="Your progress and gallery">
            <span>Lv {level(prog.xp)} {levelTitle(prog.xp)}</span><span className="level-bar"><i style={{ transform: `scaleX(${levelProgress(prog.xp)})` }} /></span>
          </button>
          <Button variant="ghost" size="sm" onClick={() => setHelp(true)}>How to play</Button>
        </motion.div>
        </div>
        </div>
        <motion.div className="landing__right" variants={childVariants(rm)}><LiveDemo /></motion.div>
      </motion.div>
      <Modal open={help} onClose={() => setHelp(false)} label="How to play"><HowTo onDone={() => setHelp(false)} cta="Close" /></Modal>
      <Modal open={gallery} onClose={() => setGallery(false)} label="Your gallery">
        <div style={{ display: 'grid', gap: 12 }}>
          <h2 className="display-md">Lv {level(prog.xp)} · {levelTitle(prog.xp)}</h2>
          <p className="dim" style={{ fontWeight: 700 }}>{prog.xp} XP · {prog.games} game{prog.games === 1 ? '' : 's'}</p>
          <Card variant="flat"><b>Personal bests</b><p className="dim" style={{ fontWeight: 700 }}>Best AI score: {prog.bests.match}/100 · Longest catch streak: {prog.bests.streak} · Escapes as imposter: {prog.bests.escapes}</p></Card>
          <p className="dim">Saved AI images are available for 30 days. Download a result card to keep it.</p><b>Your images {prog.gallery.length ? `(${prog.gallery.filter((g) => g.golden).length} golden)` : ''}</b>
          {prog.gallery.length ? (
            <div className="mini-gallery">{prog.gallery.slice().reverse().map((g, i) => <div key={i} className={`mini-gallery__item ${g.golden ? 'mini-gallery__item--golden' : ''}`} title={g.prompt}><img src={g.url} alt={g.prompt} onError={e => { e.currentTarget.style.visibility = 'hidden'; e.currentTarget.parentElement?.setAttribute('data-expired', 'Image expired'); }} /></div>)}</div>
          ) : <p className="mute" style={{ fontWeight: 700 }}>Play a game to fill your gallery. In Sketch mode, new ink colors unlock at levels 2, 3, 5 and 7.</p>}
          <Button variant="ghost" onClick={() => setGallery(false)}>Close</Button>
        </div>
      </Modal>
    </div>
  );
}
