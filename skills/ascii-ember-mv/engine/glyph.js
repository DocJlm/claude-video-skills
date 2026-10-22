// 字符画引擎：把一张灰度/通道“底片”按字符网格转成字形
// 底片通道：R = 亮度，G = 色类（0 灰白 / 128 余烬橙 / 255 logo 绿），B = 保留
export const RAMP = " .`'-:;~=+*ox%#@";
// 调色板：bg 底 / ink 字 / mid 中灰 / dim 暗 / accent 强调（火星） / accentHi 火星高光 / brand 汇聚后的品牌色
export const PALETTES = {
  ember:  { name: '余烬橙（默认）', bg: '#0b0907', ink: '#e9e2d6', mid: '#b9b0a2', dim: '#5a5248', accent: '#ff7a2f', accentHi: '#ffd2a1', brand: '#a6cf4f' },
  ice:    { name: '寒夜渔火', bg: '#04070c', ink: '#dce6ef', mid: '#93a3b5', dim: '#3a4757', accent: '#ffb35c', accentHi: '#ffe3b8', brand: '#9fd8ff' },
  neon:   { name: '霓虹青', bg: '#05060a', ink: '#e6f7ff', mid: '#9bb3c2', dim: '#3b4a55', accent: '#19e3ff', accentHi: '#b8f6ff', brand: '#ff3ea5' },
  gold:   { name: '鎏金', bg: '#0a0805', ink: '#f2e8d5', mid: '#bfae8e', dim: '#5c5240', accent: '#f2b23a', accentHi: '#ffe6a8', brand: '#ffffff' },
  sakura: { name: '樱粉', bg: '#0b0709', ink: '#f3e6ea', mid: '#c0a5ae', dim: '#5b4850', accent: '#ff6f9a', accentHi: '#ffd0de', brand: '#9be37a' },
};
export const PAL = { ...PALETTES.ember };
export function applyPalette(p) { Object.assign(PAL, typeof p === 'string' ? (PALETTES[p] || PALETTES.ember) : { ...(PALETTES[p?.base] || PALETTES.ember), ...(p || {}) }); }

export function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export const hash = (i, j, k = 0) => { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
export const ease = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
export const easeOut = t => 1 - Math.pow(1 - clamp(t), 3);

// 网格
export function makeGrid(W, H, cols, square = false) {
  const cw = W / cols, ch = square ? cw : cw * 2;
  const rows = Math.ceil(H / ch);
  const neg = document.createElement('canvas');
  neg.width = cols * 2; neg.height = rows * 2;
  return { W, H, cols, rows, cw, ch, neg, nctx: neg.getContext('2d', { willReadFrequently: true }) };
}

// 底片绘制坐标：传入 (ctx, sx, sy)，sx/sy 把屏幕像素映射到底片像素
export function paintNeg(g, fn) {
  const c = g.nctx;
  c.setTransform(1, 0, 0, 1, 0, 0);
  c.fillStyle = '#000'; c.fillRect(0, 0, g.neg.width, g.neg.height);
  c.setTransform(g.neg.width / g.W, 0, 0, g.neg.height / (g.rows * g.ch), 0, 0);
  fn(c);
  c.setTransform(1, 0, 0, 1, 0, 0);
}

// 底片 → 字形
export function drawGlyphs(ctx, g, opt = {}) {
  const { cols, rows, cw, ch } = g;
  const d = g.nctx.getImageData(0, 0, cols * 2, rows * 2).data;
  const W2 = cols * 2;
  const seed = opt.seed || 1, t = opt.t || 0;
  const fam = opt.cjk ? 'NSC' : 'JBMono', fs = opt.cjk ? cw * 0.92 : ch * 0.82;
  ctx.font = `500 ${fs}px ${fam}`;
  ctx.textBaseline = 'middle'; ctx.textAlign = 'center';
  const bold = opt.cjk ? `900 ${fs}px NSC` : `700 ${fs}px JBMono`, norm = ctx.font;
  const rowMax = opt.reveal == null ? rows : Math.floor(rows * opt.reveal);
  for (let j = 0; j < Math.min(rows, rowMax + 1); j++) for (let i = 0; i < cols; i++) {
    let r = 0, gsum = 0;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) {
      const p = ((j * 2 + dy) * W2 + i * 2 + dx) * 4; r += d[p]; gsum += d[p + 1];
    }
    let v = r / 4 / 255; const cls = gsum / 4;
    if (opt.levels) v = clamp((v - opt.levels[0]) / (opt.levels[1] - opt.levels[0]));
    if (v < (opt.thresh ?? 0.06)) continue;
    v = Math.pow(v, 1 / (opt.gamma || 1.25));
    const dither = (hash(i, j, seed) - .5) * 0.08;
    const k = clamp(Math.round((v + dither) * (RAMP.length - 1)), 1, RAMP.length - 1);
    let chr = RAMP[k];
    if (j === rowMax) chr = RAMP[1 + Math.floor(hash(i, j, seed + 7) * (RAMP.length - 1))];
    if (opt.glyphFn) chr = opt.glyphFn(i, j, v, chr) || chr;
    const col = cls > 190 ? PAL.brand : cls > 70 ? (v > .85 ? PAL.accentHi : PAL.accent) : (v > .7 ? PAL.ink : v > .35 ? PAL.mid : PAL.dim);
    ctx.font = v > .8 ? bold : norm;
    ctx.fillStyle = col;
    ctx.globalAlpha = clamp(0.25 + v) * (opt.alpha ?? 1);
    let px = (i + .5) * cw, py = (j + .5) * ch;
    if (opt.scramble > 0) { const sc = opt.scramble, h1 = hash(i, j, 91);
      if (h1 < sc) { chr = RAMP[1 + Math.floor(hash(i, j, seed + 13) * (RAMP.length - 1))]; py += (hash(i, 7, 3) * .7 + h1 * .3) * sc * sc * g.H * .35; ctx.fillStyle = h1 < sc * .3 ? PAL.accent : col; } }
    ctx.fillText(chr, px, py);
  }
  ctx.globalAlpha = 1;
}

// 余烬火星：小字形 + 辉光
export function spark(ctx, x, y, size, a, col = PAL.accent, chr = '*') {
  if (a <= 0.01) return;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, size * 3.2);
  gr.addColorStop(0, col); gr.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = a * 0.35; ctx.fillStyle = gr;
  ctx.beginPath(); ctx.arc(x, y, size * 3.2, 0, 7); ctx.fill();
  ctx.globalAlpha = a; ctx.fillStyle = PAL.accentHi;
  ctx.font = `700 ${size * 1.6}px JBMono`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(chr, x, y);
  ctx.globalAlpha = 1;
}
