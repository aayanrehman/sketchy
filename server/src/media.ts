import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Mount a persistent volume here in production so saved galleries survive deploys.
export const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/media'));
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
let writes: Promise<unknown> = Promise.resolve();
export function storeImage(bytes: Buffer, format: 'png' | 'webp'): Promise<string> {
  const work = writes.then(() => writeImage(bytes, format));
  writes = work.catch(() => {}); return work;
}
export async function cleanupMedia() {
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  let total = 0;
  for (const name of await fs.readdir(MEDIA_DIR)) {
    if (!/^[a-f0-9]{64}\.(png|webp)$/.test(name)) continue;
    const file = path.join(MEDIA_DIR, name); const stat = await fs.stat(file);
    if (Date.now() - stat.mtimeMs > 30 * 86400000) await fs.unlink(file); else total += stat.size;
  }
  return total;
}
async function writeImage(bytes: Buffer, format: 'png' | 'webp'): Promise<string> {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Invalid image size');
  const signatureOk = format === 'webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (!signatureOk) throw new Error('Invalid image format');
  const name = `${createHash('sha256').update(bytes).digest('hex')}.${format}`;
  const used = await cleanupMedia();
  const existing = await fs.stat(path.join(MEDIA_DIR, name)).catch(() => null);
  if (!existing && used + bytes.length > Number(process.env.MEDIA_MAX_BYTES || 500000000)) throw new Error('Media capacity reached');
  if (existing) await fs.utimes(path.join(MEDIA_DIR, name), new Date(), new Date());
  await fs.writeFile(path.join(MEDIA_DIR, name), bytes, { flag: 'wx' }).catch((e) => { if (e.code !== 'EEXIST') throw e; });
  return `/media/${name}`;
}
export function parseSketch(dataUrl: string): Buffer {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl) || dataUrl.length > 3_000_000) throw new Error('Invalid sketch');
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Invalid PNG');
  if (bytes.length < 24 || bytes.toString('ascii', 12, 16) !== 'IHDR' || bytes.readUInt32BE(16) < 1 || bytes.readUInt32BE(20) < 1 || bytes.readUInt32BE(16) > 1024 || bytes.readUInt32BE(20) > 1024) throw new Error('Invalid PNG dimensions');
  return bytes;
}
