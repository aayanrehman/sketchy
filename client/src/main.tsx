import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { ConvexProvider } from 'convex/react';
import App from './App';
import { convex } from '@/net/socket';
import '@/design/tokens.css';
import '@/design/components/components.css';
import '@/shell/shell.css';
import { unlockAudio } from '@/sound/sfx';
import { startMusic } from '@/sound/music';

// Browsers need a user gesture before audio; the first tap or key anywhere unlocks it and starts the music bed.
const unlock = () => { unlockAudio(); startMusic(); };
window.addEventListener('pointerdown', unlock, { once: true });
window.addEventListener('keydown', unlock, { once: true });

createRoot(document.getElementById('root')!).render(<React.StrictMode><ConvexProvider client={convex}><App /></ConvexProvider></React.StrictMode>);
