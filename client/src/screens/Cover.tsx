import { DrawingTile, Mascot, Stamp, Scenery } from '@/design/components';
import type { Drawing } from '@shared/types';

/** /cover: a 1200x630 composition to screenshot for the submission's cover image. */
export function Cover() {
  const sketch = (seed: number): Drawing => ({
    playerId: `p${seed}`, strokes: [
      { color: '#111111', size: 7, points: Array.from({ length: 30 }, (_, i) => ({ x: 256 + Math.cos((i / 29) * Math.PI * 2) * (100 + seed * 8), y: 200 + Math.sin((i / 29) * Math.PI * 2) * (90 + seed * 6) })) },
      { color: '#0072B2', size: 7, points: [{ x: 210, y: 180 }, { x: 212, y: 200 }] }, { color: '#0072B2', size: 7, points: [{ x: 300, y: 180 }, { x: 302, y: 200 }] },
      { color: '#D55E00', size: 7, points: [{ x: 220, y: 250 }, { x: 256, y: 270 + seed * 4 }, { x: 292, y: 250 }] },
      { color: '#009E73', size: 7, points: [{ x: 256, y: 300 }, { x: 256, y: 420 }, { x: 200 + seed * 10, y: 480 }] },
    ], glowStatus: 'done', glowMock: false, golden: seed === 2, judgeStatus: 'done', match: [82, 74, 31, 88][seed], blank: false,
  });
  const players = ['Sam', 'Cleo', 'Dee', 'Eve'];
  return (
    <div className="cover">
      <Scenery density={3} />
      <div style={{ position: 'relative', zIndex: 2, display: 'grid', gap: 12 }}>
        <Mascot mood="judge" size={140} />
        <div className="cover__title gold-text">SKETCHY</div>
        <div className="cover__sub">One of you is drawing something different.<br />The AI knows who.</div>
        <div className="meter" style={{ maxWidth: 420 }}>
          <div className="meter__thumb" />
          <div className="meter__body"><div className="meter__name">Dee <span className="meter__tag">IMPOSTER</span></div><div className="meter__track"><div className="meter__fill" style={{ transform: 'scaleX(0.31)', background: 'var(--c-red)' }} /></div><div className="meter__text"><b>Sees: a cat at the dentist.</b> Nice try, nice teeth.</div></div>
          <div className="meter__num" style={{ color: 'var(--c-red)' }}>31%</div>
        </div>
      </div>
      <div className="cover__gallery" style={{ position: 'relative', zIndex: 2 }}>
        {[0, 1, 2, 3].map((i) => (
          <DrawingTile key={i} drawing={sketch(i)} player={{ id: `p${i}`, name: players[i], color: ['#FF6B6B', '#63E6BE', '#B197FC', '#FFE066'][i], avatar: ['🦊', '🐸', '🦄', '🐙'][i], connected: true, isBot: false, spectator: false, score: 0, streak: 0, readyHowTo: true, hasSubmitted: true, hasVoted: true }} size={260} />
        ))}
        <div style={{ position: 'absolute', left: '-6%', bottom: '18%', zIndex: 3 }}><Stamp kind="imposter" sound={false} /></div>
      </div>
    </div>
  );
}
