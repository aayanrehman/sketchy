// Local development: Convex dev backend (watches convex/) and the Vite client together.
import { spawn } from 'node:child_process';
const shell = process.platform === 'win32';
const procs = [
  spawn('npx', ['convex', 'dev'], { stdio: 'inherit', shell }),
  spawn('npx', ['vite', '--config', 'client/vite.config.ts'], { stdio: 'inherit', shell }),
];
const stop = () => { for (const p of procs) p.kill('SIGINT'); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
for (const p of procs) p.on('exit', (code) => { if (code && code !== 0) stop(); });
