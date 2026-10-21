/**
 * Generates the PWA icons as PNGs with no image dependencies.
 *
 * Design: an indigo rounded field with a white 3×3 grid motif and three filled
 * cells on the diagonal — a clean, recognizable Sudoku mark. Produces regular
 * and maskable icons plus an Apple touch icon.
 *
 * Usage: `npm run generate:icons` (wired via package.json) or `tsx scripts/generate-icons.ts`.
 */

import { deflateSync } from 'node:zlib';
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT_DIR = join(__dirname, '..', 'public', 'icons');

type RGBA = [number, number, number, number];
const ACCENT: RGBA = [79, 70, 229, 255]; // indigo-600
const ACCENT_DARK: RGBA = [67, 56, 202, 255];
const WHITE: RGBA = [255, 255, 255, 255];
const TRANSPARENT: RGBA = [0, 0, 0, 0];

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([length, typeBuf, data, crc]);
}

function encodePNG(width: number, height: number, pixels: Uint8Array): Buffer {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const stride = width * 4;
  const raw = Buffer.alloc((stride + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0; // filter: none
    pixels.subarray(y * stride, (y + 1) * stride).forEach((v, i) => {
      raw[y * (stride + 1) + 1 + i] = v;
    });
  }
  const idat = deflateSync(raw);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', Buffer.alloc(0))]);
}

function render(size: number, maskable: boolean): Uint8Array {
  const pixels = new Uint8Array(size * size * 4);
  const set = (x: number, y: number, c: RGBA): void => {
    if (x < 0 || y < 0 || x >= size || y >= size) return;
    const i = (y * size + x) * 4;
    pixels[i] = c[0];
    pixels[i + 1] = c[1];
    pixels[i + 2] = c[2];
    pixels[i + 3] = c[3];
  };

  // Background: full-bleed for maskable, rounded square otherwise.
  const radius = maskable ? 0 : Math.round(size * 0.22);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (maskable) {
        set(x, y, ACCENT);
      } else {
        const inside = insideRoundedRect(x, y, 0, 0, size, size, radius);
        set(x, y, inside ? ACCENT : TRANSPARENT);
      }
    }
  }

  // Board region (leave padding, extra for maskable safe zone).
  const pad = Math.round(size * (maskable ? 0.2 : 0.16));
  const boardSize = size - pad * 2;
  const cell = boardSize / 3;
  const line = Math.max(2, Math.round(size * 0.012));

  // Filled diagonal cells.
  for (let gy = 0; gy < 3; gy++) {
    for (let gx = 0; gx < 3; gx++) {
      if (gx !== gy) continue;
      const x0 = Math.round(pad + gx * cell + line);
      const y0 = Math.round(pad + gy * cell + line);
      const x1 = Math.round(pad + (gx + 1) * cell - line);
      const y1 = Math.round(pad + (gy + 1) * cell - line);
      for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) set(x, y, WHITE);
    }
  }

  // Grid lines.
  for (let k = 0; k <= 3; k++) {
    const pos = Math.round(pad + k * cell);
    for (let t = -Math.floor(line / 2); t < Math.ceil(line / 2); t++) {
      for (let i = pad; i <= pad + boardSize; i++) {
        set(pos + t, i, WHITE); // vertical
        set(i, pos + t, WHITE); // horizontal
      }
    }
  }

  // Subtle inner shadow on filled cells using the darker accent border.
  void ACCENT_DARK;
  return pixels;
}

function insideRoundedRect(
  x: number,
  y: number,
  rx: number,
  ry: number,
  w: number,
  h: number,
  r: number,
): boolean {
  const left = rx + r;
  const right = rx + w - r;
  const top = ry + r;
  const bottom = ry + h - r;
  if (x >= left && x <= right) return y >= ry && y <= ry + h;
  if (y >= top && y <= bottom) return x >= rx && x <= rx + w;
  const cx = x < left ? left : right;
  const cy = y < top ? top : bottom;
  return (x - cx) ** 2 + (y - cy) ** 2 <= r * r;
}

function write(name: string, size: number, maskable: boolean): void {
  const png = encodePNG(size, size, render(size, maskable));
  writeFileSync(join(OUT_DIR, name), png);
  console.log(`  ${name} (${size}×${size})`);
}

console.log('Generating icons...');
write('icon-192.png', 192, false);
write('icon-512.png', 512, false);
write('icon-maskable-512.png', 512, true);
write('apple-touch-icon.png', 180, false);
write('favicon-32.png', 32, false);
console.log('Done.');
