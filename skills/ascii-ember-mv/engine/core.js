// 核心：项目数据、语义时间、鼓点包络、版式、歌词排版、HUD
import { PAL, applyPalette, clamp, ease, easeOut, hash, mulberry } from './glyph.js';
export { PAL, clamp, ease, easeOut, hash, mulberry };

export const S = {};   // 运行时：W H V U DW DH safe  tempo grid lyrics sections sb(storyboard) kicks snares
export const lerp = (a, b, k) => a + (b - a) * k;
export const smooth = (a, b, t) => { const k = clamp((t - a) / (b - a)); return k * k * (3 - 2 * k); };
export const pick = (h, v) => (S.V ? v : h);

// ---------- 读取项目 ----------
export async function loadProject() {
  const j = u => fetch(u).then(r => { if (!r.ok) throw new Error('缺少 ' + u); return r.json(); });
  S.tempo = await j('/p/analysis/tempo.json');
  const g = await j('/p/analysis/grid.json');
  S.lyrics = await j('/p/analysis/lyrics.json');
  S.sb = await j('/p/storyboard.json');
  applyPalette(S.sb.palette || 'ember');
  S.BEAT = S.tempo.beat; S.BAR = S.tempo.bar; S.BAR0 = S.tempo.bar0;
  S.kicks = []; S.snares = [];
  g.e8.forEach((t, i) => { if (g.kick[i] > .45) S.kicks.push([t, Math.min(1.3, g.kick[i])]); if (g.snare[i] > .7) S.snares.push([t, Math.min(1.3, g.snare[i])]); });
  S.accents = S.sb.accents || [];
}

// ---------- 语义时间 ----------
// 数字（秒）| "bar:12" | "bar:12+2"（拍，可小数/负数）| "beat:96" | "lyric:且将寒江#3"（该句第 4 个字）| "lyric:且将寒江@2#0"（第 2 次出现）| "end"
// 任一写法后都可再接 "~0.3" / "~-0.1" 做秒级微调
export function T(ref) {
  if (typeof ref === 'number') return ref;
  if (ref == null) return 0;
  let s = String(ref).trim(), adj = 0;
  const m0 = s.match(/^(.*)~(-?[\d.]+)$/); if (m0) { s = m0[1]; adj = +m0[2]; }
  if (s === 'end') return S.tempo.duration + adj;
  let m = s.match(/^bar:(-?\d+)([+-][\d.]+)?$/);
  if (m) return beatT((S.tempo.phase || 0) + (+m[1]) * 4 + (m[2] ? +m[2] : 0)) + adj;
  m = s.match(/^beat:(-?[\d.]+)$/); if (m) return beatT(+m[1]) + adj;
  m = s.match(/^lyric:(.+?)(?:@(\d+))?(?:#(\d+))?$/);
  if (m) { const L = lyricLine(m[1], +(m[2] || 1)); if (!L) throw new Error('找不到歌词：' + m[1]); const k = Math.min(L.t.length - 1, +(m[3] || 0)); return L.t[k] + adj; }
  if (!isNaN(+s)) return +s + adj;
  throw new Error('看不懂的时间：' + ref);
}
export function lyricLine(prefix, nth = 1) { let c = 0; for (const L of S.lyrics) if (L.text.replace(/\s/g, '').startsWith(prefix.replace(/\s/g, '')) && ++c === nth) return L; return null; }
// 拍点：固定网格，或变速歌的真实拍点表（可小数，线性插值）
export function beatT(n) {
  const B = S.tempo.beats; if (!B) return S.tempo.offset + n * S.BEAT;
  if (n <= 0) return B[0] + n * S.BEAT; if (n >= B.length - 1) return B[B.length - 1] + (n - B.length + 1) * S.BEAT;
  const i = Math.floor(n); return B[i] + (B[i + 1] - B[i]) * (n - i);
}
export function beatIdx(t) {
  const B = S.tempo.beats; if (!B) return Math.floor((t - S.tempo.offset) / S.BEAT);
  let lo = 0, hi = B.length - 1; if (t < B[0]) return Math.floor((t - B[0]) / S.BEAT);
  while (lo < hi) { const m = (lo + hi + 1) >> 1; if (B[m] <= t) lo = m; else hi = m - 1; } return lo;
}
export const barOf = t => Math.floor((beatIdx(t) - (S.tempo.phase || 0)) / 4);

// ---------- 鼓点 ----------
export function kickEnv(t, gain = 1) {
  if (!gain) return 0; let e = 0;
  for (let i = S.kicks.length - 1; i >= 0; i--) { const [k, s] = S.kicks[i]; if (k > t) continue; const d = t - k; if (d > .5) break; e = Math.max(e, s * Math.exp(-d / .11)); }
  return e * gain;
}
export function snareHit(t, fps = 30) { for (const [k, s] of S.snares) { if (k > t) break; if (t - k < 1 / fps && s > 1.0) return 1; } return 0; }

// ---------- 版式：横 1920×1080，竖 1080×1920 设计坐标 ----------
export function layout(W, H) {
  S.W = W; S.H = H; S.V = H > W; S.DW = S.V ? 1080 : 1920; S.DH = S.V ? 1920 : 1080; S.U = W / S.DW;
  S.safe = S.V ? { x0: 80, x1: 950, y0: 280, y1: 1560 } : { x0: 110, x1: 1810, y0: 90, y1: 950 };
}
export function coverRect(img, w, h, fx = .5, fy = .5, zoom = 1) {
  const s = Math.max(w / img.width, h / img.height) * zoom, iw = img.width * s, ih = img.height * s;
  return [clamp(w / 2 - fx * iw, w - iw, 0), clamp(h / 2 - fy * ih, h - ih, 0), iw, ih];
}

// ---------- 文字 ----------
const isLatin = ch => /[\x20-\x7e]/.test(ch);
export const LYF = () => (S.sb.lyricFont === 'kai' ? 'KAI' : 'NSC');
export function fontFor(ch, size, w = 900) { if (isLatin(ch)) return `700 ${size * .92}px JBMono`; return LYF() === 'KAI' ? `500 ${size}px KAI` : `${w} ${size}px NSC`; }
export function measure(ctx, txt, size) { let w = 0; for (const ch of txt) { ctx.font = fontFor(ch, size); w += ctx.measureText(ch).width; } return w; }
export function wrap(ctx, txt, size, maxW) {
  const toks = txt.match(/[A-Za-z0-9'’]+|\s+|./gu) || []; const lines = []; let cur = '';
  for (const tk of toks) { const nxt = cur + tk;
    if (measure(ctx, nxt.trimEnd(), size) > maxW && cur.trim()) { if (/^[，。！？、,.!?—~)）」]/.test(tk)) { cur = nxt; continue; } lines.push(cur.trim()); cur = tk.trimStart(); }
    else cur = nxt; }
  if (cur.trim()) lines.push(cur.trim()); return lines;
}
const isWordCh = ch => /[0-9A-Za-z一-鿿]/.test(ch);
function charIdx(txt, gi) { let n = 0; for (let i = 0; i < gi; i++) if (isWordCh(txt[i])) n++; return n; }
// 逐字砸入。opt: x y size align maxW valign lh times t accent(gi) cursor color alpha
export function typeBlock(ctx, txt, opt) {
  const U = S.U, size = opt.size * U, maxW = (opt.maxW || 1600) * U, lines = opt.lines || wrap(ctx, txt, size, maxW);
  const lh = size * (opt.lh || 1.18), totalH = lines.length * lh;
  let y = opt.y * U + (opt.valign === 'middle' ? -totalH / 2 + size * .85 : opt.valign === 'bottom' ? -totalH + size * .85 : size * .85);
  let gi = 0, lastX = 0, lastY = y, shown = 0;
  ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  for (const ln of lines) {
    const w = measure(ctx, ln, size); let x = opt.align === 'center' ? opt.x * U - w / 2 : opt.align === 'right' ? opt.x * U - w : opt.x * U;
    for (const ch of ln) {
      while (gi < txt.length && txt[gi] !== ch) gi++;
      const ci = charIdx(txt, gi) - (isWordCh(ch) ? 0 : 1);
      const ti = opt.times ? (opt.times[Math.max(0, Math.min(opt.times.length - 1, ci))] ?? 0) + (isWordCh(ch) ? 0 : .08) : 0;
      const k = opt.t - ti; ctx.font = fontFor(ch, size); const cw = ctx.measureText(ch).width;
      if (k >= 0 && ch !== ' ') {
        const acc = opt.accent && opt.accent(gi, ch), pop = 1 + (acc ? .8 : .35) * Math.exp(-k / (acc ? .09 : .07)), hot = Math.exp(-k / .16);
        ctx.save(); ctx.translate(x + cw / 2, y - size * .35); ctx.scale(pop, pop);
        ctx.fillStyle = acc ? PAL.accent : hot > .5 ? PAL.accentHi : (opt.color || PAL.ink);
        ctx.globalAlpha = (opt.alpha ?? 1) * clamp(k / .03 + .2); ctx.fillText(ch, -cw / 2, size * .35); ctx.restore();
        lastX = x + cw; lastY = y; shown++;
      }
      x += cw; gi++;
    }
    y += lh;
  }
  ctx.globalAlpha = 1;
  if (opt.cursor !== false && shown > 0 && ((Math.floor(opt.t / (S.BEAT / 2)) % 2) === 0 || opt.cursor === 'solid')) {
    ctx.fillStyle = PAL.accent; ctx.fillRect(lastX + size * .08, lastY - size * .82, size * .42, size * .95);
  }
  return { lines, h: totalH };
}
export function accentFn(text) {
  const on = new Set();
  for (const a of S.accents) { let i = text.indexOf(a); while (i >= 0) { for (let k = 0; k < a.length; k++) on.add(i + k); i = text.indexOf(a, i + 1); } }
  return gi => on.has(gi);
}

// ---------- HUD：四角小字（竖版在安全区内） ----------
export function hud(ctx, o) {
  const U = S.U, sf = S.safe, fs = (S.V ? 26 : 20) * U;
  ctx.font = `500 ${fs}px JBMono`; ctx.fillStyle = PAL.dim; ctx.textBaseline = 'alphabetic';
  const top = S.V ? 300 * U : 64 * U, bot = S.V ? 1600 * U : (S.DH - 48) * U, L = (S.V ? sf.x0 : 56) * U, R = (S.V ? sf.x1 : S.DW - 56) * U;
  ctx.textAlign = 'left'; if (o.tl) ctx.fillText(o.tl, L, top); if (o.bl) ctx.fillText(o.bl, L, bot);
  ctx.textAlign = 'right'; if (o.tr) ctx.fillText(o.tr, R, top); if (o.br) ctx.fillText(o.br, R, bot);
}
