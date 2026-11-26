/**
 * Writes the PWA / iOS icons as PNG files with no image library:
 * a blue tile with a white 4x4 box grid and a few "filled" cells.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { deflateSync } from "node:zlib";

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (buf: Buffer) => {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}

function png(size: number, pixel: (x: number, y: number) => [number, number, number]): Buffer {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0;
    for (let x = 0; x < size; x++) {
      const [r, g, b] = pixel(x, y);
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = r;
      raw[o + 1] = g;
      raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const BLUE: [number, number, number] = [37, 99, 235];
const WHITE: [number, number, number] = [255, 255, 255];
const LIGHT: [number, number, number] = [147, 197, 253];
const FILLED = new Set([0, 5, 10, 15, 3, 12]); // diagonal + corners of the 4x4 boxes

/** padding: fraction of the icon kept empty around the grid (maskable icons need a safe zone). */
function icon(size: number, padding: number): Buffer {
  const g0 = Math.round(size * padding);
  const g1 = size - g0;
  const cell = (g1 - g0) / 4;
  const line = Math.max(2, Math.round(size / 48));
  return png(size, (x, y) => {
    if (x < g0 || x >= g1 || y < g0 || y >= g1) return BLUE;
    const cx = (x - g0) / cell;
    const cy = (y - g0) / cell;
    const onLine = [0, 1, 2, 3, 4].some((k) => Math.abs(x - (g0 + k * cell)) < line || Math.abs(y - (g0 + k * cell)) < line);
    if (onLine) return WHITE;
    const idx = Math.floor(cy) * 4 + Math.floor(cx);
    return FILLED.has(idx) ? LIGHT : BLUE;
  });
}

const dir = join(__dirname, "..", "public", "icons");
mkdirSync(dir, { recursive: true });
writeFileSync(join(dir, "icon-192.png"), icon(192, 0.18));
writeFileSync(join(dir, "icon-512.png"), icon(512, 0.18));
writeFileSync(join(dir, "maskable-512.png"), icon(512, 0.28));
writeFileSync(join(dir, "apple-touch-icon.png"), icon(180, 0.16));
console.log("Icons written to", dir);
