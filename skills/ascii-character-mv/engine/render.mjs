#!/usr/bin/env node
// 渲染器：node engine/render.mjs <项目目录> <模式> [选项]
//   stills --times 12.5,40       出静帧到 <项目>/out/stills/
//   shots  [--at .5]             每个镜头取点出静帧（审片用）
//   video  [--t0 0 --t1 end]     逐帧渲染 → <项目>/out/<name>_<W>x<H>.mp4（无声；10 s 一段，可断点续跑）
// 通用选项：--w 1920 --h 1080 --fps 30 --name film --q "credits=thanks"（透传给页面）
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { spawn, spawnSync } from 'node:child_process';
import { chromium } from 'playwright';
const ENG = path.dirname(fileURLToPath(import.meta.url));
const [, , projArg, mode = 'stills', ...rest] = process.argv;
if (!projArg) { console.error('用法：node engine/render.mjs <项目目录> stills|shots|video [选项]'); process.exit(1); }
const PROJ = path.resolve(projArg);
const opt = (k, d) => { const i = rest.indexOf('--' + k); return i >= 0 ? rest[i + 1] : d; };
const W = +opt('w', 1920), H = +opt('h', 1080), FPS = +opt('fps', 30), Q = opt('q', '');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.woff': 'font/woff' };
const server = http.createServer((req, res) => {
  const u = decodeURIComponent(req.url.split('?')[0]); let f = null;
  if (u.startsWith('/engine/')) f = path.join(ENG, u.slice(8)); else if (u.startsWith('/p/')) f = path.join(PROJ, u.slice(3));
  if (!f || !(f.startsWith(ENG) || f.startsWith(PROJ)) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r)); const PORT = server.address().port;
const browser = await chromium.launch({ args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: W, height: H } });
page.on('pageerror', e => { console.log('[页面错误]', e.message); process.exitCode = 1; });
page.on('console', m => { if (m.type() === 'error') console.log('[页面]', m.text()); });
await page.goto(`http://127.0.0.1:${PORT}/engine/index.html?w=${W}&h=${H}&fps=${FPS}&${Q}`);
await page.waitForFunction('window.READY === true', null, { timeout: 180000 });
const OUT = path.join(PROJ, 'out'); fs.mkdirSync(OUT, { recursive: true });
const shoot = async (t, dir) => { const id = await page.evaluate(t => window.FILM.frame(t), t); const url = await page.evaluate(() => window.FILM.snap());
  const f = path.join(dir, `${W}x${H}_${t.toFixed(2).padStart(7, '0')}_${id}.png`); fs.writeFileSync(f, Buffer.from(url.split(',')[1], 'base64')); return f; };
if (mode === 'stills') { const dir = path.join(OUT, opt('out', 'stills')); fs.mkdirSync(dir, { recursive: true });
  for (const ts of opt('times', '').split(',').filter(Boolean)) console.log(await shoot(+ts, dir)); }
if (mode === 'shots') { const dir = path.join(OUT, opt('out', `shots_${W}x${H}`)); fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const at = opt('at', '.5').split(',').map(Number);
  for (const s of await page.evaluate(() => window.FILM.shots())) for (const a of at) await shoot(s.t0 + (s.t1 - s.t0) * a, dir);
  console.log('静帧目录', dir); }
if (mode === 'video') {
  const dur = await page.evaluate(() => [window.DUR, window.DUR_CREDITS]);
  const t0 = +opt('t0', 0), t1 = opt('t1', 'end') === 'end' ? dur[0] : opt('t1') === 'credits' ? dur[1] : +opt('t1'), name = opt('name', 'film');
  const ver = `${name}_${W}x${H}`, dir = path.join(OUT, ver + '_parts'); fs.mkdirSync(dir, { recursive: true });
  const f0 = Math.round(t0 * FPS), f1 = Math.round(t1 * FPS), seg = 10 * FPS, list = [], start = Date.now(); let done = 0;
  for (let a = f0; a < f1; a += seg) {
    const b = Math.min(f1, a + seg), mp4 = path.join(dir, `${String(a).padStart(6, '0')}_${b}.mp4`); list.push(mp4);
    if (fs.existsSync(mp4)) { done += b - a; continue; }
    const tmp = mp4 + '.tmp.mp4', enc = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', String(FPS), tmp], { stdio: ['pipe', 'inherit', 'inherit'] });
    for (let f = a; f < b; f++) { await page.evaluate(t => window.FILM.frame(t), f / FPS); const url = await page.evaluate(() => window.FILM.snap());
      if (!enc.stdin.write(Buffer.from(url.split(',')[1], 'base64'))) await new Promise(r => enc.stdin.once('drain', r));
      if (++done % 30 === 0) { const r = done / ((Date.now() - start) / 1000); process.stdout.write(`\r${ver} ${(f / FPS).toFixed(1)}s · ${r.toFixed(0)} fps · 剩余 ${((f1 - f0 - done) / r / 60).toFixed(1)} 分   `); } }
    enc.stdin.end(); await new Promise(r => enc.on('close', r)); fs.renameSync(tmp, mp4);
  }
  const lst = path.join(dir, 'list.txt'); fs.writeFileSync(lst, list.map(f => `file '${f}'`).join('\n'));
  const outF = path.join(OUT, ver + '.mp4'); spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', outF], { stdio: 'inherit' });
  console.log('\n完成', outF);
}
const errs = await page.evaluate(() => window.FILM.errors()); if (errs.length) { console.log('⚠ 渲染中的错误：\n' + [...new Set(errs)].slice(0, 20).join('\n')); process.exitCode = 1; }
await browser.close(); server.close();
