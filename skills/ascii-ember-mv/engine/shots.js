// 镜头类型库：storyboard.json 的每个镜头 {type, t0, t1, ...参数} 由这里的同名函数绘制
// 设计坐标：横 1920×1080，竖 1080×1920。lt = 镜头内秒数，k = 镜头进度 0..1
import { S, PAL, T, clamp, ease, easeOut, hash, mulberry, lerp, smooth, pick, kickEnv, coverRect, typeBlock, accentFn, lyricLine, beatIdx, beatT, LYF } from './core.js';
import { makeGrid, paintNeg, drawGlyphs, spark } from './glyph.js';
import * as P from './particles.js';

// ================= 资源 =================
const IMG = {}, FR = {};
const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => { console.error('素材加载失败 ' + src); r(null); }; i.src = src; });
export async function loadAssets() {
  const A = S.sb.assets || {};
  await Promise.all(Object.entries(A).map(async ([name, a]) => {
    if (a.img || a.mask) IMG[name] = await load('/p/' + (a.img || a.mask));
    if (a.sheet) {
      const im = await load('/p/' + a.sheet); if (!im) return;
      const [cx, cy] = a.grid || [2, 2], w = im.width / cx, h = im.height / cy;
      FR[name] = [];
      for (let q = 0; q < cx * cy; q++) { const c = document.createElement('canvas'); c.width = w; c.height = h;
        c.getContext('2d').drawImage(im, (q % cx) * w, Math.floor(q / cx) * h, w, h, 0, 0, w, h); FR[name].push(c); }
    }
  }));
}
export function fr(name, i = 0) {
  if (FR[name]) return FR[name][((i | 0) % FR[name].length + FR[name].length) % FR[name].length];
  if (IMG[name]) return IMG[name];
  const fb = S.sb.assets?.[name]?.fallback; if (fb && fb !== name) return fr(fb, i);
  return null;
}
const cueIdx = (t, cues) => { let k = 0; cues.forEach((c, i) => { if (t >= c) k = i; }); return k; };

// ================= 字符画 =================
const grids = {};
function grid(cell = 9.6, square = false) {
  const cols = Math.round(S.W / (cell * S.U)), key = cols + (square ? 's' : '');
  return grids[key] || (grids[key] = makeGrid(S.W, S.H, cols, square));
}
const toLum = c => { c.globalCompositeOperation = 'multiply'; c.fillStyle = 'rgb(255,0,0)'; c.fillRect(0, 0, S.W, S.H); c.globalCompositeOperation = 'source-over'; };
function asciiImg(ctx, t, o, sh) {
  if (!o.img) { missing(ctx, o.name); return; }
  const U = S.U, g = grid(o.cell || 9.6), rg = o.region || pick([0, 0, 1920, 1080], [0, 520, 1080, 1060]), [rx, ry, rw, rh] = rg.map(v => v * U);
  const kick = kickEnv(t, sh.hot);
  paintNeg(g, c => {
    const [x, y, w, h] = coverRect(o.img, rw, rh, o.fx ?? .5, o.fy ?? .5, o.zoom || 1);
    c.save(); c.beginPath(); c.rect(rx, ry, rw, rh); c.clip(); c.drawImage(o.img, rx + x + (o.dx || 0) * U, ry + y, w, h); c.restore();
    toLum(c);
    const fe = (o.feather ?? (S.V ? 160 : 0)) * U;
    if (fe > 0) for (const [y0, y1] of [[ry, ry + fe], [ry + rh, ry + rh - fe]]) { const gr = c.createLinearGradient(0, y0, 0, y1); gr.addColorStop(0, 'rgba(0,0,0,1)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = gr; c.fillRect(rx, Math.min(y0, y1), rw, fe); }
    if (o.dim) { c.fillStyle = `rgba(0,0,0,${o.dim})`; c.fillRect(0, 0, S.W, S.H); }
    if (o.extra) o.extra(c, U);
  });
  const lv = o.levels || [.03, .7];
  drawGlyphs(ctx, g, { thresh: .08, seed: o.boil === false ? 3 : Math.floor(t * 15), levels: [lv[0], lv[1] * (1 - .22 * Math.min(1, kick))], gamma: o.gamma || 1.4, scramble: S.scr || 0 });
}
function missing(ctx, name) { monoText(ctx, `[缺素材: ${name}]`, pick(960, 540), pick(540, 900), 40, PAL.accent); }
const range = (v, k, d) => (Array.isArray(v) ? lerp(v[0], v[1], ease(k)) : (v ?? d));

// ================= 文字工具 =================
export function bigText(ctx, txt, x, y, size, col, w = 900) { const U = S.U; ctx.font = LYF() === 'KAI' ? `500 ${size * U}px KAI` : `${w} ${size * U}px NSC`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(txt, x * U, y * U); }
export function monoText(ctx, txt, x, y, size, col, align = 'center', w = 700) { const U = S.U; ctx.font = `${w} ${size * U}px JBMono`; ctx.textAlign = align; ctx.textBaseline = 'middle'; ctx.fillStyle = col; ctx.fillText(txt, x * U, y * U); }
function slam(ctx, lt, x, y, draw, k = .6, tau = .08) { const sc = 1 + k * Math.exp(-Math.max(0, lt) / tau), U = S.U; ctx.save(); ctx.translate(x * U, y * U); ctx.scale(sc, sc); draw(); ctx.restore(); }
export function cursorAt(ctx, t, x, y, size) { if (Math.floor(t / (S.BEAT / 2)) % 2) return; const U = S.U; ctx.fillStyle = PAL.accent; ctx.fillRect(x * U, (y - size * .5) * U, size * .45 * U, size * U); }
function dimLog(ctx, t, seed = 1, alpha = .25, speed = 60) {
  const U = S.U, lh = 22 * U, words = S.sb.logWords || ['build', 'ship', 'loop', 'merge', 'test'];
  ctx.font = `500 ${15 * U}px JBMono`; ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic'; ctx.fillStyle = PAL.dim;
  const rows = Math.ceil(S.H / lh) + 1, off = (t * speed * U) % lh, base = Math.floor(t * speed * U / lh); ctx.globalAlpha = alpha;
  for (let j = 0; j < rows; j++) { const n = base + j, r = mulberry(n * 7 + seed);
    ctx.fillText(`[${1000 + n * 37 % 9000}] ${words[Math.floor(r() * words.length)]} ${'#'.repeat(1 + Math.floor(r() * 18))}${'.'.repeat(Math.floor(r() * 30))} ok`, 40 * U + r() * 60 * U, S.H - (j * lh - off)); }
  ctx.globalAlpha = 1;
}
function drawImg(ctx, img, cx, cy, w, alpha = 1) { if (!img) return; const U = S.U, h = w * img.height / img.width; ctx.globalAlpha = alpha; ctx.drawImage(img, (cx - w / 2) * U, (cy - h / 2) * U, w * U, h * U); ctx.globalAlpha = 1; }
function risingSparks(ctx, t, t0, t1, seed = 5) {
  const up = clamp((t - t0) / (t1 - t0)); if (up <= 0) return; const U = S.U, r = mulberry(seed);
  for (let q = 0; q < 180; q++) { const x = r() * S.DW, y0 = S.DH * (.6 + r() * .4); spark(ctx, x * U, (y0 - up * up * S.DH * (.4 + r() * .6)) * U, (2 + r() * 4) * U, up, PAL.accent, '+*.'[q % 3]); }
}

// ================= 歌词层 =================
export const LY = {
  right: { h: { x: 1180, y: 190, size: 76, maxW: 640 }, v: { x: 80, y: 350, size: 76, maxW: 870 } },
  left: { h: { x: 120, y: 150, size: 76, maxW: 760 }, v: { x: 80, y: 350, size: 76, maxW: 870 } },
  top: { h: { x: 960, y: 130, size: 80, align: 'center', maxW: 1700 }, v: { x: 540, y: 350, size: 80, align: 'center', maxW: 880 } },
  mid: { h: { x: 960, y: 540, size: 110, align: 'center', maxW: 1600, valign: 'middle' }, v: { x: 540, y: 900, size: 96, align: 'center', maxW: 880, valign: 'middle' } },
  low: { h: { x: 960, y: 900, size: 84, align: 'center', maxW: 1700, valign: 'middle' }, v: { x: 540, y: 1420, size: 80, align: 'center', maxW: 880, valign: 'middle' } },
};
function curLine(t, sh, from) { let L = null; for (const x of S.lyrics) if (x.t0 != null && x.t0 >= (from ?? -1) && x.t0 < sh.t1 && t >= x.t0 - .05 && t < x.t1 + 1.2) L = x; return L; }
export function drawLyric(ctx, t, sh, def = 'top') {
  let spec = sh.lyric === undefined ? def : sh.lyric; if (spec === false || spec === 'none') return;
  if (typeof spec === 'string') spec = { pos: spec };
  const base = LY[spec.pos || def] || LY.top, sp = { ...pick(base.h, base.v), ...(pick(spec.h, spec.v) || {}) };
  if (spec.size) sp.size = spec.size;
  const L = curLine(t, sh, spec.from != null ? T(spec.from) : undefined); if (!L) return;
  let txt = L.text.replace(/\s*\((.+?)\)\s*/g, ' $1 ').replace(/——|~/g, '').trim(); if (spec.upper) txt = txt.toUpperCase();
  typeBlock(ctx, txt, { ...sp, t, times: L.t, accent: accentFn(txt), cursor: true, color: spec.color });
}

// ================= 3D =================
function targetDraw(name, opt = {}) {
  const a = S.sb.assets?.[name] || {};
  if (a.text) return (c, w, h) => { c.fillStyle = '#fff'; c.font = a.font || (/[一-鿿]/.test(a.text) ? (LYF() === 'KAI' ? '500 300px KAI' : '900 300px NSC') : '700 300px JBMono'); c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(a.text, w / 2, h / 2); };
  const src = fr(name, opt.frame || a.frame || 0);
  return (c, w, h) => { if (!src) return; c.filter = a.mask ? 'none' : (opt.filter || 'contrast(1.5) brightness(1.5)');
    const s = (a.mask ? Math.min : Math.max)(w / src.width, h / src.height), iw = src.width * s, ih = src.height * s; c.drawImage(src, (w - iw) / 2, (h - ih) / 2, iw, ih); };
}
const offset = (pos, dx, dy, dz = 0) => { const p = pos.slice(); for (let i = 0; i < p.length; i += 3) { p[i] += dx; p[i + 1] += dy; p[i + 2] += dz; } return p; };
function samplePts(name, N, worldW, opt = {}) {
  const a = S.sb.assets?.[name] || {}, isText = !!a.text;
  const [w, h] = isText ? [1200, 400] : a.mask ? [400, 400] : [480, 270];
  return P.sampleDraw(targetDraw(name, opt), N, w, h, worldW, opt.depth ?? (a.mask || isText ? .5 : 1.2), opt.seed || 7);
}
const SETS = {};
function setFor(key, build) { return SETS[key] || (SETS[key] = build()); }
function render3D(ctx, items, cam, t, alpha = 1) { const cv = P.renderSets(items, cam, t); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = alpha; ctx.drawImage(cv, 0, 0, S.W, S.H); ctx.restore(); }
const camV = c => (S.V ? { ...c, pos: [c.pos[0], c.pos[1], c.pos[2] * (c.vz || 1.55)], fov: c.vfov || Math.min(75, (c.fov || 50) + 14) } : c);
function brandPair(key, start, end, seed, order) {   // 同一组粒子的“火星色”和“品牌色”两套，用于汇聚锁定时交叉变色
  const N = end.length / 3;
  return { o: P.makeSet(key + 'O', start, end, null, seed, .5, order), g: P.makeSet(key + 'G', start, end, new Uint8Array(N).fill(2), seed, .5, order) };
}
function pairItems(pair, prog, gm, o = {}) { return [{ ...o, set: pair.o, prog, alpha: (1 - gm) * (o.alpha ?? 1) }, { ...o, set: pair.g, prog, alpha: gm * (o.alpha ?? 1) }].filter(x => x.alpha > .005); }
const N_ = 14000;

// ================= 镜头类型 =================
export const TYPES = {
  // 片名：第一帧就是片名；歌词以聊天记录的形式逐条打出
  title(ctx, t, lt, k, sh) {
    dimLog(ctx, t, 3, .14, 30);
    const tx = sh.title || S.sb.title || '';
    if (LYF() === 'KAI') bigText(ctx, tx, pick(960, 540), pick(330, 640), pick(160, 150), PAL.ink); else monoText(ctx, tx, pick(960, 540), pick(330, 640), pick(170, 150), PAL.ink);
    cursorAt(ctx, t, pick(960, 540) + pick(tx.length * 85 + 20, tx.length * 75 + 20), pick(330, 640), pick(150, 130));
    if (sh.subtitle) monoText(ctx, sh.subtitle, pick(960, 540), pick(440, 750), 30, PAL.dim, 'center', 500);
    if (sh.chat !== false) {
      const Ls = S.lyrics.filter(x => x.t0 != null && x.t0 < sh.t1 && x.t0 >= sh.t0 - .3), names = sh.chatNames || ['@you'];
      Ls.forEach((L, i) => { if (t < L.t0 - .05) return; const y = pick(600, 960) + i * pick(90, 150);
        monoText(ctx, names[i % names.length], pick(360, 80), y - pick(34, 46), pick(22, 26), PAL.dim, 'left', 500);
        typeBlock(ctx, L.text, { x: pick(360, 80), y: y - pick(16, 22), size: pick(44, 46), maxW: pick(1300, 880), t, times: L.t, accent: () => false, cursor: i === Ls.length - 1 || t < Ls[i + 1].t0 }); });
    } else drawLyric(ctx, t, sh, 'low');
  },
  // 字符画人物/场景：asset 可以是单张图，也可以是四格动作帧
  figure(ctx, t, lt, k, sh) {
    let i = sh.frame || 0; const seq = sh.seq || [0, 1, 2, 3], mode = sh.frames || 'beat';
    if (mode === 'beat') i = seq[Math.floor(lt / S.BEAT) % seq.length];
    else if (mode === 'eighth') i = seq[Math.floor(lt / (S.BEAT / 2)) % seq.length];
    else if (mode === 'once') i = seq[Math.min(seq.length - 1, Math.floor(lt / S.BEAT))];
    else if (Array.isArray(mode)) i = seq[Math.min(seq.length - 1, cueIdx(t, [sh.t0, ...mode.map(T)]))];
    asciiImg(ctx, t, { img: fr(sh.asset, i), name: sh.asset, zoom: range(sh.zoom, k, 1.04), fx: sh.fx, fy: sh.fy, dx: range(sh.dx, k, 0), cell: sh.cell || 8.5, levels: sh.levels, gamma: sh.gamma, dim: sh.dim }, sh);
    if (sh.rise) risingSparks(ctx, t, T(sh.rise), sh.t1);
    drawLyric(ctx, t, sh, 'top');
  },
  // 纯歌词大字（暗色日志滚动作底）
  words(ctx, t, lt, k, sh) { if (sh.bg !== 'none') dimLog(ctx, t, 5, .28); drawLyric(ctx, t, sh, 'mid'); },
  // 对比：a 被划掉，b 砸进来
  contrast(ctx, t, lt, k, sh) {
    dimLog(ctx, t, 5, .3); const tz = T(sh.at), s = pick(210, 170), y1 = pick(400, 760), y2 = pick(700, 1060), U = S.U;
    bigText(ctx, sh.a, pick(960, 540), y1, s, t > tz ? PAL.dim : PAL.ink);
    if (t > tz) { const w = clamp((t - tz) / .12); ctx.fillStyle = PAL.accent; ctx.fillRect((pick(960, 540) - s * sh.a.length / 2) * U, (y1 - 6) * U, s * sh.a.length * w * U, 16 * U);
      slam(ctx, t - tz, pick(960, 540), y2, () => bigText(ctx, sh.b, 0, 0, s, PAL.accent), .4); }
  },
  // 静默：画面压暗，只剩一个字 + 光标
  hold(ctx, t, lt, k, sh) {
    if (sh.asset) asciiImg(ctx, t, { img: fr(sh.asset, sh.frame || 0), name: sh.asset, zoom: 1.12 + .3 * k, cell: 8.5, dim: .55, boil: false }, { hot: 0 });
    const s = pick(330, 300); bigText(ctx, sh.char || '', pick(960, 540) - s * .3, pick(540, 900), s, PAL.ink); cursorAt(ctx, t, pick(960, 540) + s * .28, pick(540, 900), s * .9);
  },
  // 人物（或任意画面）炸成三维火星
  burst(ctx, t, lt, k, sh) {
    const set = setFor(sh.id, () => { const p = samplePts(sh.asset, N_, 17, { frame: sh.frame || 0, seed: 11 }); return P.makeSet(sh.id, p.pos, p.pos, null, 21); });
    render3D(ctx, [{ set, prog: 0, explode: 9 * (1 - Math.exp(-lt * 2.6)), swirl: 0, drift: .05, size: 1.6 }], camV({ pos: [0, 0, 12 - lt * 6], look: [0, 0, -10], fov: 55, roll: .05 * Math.sin(lt * 9) }), t);
    if (sh.text) { const sx = (hash(Math.floor(lt * 30), 1) - .5) * 30 * Math.exp(-lt / .2), sy = (hash(Math.floor(lt * 30), 2) - .5) * 30 * Math.exp(-lt / .2);
      slam(ctx, lt, pick(960, 540) + sx, pick(540, 900) + sy, () => bigText(ctx, sh.text, 0, 0, pick(300, 250), PAL.accent), .5); }
    drawLyric(ctx, t, sh, sh.text ? 'low' : 'mid');
  },
  // 火星隧道：镜头在火星流里穿梭，速度随底鼓起伏
  tunnel(ctx, t, lt, k, sh) {
    const set = setFor('tube', () => P.makeSet('tube', P.tube(16000, 3.2, 90, 41), P.tube(16000, 3.2, 90, 41), null, 42, .8));
    const z = -lt * ((sh.speed || 14) + kickEnv(t, sh.hot) * 10), roll = sh.roll ?? .25;
    render3D(ctx, [{ set, prog: 0, swirl: 0, drift: .08, size: 1.1 }], camV({ pos: [Math.sin(lt * .7) * .6, Math.cos(lt * .5) * .4, z % 80 + 5], look: [Math.sin(lt * .7 + .3) * .3, 0, z % 80 - 10], fov: 70, vfov: 80, vz: 1, roll: Math.sin(lt * .6) * roll }), t);
    drawLyric(ctx, t, sh, 'mid');
  },
  // 三维人群：四格动作帧变成火星，每拍换一个姿态
  crowd(ctx, t, lt, k, sh) {
    const rows = sh.rows || 1;
    const sets = setFor(sh.asset + ':crowd', () => {
      const pos = [0, 1, 2, 3].map(i => offset(samplePts(sh.asset, N_, 17, { frame: i, seed: 40 + i, depth: 1.4 }).pos, 0, -1.2));
      const mk = (r) => [0, 1, 2, 3].map(i => P.makeSet(`${sh.asset}c${r}_${i}`, offset(pos[(i + r) % 4], r * 1.5, r * .9, -r * 7), offset(pos[(i + r + 1) % 4], r * 1.5, r * .9, -r * 7), null, 44 + r, .7));
      return [mk(0), mk(1), mk(2)];
    });
    const n = beatIdx(t), pr = easeOut((t - beatT(n)) / .2), q = ((n % 4) + 4) % 4, kick = kickEnv(t, sh.hot);
    const items = sets.slice(0, rows).map((row, r) => ({ set: row[q], prog: pr, stagger: .3, swirl: .4, drift: .03, size: 1 + .3 * kick + r * .1, alpha: 1 - r * .2 }));
    const c = sh.cam || {}; render3D(ctx, items, camV({ pos: [Math.sin(t * (c.orbit ?? .3)) * (c.swing ?? 2), c.y ?? 1.2, c.z ?? 11], look: [0, c.look ?? -1.4, rows > 1 ? -4 : 0], fov: 50, roll: c.roll || 0 }), t);
    drawLyric(ctx, t, sh, 'top');
  },
  // 签名动作：散落的火星汇聚成一个标志物（图片遮罩 / 文字 / 动作帧），锁定时由火星色变成品牌色
  converge(ctx, t, lt, k, sh) {
    const lock = sh.at != null ? T(sh.at) : sh.t1 - .6, W = sh.size || 6.2, yUp = sh.lift || 0;
    const pair = setFor(sh.id, () => {
      const tg = samplePts(sh.target, N_, W, { seed: 31 }); const end = offset(tg.pos, 0, yUp);
      let start; if (!sh.from || sh.from === 'scatter') start = P.scatter(N_, 8, 5, 6, 32); else if (sh.from === 'tube') start = P.tube(N_, 4, 40, 33);
      else start = offset(samplePts(sh.from, N_, 17, { frame: sh.fromFrame || 1, seed: 34, depth: 1.4 }).pos, 0, -1.2);
      return brandPair(sh.id, start, end, 35, new Float32Array(N_).map((_, i) => hash(i, 3)));
    });
    const prog = smooth(sh.t0, lock, t), gm = sh.brand === false ? 0 : clamp((t - lock) / .15), pulse = t > lock ? Math.exp(-(t - lock) / .25) : 0;
    const items = pairItems(pair, prog, gm, { stagger: sh.from && sh.from !== 'scatter' ? .7 : .45, swirl: 1.5 * (1 - prog), drift: t > lock ? .025 : .05, size: .85 + pulse * .5 + .2 * kickEnv(t, sh.hot), haloSize: 2.4, alpha: .85 });
    if (sh.from && sh.from !== 'scatter' && sh.from !== 'tube') items.unshift(...setFor(sh.id + ':ground', () => [P.makeSet(sh.id + 'gr', pair.o.halo.geometry.attributes.aStart.array, pair.o.halo.geometry.attributes.aStart.array, null, 36)]).map(set => ({ set, prog: 0, swirl: 0, drift: .03, size: .9, alpha: .6 })));
    const cz = sh.camZ || [15, 8.2];
    render3D(ctx, items, camV({ pos: [Math.sin(lt * .4) * 1.2 * (1 - prog), 0, lerp(cz[0], cz[1], ease(clamp((t - sh.t0) / (lock - sh.t0))))], look: [0, pick(sh.lookY ?? -1.5, sh.lookYV ?? -3), 0], fov: pick(48, 62), vfov: 62, roll: .08 * (1 - prog) }), t);
    if (t >= lock && sh.reveal) { const R = sh.reveal; slam(ctx, t - lock, pick(960, 540), pick(R.y ?? 760, R.yv ?? 1110), () => drawImg(ctx, fr(R.asset), 0, 0, pick(R.width || 900, R.widthV || 820)), .25, .1); }
    if (t >= lock && sh.caption) { const L = sh.caption.lyric ? lyricLine(sh.caption.lyric) : null, txt = L ? L.text : sh.caption.text;
      typeBlock(ctx, txt, { x: pick(960, 540), y: pick(sh.caption.y ?? 850, sh.caption.yv ?? 1180), size: pick(58, 60), align: 'center', maxW: pick(1600, 880), t, times: L ? L.t : [...txt].map((_, q) => lock + .1 + q * .06), accent: () => false, cursor: true }); }
    if (!sh.caption && !sh.reveal) drawLyric(ctx, t, sh, 'low');
  },
  // 火星拼成一个词
  spell(ctx, t, lt, k, sh) {
    const name = sh.id + ':txt'; S.sb.assets[name] = { text: sh.text, font: sh.font };
    const set = setFor(sh.id, () => P.makeSet(sh.id, P.tube(N_, 4, 40, 111), samplePts(name, N_, sh.size || 10, { seed: 112 }).pos, null, 113));
    const lock = sh.at != null ? T(sh.at) : sh.t0 + 1, prog = smooth(sh.t0, lock, t), pulse = t > lock ? Math.exp(-(t - lock) / .3) : 0;
    render3D(ctx, [{ set, prog, stagger: .55, swirl: 1.3 * (1 - prog), drift: .03, size: 1 + pulse * .6 + .3 * kickEnv(t, sh.hot) }], camV({ pos: [Math.sin(lt * .5) * 1.5, 0, 10 + 3 * (1 - prog)], look: [0, 0, 0], fov: 50, vz: 2.2 }), t);
    drawLyric(ctx, t, sh, 'low');
  },
  // 从底部一层层垒起一个标志物，完成时变品牌色
  stack(ctx, t, lt, k, sh) {
    const done = sh.at != null ? T(sh.at) : sh.t1 - .8;
    const pair = setFor(sh.id, () => { const tg = samplePts(sh.target, N_, sh.size || 7, { seed: 81 }); let lo = 1e9, hi = -1e9;
      for (let i = 1; i < tg.pos.length; i += 3) { lo = Math.min(lo, tg.pos[i]); hi = Math.max(hi, tg.pos[i]); }
      const ord = new Float32Array(N_).map((_, i) => clamp((tg.pos[i * 3 + 1] - lo) / (hi - lo) * .92 + hash(i, 9) * .08));
      return brandPair(sh.id, offset(tg.pos, 0, 11), tg.pos, 82, ord); });
    const prog = clamp((t - sh.t0) / (done - sh.t0)), gm = clamp((t - done) / .2), pulse = t > done ? Math.exp(-(t - done) / .25) : 0;
    render3D(ctx, pairItems(pair, prog, gm, { stagger: .85, swirl: .05, drift: .015, size: .85 + pulse * .5, haloSize: 2.4 }), camV({ pos: [Math.sin(t * .4) * 2.5, 1, 13], look: [0, pick(-.8, -1.6), 0], fov: 50 }), t);
    if (sh.bar !== false) { const pct = Math.min(100, Math.floor(100 * prog)); monoText(ctx, `${sh.label || 'building'} ${'█'.repeat(Math.floor(pct / 5))}${'░'.repeat(20 - Math.floor(pct / 5))} ${pct}%`, pick(960, 540), pick(880, 1400), pick(30, 28), pct === 100 ? PAL.brand : PAL.dim, 'center', 500); }
    drawLyric(ctx, t, sh, 'top');
  },
  // 推进一颗火星，发现它由一串词组成（词表随主题）
  zoomSpark(ctx, t, lt, k, sh) {
    const U = S.U, cx = pick(960, 540), cy = pick(560, 900), z = Math.pow(60, ease(clamp(lt / 1.6)));
    if (z < 40) { const r = mulberry(17); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let i = 1; i < 260; i++) { const x = (r() - .5) * S.DW * 1.2, y = (r() - .5) * S.DH * 1.2, sx = cx + x * z, sy = cy + y * z;
        if (sx < -100 || sx > S.DW + 100 || sy < -100 || sy > S.DH + 100) continue;
        ctx.font = `700 ${16 * z * U}px JBMono`; ctx.fillStyle = PAL.accent; ctx.globalAlpha = clamp(1.4 - z / 30); ctx.fillText(sh.glyph || '*', sx * U, sy * U); }
      ctx.globalAlpha = 1; }
    const g = grid(30, true), sc = clamp(z / 60);
    paintNeg(g, c => { c.fillStyle = 'rgb(255,128,0)'; c.font = `700 ${pick(1300, 1150) * sc * U}px JBMono`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(sh.glyph || '*', cx * U, (cy + pick(140, 120) * sc) * U); });
    const all = (sh.words || ['你']).join('·') + '·'; let n = Math.floor(lt * 6);
    if (sc > .1) drawGlyphs(ctx, g, { cjk: true, thresh: .3, seed: 2, glyphFn: () => all[(n++) % all.length], scramble: S.scr || 0 });
    drawLyric(ctx, t, sh, 'left');
  },
  // 关键词墙 + 一道热浪扫过
  wordWave(ctx, t, lt, k, sh) {
    const U = S.U, W = sh.words || ['火星'], cell = pick(96, 90), cols = Math.ceil(S.DW / cell) + 1, rows = Math.ceil(S.DH / (cell * .62)), front = lerp(-.2, 1.3, ease(k)) * S.DW, kick = kickEnv(t, sh.hot);
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) { const x = i * cell + (j % 2) * cell / 2, y = j * cell * .62 + 30, d = x - front + Math.sin(y * .01 + t * 3) * 80, heat = Math.exp(-(d * d) / 39200) + (d < 0 ? .25 + kick * .3 : 0);
      ctx.font = `${heat > .5 ? 900 : 500} ${cell * .3 * (1 + heat * .25) * U}px NSC`; ctx.fillStyle = heat > .6 ? PAL.accent : heat > .2 ? PAL.mid : PAL.dim; ctx.globalAlpha = .35 + .65 * clamp(heat);
      ctx.fillText(W[(i * 7 + j * 3) % W.length], x * U, (y - heat * 18) * U); }
    ctx.globalAlpha = 1; ctx.fillStyle = PAL.bg; ctx.globalAlpha = .78; ctx.fillRect(0, pick(380, 800) * U, S.W, pick(300, 330) * U); ctx.globalAlpha = 1;
    drawLyric(ctx, t, sh, 'mid');
  },
  // 信息刷屏：聊天 / 弹幕 / 日志，每个八分音符进一条
  feed(ctx, t, lt, k, sh) {
    const U = S.U, items = sh.items || [['@you', '...']], n = Math.floor(lt / (S.BEAT / 2)) + 1, lh = pick(70, 96);
    for (let i = 0; i < n; i++) { const [who, msg] = items[i % items.length], y = pick(980, 1540) - (n - 1 - i) * lh; if (y < pick(80, 520)) continue;
      ctx.globalAlpha = i === n - 1 ? 1 : .55; monoText(ctx, who, pick(140, 80), y, pick(24, 28), i % 3 === 0 ? PAL.accent : PAL.dim, 'left', 500);
      ctx.font = `500 ${pick(34, 36) * U}px NSC`; ctx.fillStyle = PAL.ink; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillText(msg, pick(340, 80) * U, (y + pick(0, 42)) * U); }
    ctx.globalAlpha = 1; drawLyric(ctx, t, sh, { pos: 'top', h: { x: 1840, y: 150, align: 'right', maxW: 760, size: 72 } });
  },
  // 终端代码逐行打出 + 计数
  code(ctx, t, lt, k, sh) {
    const x0 = pick(360, 80), y0 = pick(300, 520), lh = pick(60, 70), n = Math.floor(lt / (S.BEAT / 2)), lines = sh.lines || [];
    lines.forEach((l, i) => { if (i * 2 > n) return; monoText(ctx, l.slice(0, Math.min(l.length, (n - i * 2) * 6 + 6)), x0, y0 + i * lh, pick(52, 40), i === sh.hi ? PAL.accent : PAL.ink, 'left', 500); });
    if (sh.counter) monoText(ctx, sh.counter.replace('{n}', Math.max(0, Math.floor((lt - 1.5) / S.BEAT))), pick(960, 540), pick(860, 1320), pick(90, 80), PAL.accent);
    drawLyric(ctx, t, sh, { pos: 'low', h: { y: 980, size: 56 }, v: { y: 1460, size: 56 } });
  },
  // 符号点亮：暗字符画出标志物（白底遮罩图），到点亮起品牌色
  lightUp(ctx, t, lt, k, sh) {
    const on = clamp((t - T(sh.at)) / .06), g = grid(10), U = S.U, src = fr(sh.target), s = pick(sh.width || 620, sh.widthV || 760), cx = pick(960, 540), cy = pick(430, 820);
    if (src && !src._tint) { const c = document.createElement('canvas'); c.width = src.width; c.height = src.height; const x = c.getContext('2d'); x.drawImage(src, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = 'rgb(255,255,0)'; x.fillRect(0, 0, c.width, c.height); src._tint = c; }
    paintNeg(g, c => { if (!src) return; const sc = s / Math.max(src.width, src.height), w = src.width * sc * U, h = src.height * sc * U, x = cx * U - w / 2, y = cy * U - h / 2;
      c.globalAlpha = .4; c.drawImage(src, x, y, w, h); c.globalAlpha = 1; toLum(c);
      if (on > 0) { c.globalAlpha = on; c.drawImage(src._tint, x, y, w, h); c.globalAlpha = 1; } });
    drawGlyphs(ctx, g, { thresh: .05, seed: Math.floor(t * 15), scramble: S.scr || 0 });
    drawLyric(ctx, t, sh, 'low');
  },
  // 一拍一切的人物蒙太奇
  montage(ctx, t, lt, k, sh) {
    const n = Math.floor(lt / S.BEAT), [a, i] = (sh.items || [[sh.asset, 0]])[n % (sh.items || [1]).length];
    asciiImg(ctx, t, { img: fr(a, i), name: a, zoom: 1.12 - .08 * (lt % S.BEAT) / S.BEAT, cell: 8.5, levels: [.03, .75], dim: sh.dim }, sh);
    if (sh.words) { const w = sh.words[Math.min(sh.words.length - 1, Math.floor(k * sh.words.length))], tw = sh.t0 + Math.floor(k * sh.words.length) * (sh.t1 - sh.t0) / sh.words.length;
      slam(ctx, t - tw, pick(960, 540), pick(540, 900), () => monoText(ctx, w, 0, 0, pick(170, 110), PAL.ink), .5, .06); }
    else drawLyric(ctx, t, sh, 'mid');
  },
  // 大字砸入（如 JOIN US!）
  slam(ctx, t, lt, k, sh) {
    if (sh.bg !== 'none') dimLog(ctx, t, 8, .2, 300);
    const tz = sh.at != null ? T(sh.at) : sh.t0; if (t < tz) { drawLyric(ctx, t, sh, 'mid'); return; }
    slam(ctx, t - tz, pick(960, 540), pick(540, 900), () => (sh.font === 'sans' || sh.font === 'kai' ? bigText(ctx, sh.text, 0, 0, pick(240, 170), PAL.accent) : monoText(ctx, sh.text, 0, 0, pick(260, 160), PAL.accent)), .6);
  },
  // 光芒：整屏字符被点亮
  glow(ctx, t, lt, k, sh) {
    const g = grid(9), w = easeOut(clamp(lt / .35)) * (1 - .6 * clamp((lt - 1.5) / 1.6));
    paintNeg(g, c => { const gr = c.createRadialGradient(S.W / 2, S.H / 2, 0, S.W / 2, S.H / 2, S.W * .9 * w + 1); gr.addColorStop(0, 'rgb(255,128,0)'); gr.addColorStop(.6, 'rgb(180,128,0)'); gr.addColorStop(1, 'rgb(0,0,0)'); c.fillStyle = gr; c.fillRect(0, 0, S.W, S.H); });
    drawGlyphs(ctx, g, { thresh: .05, seed: Math.floor(t * 15) });
    if (sh.text) slam(ctx, lt, pick(960, 540), pick(540, 900), () => bigText(ctx, sh.text, 0, 0, pick(300, 260), PAL.bg), .5);
    risingSparks(ctx, t, sh.t1 - .7, sh.t1, 6);
  },
  // 片尾：火星汇成标志物 → 真实 logo 图 → 标语逐字打出
  endCard(ctx, t, lt, k, sh) {
    const fade = sh.target ? clamp((lt - 1.3) / .4) : 1;
    if (sh.target && fade < 1) { const pair = setFor(sh.id, () => brandPair(sh.id, P.scatter(N_, 6, 4, 4, 121), samplePts(sh.target, N_, sh.size || 6.2, { seed: 122 }).pos, 123));
      const prog = smooth(sh.t0, sh.t0 + 1.3, t);
      render3D(ctx, pairItems(pair, prog, clamp((lt - 1.1) / .2), { stagger: .45, swirl: 1.4 * (1 - prog), drift: .02, size: 1.1, haloSize: 2.6 }), camV({ pos: [0, 0, 11], look: [pick(sh.lookX ?? 0, 0), pick(-1, -2.9), 0], fov: 50, vfov: 70, vz: 1.6 }), t, 1 - fade); }
    if (sh.logo) drawImg(ctx, fr(sh.logo), pick(960, 515), pick(420, 840), pick(sh.width || 1400, sh.widthV || 840), fade);
    else if (sh.text) { ctx.globalAlpha = fade; bigText(ctx, sh.text, pick(960, 540), pick(420, 840), pick(150, 130), PAL.ink); ctx.globalAlpha = 1; }
    const L = sh.tagline ? lyricLine(sh.tagline) : null, txt = L ? L.text : sh.taglineText;
    if (txt) typeBlock(ctx, txt, { x: pick(960, 540), y: pick(640, 1080), size: pick(64, 66), align: 'center', maxW: 1700, t, times: L ? L.t : [...txt].map((_, q) => sh.t0 + 1.8 + q * .08), accent: () => false, cursor: 'solid', color: PAL.ink });
  },
  // 鸣谢页：逐字时间来自 tools/typing_sfx.py 生成的时间表（与打字声同步）
  credits(ctx, t, lt, k, sh) {
    const U = S.U, lines = sh.lines || [], CS = S.credits, few = lines.length <= 6; let y = pick(few ? 280 : 170, few ? 560 : 400); const x0 = pick(few ? 640 : 560, 140);
    dimLog(ctx, t, 21, .08, 20); let lastX = x0 + 30, lastY = y, done = true;
    lines.forEach(([kind, a, b], i) => {
      const full = a + (b || ''), times = CS ? CS.lines[i] : [...full].map((_, q) => .3 + i * .5 + q * .06), n = times.filter(x => x <= lt).length;
      if (n < times.length) done = false; if (!n) return;
      if (kind === 'title') { slam(ctx, lt - times[0], pick(960, 540), y + 40, () => bigText(ctx, a, 0, 0, pick(96, 110), PAL.accent), .3); y += pick(150, 190);
        ctx.fillStyle = PAL.dim; ctx.fillRect((pick(960, 540) - 260) * U, (y - 60) * U, 520 * U * clamp((lt - times[0]) / .3), 2 * U); return; }
      if (kind === 'role') { y += pick(26, 36); monoText(ctx, a.slice(0, n), x0, y, pick(34, 40), PAL.dim, 'left', 500); lastX = x0 + a.slice(0, n).length * pick(34, 40) * .6; lastY = y; y += pick(58, 72); return; }
      ctx.font = `900 ${pick(52, 60) * U}px NSC`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = PAL.ink;
      const s1 = a.slice(0, n); ctx.fillText(s1, (x0 + 30) * U, y * U); let w = ctx.measureText(s1).width / U;
      if (b && n > a.length) { ctx.font = `500 ${pick(34, 38) * U}px NSC`; ctx.fillStyle = PAL.mid; const s2 = b.slice(0, n - a.length); ctx.fillText(s2, (x0 + 30 + w + 8) * U, y * U); w += 8 + ctx.measureText(s2).width / U; }
      if (sh.tag && n >= times.length && lt > times[times.length - 1] + .12) monoText(ctx, sh.tag, x0 + 30 + w + 24, y + 2, pick(24, 26), PAL.brand, 'left', 500);
      lastX = x0 + 30 + w + 6; lastY = y; y += pick(76, 88);
    });
    if (done) cursorAt(ctx, t, x0 + 30, y - 20, pick(56, 60)); else { ctx.fillStyle = PAL.accent; ctx.fillRect(lastX * U, (lastY - pick(26, 30)) * U, pick(24, 27) * U, pick(52, 60) * U); }
  },
};
export const HOT = { tunnel: 1, crowd: 1, converge: 1, spell: 1, stack: .9, burst: 1, montage: .9, slam: .8, glow: .6, words: .6, figure: .45, wordWave: .6, feed: .5, zoomSpark: .5, code: .3, title: .2, lightUp: .5, contrast: .5, endCard: .3, hold: 0, credits: 0 };
