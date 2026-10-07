// Runs the server (tsx watch) and the Vite client together for local development.
import { spawn } from 'node:child_process';
const procs = [
  spawn('npx', ['tsx', 'watch', 'server/src/index.ts'], { stdio: 'inherit', shell: process.platform === 'win32' }),
  spawn('npx', ['vite', '--config', 'client/vite.config.ts'], { stdio: 'inherit', shell: process.platform === 'win32' }),
];
const stop = () => { for (const p of procs) p.kill('SIGINT'); process.exit(0); };
process.on('SIGINT', stop); process.on('SIGTERM', stop);
for (const p of procs) p.on('exit', (code) => { if (code && code !== 0) stop(); });
