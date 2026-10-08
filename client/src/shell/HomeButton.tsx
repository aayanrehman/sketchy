import { useState } from 'react';
import { Button, Modal } from '@/design/components';
import { getSession, setSession } from '@/net/socket';
import { send } from '@/moments/common';
import { go } from '@/nav';

/** Home, with an "are you sure?" step. Players leave the room cleanly; the TV screen just closes. */
export function HomeButton({ screen, inGame, logo }: { screen?: boolean; inGame: boolean; logo?: boolean }) {
  const [open, setOpen] = useState(false);
  const leave = async () => {
    setOpen(false);
    if (!screen && getSession()?.token) await send().emit('leave');
    try { sessionStorage.removeItem('sketchy.demo'); } catch { /* storage is optional */ }
    setSession(null);
    go('/');
  };
  return (
    <>
      {logo
        ? <button type="button" className="home-logo gold-text" onClick={() => setOpen(true)} aria-label="Sketchy home">SKETCHY</button>
        : <Button variant="ghost" size="sm" className="home-btn" onClick={() => setOpen(true)} aria-label="Back to home"><span aria-hidden>⌂</span><span className="home-btn__text">Home</span></Button>}
      <Modal open={open} onClose={() => setOpen(false)} label="Leave the game?">
        <div className="leave">
          <img src="/mascot/sus.webp" alt="" width={96} height={96} />
          <h2 className="display-md">{screen ? 'Leave this screen?' : inGame ? 'Leave this game?' : 'Go back home?'}</h2>
          <p className="dim">{screen ? 'The game keeps running on players’ phones. You can reopen this room from its link.'
            : inGame ? 'You’ll lose your spot in this game. Everyone else carries on without you.'
            : 'You’ll leave this room.'}</p>
          <div className="leave__actions">
            <Button variant="ghost" onClick={() => setOpen(false)}>Stay</Button>
            <Button variant="danger" onClick={leave}>{screen ? 'Leave screen' : inGame ? 'Leave game' : 'Go home'}</Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
