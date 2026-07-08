#!/usr/bin/env node
// Generates MYSTIC PWA icons + placeholder screenshots WITHOUT external deps.
// A tiny hand-rolled PNG encoder draws a deep-black icon with a gold star/M
// motif. Replace screenshots with real captures before store submission.
import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const BG = [5, 5, 8, 255];
const GOLD = [203, 185, 148, 255];

function crc32(buf) {
  let c = ~0;
  for (let i = 0; i < buf.length; i++) {
    c ^= buf[i];
    for (let k = 0; k < 8; k++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
  }
  return ~c >>> 0;
}

function chunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])));
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function encodePng(width, height, pixels) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const src = (y * width + x) * 4;
      const dst = y * (width * 4 + 1) + 1 + x * 4;
      raw[dst] = pixels[src];
      raw[dst + 1] = pixels[src + 1];
      raw[dst + 2] = pixels[src + 2];
      raw[dst + 3] = pixels[src + 3];
    }
  }
  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

function setPx(px, w, x, y, color) {
  if (x < 0 || y < 0 || x >= w) return;
  const i = (y * w + x) * 4;
  px[i] = color[0];
  px[i + 1] = color[1];
  px[i + 2] = color[2];
  px[i + 3] = color[3];
}

// Draws a simple 8-point star (star-burst) centered - reads as a mystic mark.
function drawIcon(size, maskable) {
  const px = Buffer.alloc(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    px.set(BG, i * 4);
  }
  const cx = size / 2;
  const cy = size / 2;
  const R = size * (maskable ? 0.3 : 0.36);
  const r = R * 0.4;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.hypot(dx, dy);
      const ang = Math.atan2(dy, dx);
      // 4 long + 4 short rays
      const spikes = Math.abs(Math.cos(2 * ang)) + 0.5 * Math.abs(Math.cos(2 * (ang + Math.PI / 4)));
      const edge = r + (R - r) * spikes;
      if (dist <= edge) setPx(px, size, x, y, GOLD);
      // thin outer ring
      const ring = size * 0.44;
      if (!maskable && Math.abs(dist - ring) < size * 0.006) setPx(px, size, x, y, GOLD);
    }
  }
  return encodePng(size, size, px);
}

function solid(width, height, color) {
  const px = Buffer.alloc(width * height * 4);
  for (let i = 0; i < width * height; i++) px.set(color, i * 4);
  return encodePng(width, height, px);
}

mkdirSync('public/icons', { recursive: true });
mkdirSync('public/screenshots', { recursive: true });

writeFileSync('public/icons/icon-192.png', drawIcon(192, false));
writeFileSync('public/icons/icon-512.png', drawIcon(512, false));
writeFileSync('public/icons/maskable-192.png', drawIcon(192, true));
writeFileSync('public/icons/maskable-512.png', drawIcon(512, true));
writeFileSync('public/apple-touch-icon.png', drawIcon(180, false));
writeFileSync('public/favicon.ico', drawIcon(48, false)); // PNG payload; browsers accept it
writeFileSync('public/maskable-icon-192.png', drawIcon(192, true));
writeFileSync('public/maskable-icon-512.png', drawIcon(512, true));

// Placeholder screenshots (replace before store submission).
writeFileSync('public/screenshots/mobile-home.png', solid(1080, 1920, BG));
writeFileSync('public/screenshots/mobile-report.png', solid(1080, 1920, BG));

console.log('✓ Generated PWA icons + placeholder screenshots in public/');
