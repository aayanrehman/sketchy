import { motion, useReducedMotion } from 'framer-motion';
import type { Player } from '@shared/types';
import { t } from '../motion';

interface Props {
  player: Player; size?: 'sm' | 'md' | 'lg'; isHost?: boolean; isYou?: boolean; badge?: string | null;
  showScore?: boolean; active?: boolean; layoutPrefix?: string; onClick?: () => void; streak?: boolean;
}

/** Shared element: same layoutId across phases so avatars glide between rails and tiles. */
export function Avatar({ player, size = 'md', isHost, isYou, badge, showScore, active, layoutPrefix = 'avatar', onClick, streak }: Props) {
  const rm = !!useReducedMotion();
  const showFlame = streak ?? player.streak >= 2;
  return (
    <motion.div
      layoutId={`${layoutPrefix}-${player.id}`}
      layout="position"
      transition={t.layout(rm)}
      className={`avatar avatar--${size} ${!player.connected && !player.isBot ? 'avatar--off' : ''} ${active ? 'avatar--active' : ''}`}
      style={{ ['--av-color' as any]: player.color }}
      onClick={onClick}
      data-avatar={player.id}
      role={onClick ? 'button' : undefined}
      aria-label={`${player.name}${isHost ? ', host' : ''}${isYou ? ', you' : ''}`}
    >
      <div className="avatar__disc">
        <span className="avatar__ring" aria-hidden />
        <span aria-hidden>{player.avatar}</span>
        {isHost && <span className="avatar__badge avatar__badge--host" title="Host">★</span>}
        {isYou && <span className="avatar__badge avatar__badge--you" title="You">YOU</span>}
        {badge && <span className="avatar__badge">{badge}</span>}
        {showFlame && <span className={`avatar__flame ${rm ? 'rm-still' : ''}`} title={`${player.streak} catch streak`}>🔥</span>}
      </div>
      <span className="avatar__name">{player.name}</span>
      {showScore && <span className="avatar__score">{player.score}</span>}
    </motion.div>
  );
}
