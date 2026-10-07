import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

// Mount a persistent volume here in production so saved galleries survive deploys.
export const MEDIA_DIR = path.resolve(process.env.MEDIA_DIR || path.join(path.dirname(fileURLToPath(import.meta.url)), '../data/media'));
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
export async function storeImage(bytes: Buffer, format: 'png' | 'webp'): Promise<string> {
  if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new Error('Invalid image size');
  const signatureOk = format === 'webp' ? bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP' : bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
  if (!signatureOk) throw new Error('Invalid image format');
  const name = `${createHash('sha256').update(bytes).digest('hex')}.${format}`;
  await fs.mkdir(MEDIA_DIR, { recursive: true });
  await fs.writeFile(path.join(MEDIA_DIR, name), bytes, { flag: 'wx' }).catch((e) => { if (e.code !== 'EEXIST') throw e; });
  return `/media/${name}`;
}
export function parseSketch(dataUrl: string): Buffer {
  if (!/^data:image\/png;base64,[A-Za-z0-9+/]+=*$/.test(dataUrl) || dataUrl.length > 3_000_000) throw new Error('Invalid sketch');
  const bytes = Buffer.from(dataUrl.split(',')[1], 'base64');
  if (!bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) throw new Error('Invalid PNG');
  return bytes;
}
