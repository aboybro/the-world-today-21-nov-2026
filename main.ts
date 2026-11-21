// THE WORLD TODAY — SATURDAY 21 NOVEMBER 2026
// A procedural newspaper front page summing up 21 November 2026 in one image.
// Node 22, standard library only, no network, fully deterministic:
// the same source always writes the same bytes to entry.png.
//
// Layout (1024 x 1024): masthead, lead story + world map, six illustrated
// panels, a UTC timeline, and 40 numbered stories in two columns.

import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------- palette
const PAPER = [248, 244, 233];
const INK = [20, 20, 20];
const RED = [176, 30, 36];
const BLUE = [29, 78, 137];
const GOLD = [176, 132, 32];
const TEAL = [18, 110, 105];
const GREY = [90, 86, 76];
const LIGHT = [232, 226, 210];
const SKY = [174, 205, 228];
const SEA = [120, 165, 205];
const LAND = [196, 178, 132];
const GREEN = [46, 110, 62];
const ORANGE = [198, 96, 24];

// ---------------------------------------------------------------- canvas
const px = new Uint8Array(W * H * 3);
for (let i = 0; i < W * H; i++) {
  px[i * 3] = PAPER[0]; px[i * 3 + 1] = PAPER[1]; px[i * 3 + 2] = PAPER[2];
}
function set(x: number, y: number, c: number[]): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2];
}
function rect(x: number, y: number, w: number, h: number, c: number[]): void {
  for (let j = y; j < y + h; j++) for (let i = x; i < x + w; i++) set(i, j, c);
}
function hline(x: number, y: number, w: number, c: number[], t = 1): void { rect(x, y, w, t, c); }
function vline(x: number, y: number, h: number, c: number[], t = 1): void { rect(x, y, t, h, c); }
function frame(x: number, y: number, w: number, h: number, c: number[], t = 2): void {
  hline(x, y, w, c, t); hline(x, y + h - t, w, c, t);
  vline(x, y, h, c, t); vline(x + w - t, y, h, c, t);
}
function circle(cx: number, cy: number, r: number, c: number[]): void {
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    const dx = x - cx, dy = y - cy;
    if (dx * dx + dy * dy <= r * r) set(x, y, c);
  }
}
function disc(cx: number, cy: number, r: number, c: number[]): void { circle(cx, cy, r, c); }
function ring(cx: number, cy: number, r: number, c: number[]): void {
  for (let a = 0; a < 360; a += 2) {
    const rad = (a * Math.PI) / 180;
    set(Math.round(cx + r * Math.cos(rad)), Math.round(cy + r * Math.sin(rad)), c);
  }
}
function tri(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, c: number[]): void {
  const minX = Math.min(x1, x2, x3), maxX = Math.max(x1, x2, x3);
  const minY = Math.min(y1, y2, y3), maxY = Math.max(y1, y2, y3);
  const d = (x2 - x1) * (y3 - y1) - (y2 - y1) * (x3 - x1);
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    const a = ((x2 - x) * (y3 - y) - (y2 - y) * (x3 - x)) / d;
    const b = ((x3 - x) * (y1 - y) - (y3 - y) * (x1 - x)) / d;
    const g = 1 - a - b;
    if (a >= 0 && b >= 0 && g >= 0) set(x, y, c);
  }
}

// ---------------------------------------------------------------- 5x7 font
// Each glyph: 7 rows of 5 bits, written as strings. All text is upper-case.
const FONT: Record<string, string[]> = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  '0': ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  '1': ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  '2': ['01110', '10001', '00001', '00110', '01000', '10000', '11111'],
  '3': ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  '4': ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  '5': ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  '6': ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  '7': ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  '8': ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  '9': ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  ' ': ['00000', '00000', '00000', '00000', '00000', '00000', '00000'],
  '.': ['00000', '00000', '00000', '00000', '00000', '01100', '01100'],
  ',': ['00000', '00000', '00000', '00000', '01100', '00100', '01000'],
  ':': ['00000', '01100', '01100', '00000', '01100', '01100', '00000'],
  ';': ['00000', '01100', '01100', '00000', '01100', '00100', '01000'],
  '-': ['00000', '00000', '00000', '01110', '00000', '00000', '00000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  "'": ['00100', '00100', '01000', '00000', '00000', '00000', '00000'],
  '(': ['00010', '00100', '01000', '01000', '01000', '00100', '00010'],
  ')': ['01000', '00100', '00010', '00010', '00010', '00100', '01000'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  '+': ['00000', '00100', '00100', '01110', '00100', '00100', '00000'],
  '&': ['01100', '10010', '10100', '01000', '10101', '10010', '01101'],
  '!': ['00100', '00100', '00100', '00100', '00100', '00000', '00100'],
  '?': ['01110', '10001', '00001', '00110', '00100', '00000', '00100'],
  '=': ['00000', '00000', '11111', '00000', '11111', '00000', '00000'],
  $: ['00100', '01111', '10100', '01110', '00101', '11110', '00100'],
  '*': ['00000', '00100', '10101', '01110', '10101', '00100', '00000'],
  '>': ['10000', '01000', '00100', '00010', '00100', '01000', '10000'],
  '<': ['00001', '00010', '00100', '01000', '00100', '00010', '00001'],
  '"': ['01010', '01010', '01010', '00000', '00000', '00000', '00000'],
};

function textWidth(s: string, sc: number): number {
  return s.length * (5 * sc + sc) - sc;
}
function drawText(x: number, y: number, s: string, sc: number, c: number[]): void {
  let cx = x;
  for (const ch of s.toUpperCase()) {
    const g = FONT[ch] ?? FONT['?'];
    for (let r = 0; r < 7; r++) for (let col = 0; col < 5; col++) {
      if (g[r][col] === '1') rect(cx + col * sc, y + r * sc, sc, sc, c);
    }
    cx += 5 * sc + sc;
  }
}
function textCenter(x: number, y: number, w: number, s: string, sc: number, c: number[]): void {
  drawText(x + Math.floor((w - textWidth(s, sc)) / 2), y, s, sc, c);
}
// Wrap a paragraph to lines of at most maxChars characters, at scale sc.
function wrap(s: string, maxChars: number): string[] {
  const words = s.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if (cur === '') cur = w;
    else if (cur.length + 1 + w.length <= maxChars) cur += ' ' + w;
    else { lines.push(cur); cur = w; }
  }
  if (cur !== '') lines.push(cur);
  return lines;
}
function para(x: number, y: number, w: number, s: string, sc: number, c: number[], lh: number): number {
  const maxChars = Math.floor((w + sc) / (6 * sc));
  const lines = wrap(s, maxChars);
  for (let i = 0; i < lines.length; i++) drawText(x, y + i * lh, lines[i], sc, c);
  return y + lines.length * lh;
}

// ---------------------------------------------------------------- PNG writer
function crc32(buf: Buffer): number {
  let table = (crc32 as unknown as { t?: Int32Array }).t;
  if (!table) {
    table = new Int32Array(256);
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      table[n] = c;
    }
    (crc32 as unknown as { t: Int32Array }).t = table;
  }
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}
function encodePNG(): Buffer {
  const raw = Buffer.alloc((W * 3 + 1) * H);
  for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0;
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (W * 3 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

// ================================================================ MASTHEAD
rect(0, 0, W, 4, RED);
textCenter(0, 12, W, 'THE WORLD TODAY', 6, INK);
hline(16, 58, 992, INK, 2);
textCenter(0, 66, W, 'SATURDAY 21 NOVEMBER 2026  -  ONE DAY, ONE PAGE, FORTY STORIES', 2, RED);
textCenter(0, 84, W, 'ALL TIMES UTC  -  REPORTED SATURDAY 21 NOVEMBER 2026', 1, GREY);

// ================================================================ LEAD STORY
const LX = 16, LW = 616;
frame(LX, 100, LW, 152, INK, 2);
rect(LX + 2, 102, LW - 4, 26, RED);
drawText(LX + 12, 108, 'LEAD  -  CLIMATE', 2, [255, 255, 255]);
drawText(LX + 12, 136, 'COP31 IN OVERTIME', 3, INK);
para(LX + 12, 168, LW - 24, 'ANTALYA, TURKEY - UN CLIMATE TALKS RAN PAST THEIR FRIDAY DEADLINE INTO SATURDAY AS NEARLY 200 NATIONS SPLIT OVER FOSSIL FUELS. THE DRAFT DEAL DID NOT EVEN NAME THEM.', 2, INK, 17);

// ================================================================ WORLD MAP
const MX = 648, MW = 360, MY = 100, MH = 152;
frame(MX, MY, MW, MH, INK, 2);
rect(MX + 2, MY + 2, MW - 4, MH - 4, SKY);
drawText(MX + 10, MY + 6, 'THE DAY ON THE MAP', 1, BLUE);
// stylised continents (equirectangular, x 648..1008, y 100..252)
function landPoly(pts: number[][], c: number[]): void {
  // fill by scanline over the polygon bounding box
  const minX = Math.min(...pts.map((p) => p[0])), maxX = Math.max(...pts.map((p) => p[0]));
  const minY = Math.min(...pts.map((p) => p[1])), maxY = Math.max(...pts.map((p) => p[1]));
  for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
    let inside = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const xi = pts[i][0], yi = pts[i][1], xj = pts[j][0], yj = pts[j][1];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
    }
    if (inside) set(x, y, c);
  }
}
const ox = MX + 8, oy = MY + 22, sx = 0.92, sy = 0.92;
// North America
landPoly([[ox + 20, oy + 8], [ox + 90, oy + 2], [ox + 108, oy + 22], [ox + 88, oy + 44], [ox + 60, oy + 52], [ox + 34, oy + 40], [ox + 12, oy + 26]].map(([a, b]) => [Math.round(ox + (a - ox) * sx), Math.round(oy + (b - oy) * sy)]), LAND);
// South America
landPoly([[ox + 88, oy + 58], [ox + 118, oy + 58], [ox + 122, oy + 92], [ox + 104, oy + 118], [ox + 92, oy + 88]].map(([a, b]) => [Math.round(ox + (a - ox) * sx), Math.round(oy + (b - oy) * sy)]), LAND);
// Europe + Africa
landPoly([[ox + 168, oy + 10], [ox + 196, oy + 6], [ox + 206, oy + 26], [ox + 196, oy + 44], [ox + 204, oy + 78], [ox + 188, oy + 108], [ox + 170, oy + 96], [ox + 160, oy + 60], [ox + 158, oy + 30]].map(([a, b]) => [Math.round(ox + (a - ox) * sx), Math.round(oy + (b - oy) * sy)]), LAND);
// Asia
landPoly([[ox + 210, oy + 6], [ox + 300, oy + 2], [ox + 330, oy + 26], [ox + 316, oy + 52], [ox + 280, oy + 66], [ox + 250, oy + 56], [ox + 228, oy + 40], [ox + 208, oy + 22]].map(([a, b]) => [Math.round(ox + (a - ox) * sx), Math.round(oy + (b - oy) * sy)]), LAND);
// Australia
landPoly([[ox + 288, oy + 92], [ox + 322, oy + 90], [ox + 326, oy + 106], [ox + 300, oy + 112], [ox + 286, oy + 102]].map(([a, b]) => [Math.round(ox + (a - ox) * sx), Math.round(oy + (b - oy) * sy)]), LAND);
// markers: 1 Antalya, 2 Riyadh, 3 Peru, 4 Kyiv, 5 Mercury (off-map star), 6 The Hague
function marker(x: number, y: number, n: string): void {
  disc(x, y, 9, RED);
  ring(x, y, 9, INK);
  drawText(x - 3, y - 3, n, 1, [255, 255, 255]);
}
marker(ox + 196, oy + 34, '1');
marker(ox + 216, oy + 52, '2');
marker(ox + 84, oy + 84, '3');
marker(ox + 186, oy + 20, '4');
marker(ox + 168, oy + 12, '6');
drawText(MX + 10, MY + MH - 16, '1 ANTALYA  2 RIYADH  3 PERU  4 KYIV  6 THE HAGUE', 1, INK);
drawText(MX + 236, MY + 6, '5 MERCURY *', 1, GOLD);

// ================================================================ SIX PANELS
const PY = 264, PH = 164, PW = 160, PGAP = 9;
interface Panel { tag: string; title: string; sub: string; scene: number; }
const panels: Panel[] = [
  { tag: 'CLIMATE', title: 'COP31 IN', sub: 'OVERTIME', scene: 0 },
  { tag: 'MIDDLE EAST', title: 'RIYADH', sub: 'INTERCEPTS 3', scene: 1 },
  { tag: 'SOUTH AMERICA', title: 'PERU', sub: 'QUAKE M6.7', scene: 2 },
  { tag: 'SPACE', title: 'MERCURY', sub: 'AT LAST', scene: 3 },
  { tag: 'EUROPE', title: 'KYIV', sub: 'BRIDGES HIT', scene: 4 },
  { tag: 'JUSTICE', title: 'ICJ: MYANMAR', sub: 'GENOCIDE', scene: 5 },
];
function panelScene(x: number, y: number, w: number, h: number, n: number): void {
  if (n === 0) { // COP31: sun over a hall, delegates
    rect(x, y, w, h, [214, 226, 214]);
    circle(x + 80, y + 34, 22, GOLD);
    rect(x + 10, y + 78, w - 20, 22, TEAL);
    for (let i = 0; i < 6; i++) { disc(x + 22 + i * 22, y + 70, 7, INK); rect(x + 14 + i * 22, y + 76, 16, 20, BLUE); }
  } else if (n === 1) { // Riyadh: night sky, interceptor trails, towers
    rect(x, y, w, h, [16, 24, 48]);
    for (let i = 0; i < 14; i++) set(x + 8 + ((i * 37) % (w - 16)), y + 8 + ((i * 23) % 40), [255, 255, 255]);
    rect(x + 18, y + 46, 14, 54, [120, 130, 150]); rect(x + 60, y + 30, 16, 70, [150, 160, 180]);
    tri(x + 60, y + 18, x + 76, y + 18, x + 68, y + 30, [150, 160, 180]);
    rect(x + 104, y + 56, 12, 44, [120, 130, 150]);
    for (let i = 0; i < 3; i++) { // interceptor trails
      const bx = x + 30 + i * 40;
      for (let t = 0; t < 26; t++) set(bx + t, y + 88 - t, GOLD);
      disc(bx + 26, y + 62, 4, [255, 220, 120]);
    }
  } else if (n === 2) { // Peru: mountains, crack, shaking houses
    rect(x, y, w, h, [226, 214, 188]);
    tri(x + 0, y + 100, x + 50, y + 30, x + 100, y + 100, [120, 96, 70]);
    tri(x + 60, y + 100, x + 110, y + 18, x + 160, y + 100, [96, 78, 56]);
    circle(x + 128, y + 22, 12, [255, 240, 200]);
    rect(x + 14, y + 78, 26, 22, RED); tri(x + 12, y + 78, x + 27, y + 66, x + 42, y + 78, INK);
    rect(x + 52, y + 84, 22, 16, BLUE);
    for (let t = 0; t < 30; t++) set(x + 44 + t, y + 66 + ((t * 7) % 12), INK);
  } else if (n === 3) { // BepiColombo at Mercury
    rect(x, y, w, h, [10, 10, 26]);
    for (let i = 0; i < 20; i++) set(x + 6 + ((i * 53) % (w - 12)), y + 6 + ((i * 29) % 50), [255, 255, 255]);
    circle(x + 104, y + 56, 34, [178, 138, 96]);
    circle(x + 94, y + 44, 7, [140, 104, 70]); circle(x + 118, y + 66, 9, [140, 104, 70]); circle(x + 108, y + 78, 5, [140, 104, 70]);
    rect(x + 14, y + 44, 26, 12, GOLD); rect(x + 40, y + 40, 6, 20, [200, 200, 210]);
    tri(x + 46, y + 42, x + 58, y + 50, x + 46, y + 58, [200, 200, 210]);
  } else if (n === 4) { // Kyiv bridges over the Dnipro
    rect(x, y, w, h, [168, 196, 220]);
    rect(x, y + 66, w, 34, [70, 110, 160]);
    rect(x, y + 52, w, 10, [90, 90, 96]);
    for (let i = 0; i < 3; i++) rect(x + 20 + i * 48, y + 30, 8, 26, [90, 90, 96]);
    rect(x + 8, y + 20, 34, 32, [150, 150, 158]); rect(x + 118, y + 26, 30, 26, [150, 150, 158]);
    disc(x + 84, y + 40, 10, ORANGE); disc(x + 84, y + 40, 5, RED);
    for (let t = 0; t < 18; t++) set(x + 78 + t, y + 24 - (t % 3), GREY);
  } else { // ICJ scales of justice
    rect(x, y, w, h, [232, 226, 210]);
    rect(x + 76, y + 16, 8, 66, GOLD);
    rect(x + 52, y + 82, 56, 6, GOLD);
    hline(x + 44, y + 20, 72, GOLD, 4);
    tri(x + 44, y + 24, x + 66, y + 24, x + 55, y + 52, INK);
    tri(x + 94, y + 24, x + 116, y + 24, x + 105, y + 52, INK);
    rect(x + 40, y + 52, 30, 4, INK); rect(x + 90, y + 52, 30, 4, INK);
    rect(x + 68, y + 88, 24, 8, GOLD);
  }
}
for (let i = 0; i < 6; i++) {
  const x = 16 + i * (PW + PGAP);
  frame(x, PY, PW, PH, INK, 2);
  rect(x + 2, PY + 2, PW - 4, 18, INK);
  drawText(x + 8, PY + 7, panels[i].tag, 1, [255, 255, 255]);
  panelScene(x + 2, PY + 22, PW - 4, 96, panels[i].scene);
  drawText(x + 8, PY + 124, panels[i].title, 2, RED);
  drawText(x + 8, PY + 142, panels[i].sub, 2, INK);
}

// ================================================================ UTC TIMELINE
const TY = 440;
drawText(16, TY, 'THE DAY IN UTC', 2, INK);
hline(16, TY + 22, 992, INK, 2);
const ticks: [string, string][] = [
  ['00:09', 'PERU QUAKE'],
  ['01:53', 'RIYADH ALERT'],
  ['03:57', 'KYIV TOLL OUT'],
  ['10:39', 'HODEIDAH WARNING'],
  ['13:31', 'HODEIDAH STRIKES'],
  ['SAT', 'COP31 EXTRA DAY'],
];
for (let i = 0; i < ticks.length; i++) {
  const x = 40 + i * 168;
  vline(x, TY + 22, 10, RED, 3);
  disc(x, TY + 32, 4, RED);
  drawText(x - 18, TY + 40, ticks[i][0], 1, RED);
  drawText(x - 30, TY + 50, ticks[i][1], 1, INK);
}
hline(16, TY + 60, 992, INK, 1);

// ================================================================ 40 STORIES
const stories: string[] = [
  'COP31 OVERTIME, FOSSIL FUELS CUT',
  'RIYADH: 3 HOUTHI MISSILES DOWNED',
  'PERU M6.7 QUAKE, LIMA RESIDENTS FLEE',
  'BEPICOLOMBO ENTERS MERCURY ORBIT',
  'KYIV: 400 DRONES, 110 MISSILES, 8 DEAD',
  'RUSSIAN MISSILES LAND IN POLAND',
  'HODEIDAH PORT HIT, 6 WORKSHOPS DOWN',
  'S&P -3.7%, DOW IN CORRECTION',
  'NVIDIA -14%, ANTHROPIC -9%',
  'BITCOIN SLIPS BELOW $60,000',
  'TANKER HIT NEAR HORMUZ, FIRE ABOARD',
  'IRAN READIES 14-TANKER CONVOY',
  'MYANMAR REJECTS ICJ GENOCIDE RULING',
  'TRUMP DEFENDS PUTIN, XI TIES',
  'SHENZHEN: "NO NUCLEAR WAR" PLEDGE',
  'DENMARK FOILS PLOT TO KILL RAPPER',
  'GAZA: 1 KILLED IN DRONE STRIKE',
  'KRYVYI RIH: CHILD, RESCUER KILLED',
  'UNICEF: 114 CHILDREN KILLED IN 2026',
  'EU GIVES UKRAINE 1BN EUROS MORE AID',
  'JAPAN, INDIA DEEPEN DEFENCE TIES',
  'UK TO SEEK CLOSER EU TIES',
  'MAMDANI TO CLOSE RIKERS BY 2032',
  'JUDGE BLOCKS HOMELESS AID REVAMP',
  'TRUMP: BAN ON AI CENTRES ABROAD',
  'CANCER PILL: TUMOURS VANISH IN 1 IN 12',
  'VIRGINIA: FIRST CHILD MEASLES DEATH',
  'FRENCH POLICE JAILED OVER BEATING',
  'DEPARDIEU FACES NEW INVESTIGATION',
  'ANC FIGHTS TO HOLD S. AFRICA CITIES',
  "NEPAL'S NEW PM FACES INDIA TEST",
  'BANGLADESH PM BLAMES INDIA',
  'IRAQ ARRESTS 8 OIL OFFICIALS',
  'IRAQ RETAKES JURF AL-SAKHAR',
  'DENMARK-US-GREENLAND DEAL SEALED',
  '600 WOMEN KILLED IN S. AFRICA',
  '2 SALVADORANS KILLED IN HAITI',
  'US RELEASES MORE UFO FOOTAGE',
  'MAN JAILED IN SIKH LEADER PLOT',
  'US TEEN DENIES SHRINE ATTACK PLOT',
];
const SY = 520;
drawText(16, SY - 18, 'THE WORLD IN FORTY  -  EVERY STORY REPORTED SATURDAY 21 NOVEMBER 2026', 2, INK);
hline(16, SY - 2, 992, INK, 2);
for (let i = 0; i < 40; i++) {
  const col = i < 20 ? 0 : 1;
  const row = i % 20;
  const x = 16 + col * 504;
  const y = SY + 6 + row * 23;
  const num = String(i + 1).padStart(2, '0');
  drawText(x, y, num, 2, RED);
  drawText(x + 40, y, stories[i], 2, INK);
  if (row < 19) hline(x, y + 19, 488, LIGHT, 1);
}

// ================================================================ FOOTER
hline(16, 996, 992, INK, 2);
textCenter(0, 1004, W, 'SOURCES: REUTERS, AP, AFP, BBC, AL JAZEERA, USGS, ESA/JAXA, ICJ, NYSE', 1, GREY);
textCenter(0, 1014, W, 'DRAWN BY CODE - NO PHOTOGRAPHS - MAKE.FUN NEWS-IMAGE-20261121', 1, GREY);

// ================================================================ WRITE PNG
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
writeFileSync(join(outDir, 'entry.png'), encodePNG());
