import '@fontsource/fredoka/latin-700.css';
import '@fontsource/nunito/latin-700.css';
import '@fontsource/nunito/latin-800.css';
import '@fontsource/nunito/latin-900.css';
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import '@/design/tokens.css';
import '@/design/components/components.css';
import '@/shell/shell.css';
import { unlockAudio } from '@/sound/sfx';

// iOS needs a user gesture before audio; the first tap anywhere unlocks it.
window.addEventListener('pointerdown', () => unlockAudio(), { once: true });

createRoot(document.getElementById('root')!).render(<React.StrictMode><App /></React.StrictMode>);
