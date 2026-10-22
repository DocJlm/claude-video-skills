"""鸣谢页打字声 + 逐字时间表（声画同步）
用法：uv run --python 3.12 --with numpy --with scipy --with soundfile python tools/typing_sfx.py <项目目录> <鸣谢镜头 id> [--hold 2.0] [--seed 11]
读取 storyboard.json 里该 credits 镜头的 lines：[["title","鸣谢"],["role","// 出品"],["name","张三","（副标题）"],...]
输出：<项目>/analysis/credits_<id>.json（逐字时间，镜头的 "schedule" 指向它）和 <项目>/analysis/credits_<id>.wav
做法：真人节奏（键间隔对数正态，中位 58 ms，符号多停、偶尔停顿、每行回车）；每键 = 按下（触点 + 键身共振 + 触底）+ 60–120 ms 后抬起；空格带平衡杆；回车更重；短房间混响"""
import json, sys, argparse, numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt, fftconvolve
ap = argparse.ArgumentParser(); ap.add_argument('proj'); ap.add_argument('shot'); ap.add_argument('--hold', type=float, default=0); ap.add_argument('--seed', type=int, default=11); A = ap.parse_args()
sb = json.load(open(f'{A.proj}/storyboard.json', encoding='utf-8')); sh = next(s for s in sb['shots'] if s.get('id') == A.shot)
CRED = sh['lines']; SR = 48000; rng = np.random.default_rng(A.seed)
def bp(x, lo, hi): return sosfilt(butter(2, [lo, hi], 'band', fs=SR, output='sos'), x)
def hp(x, f): return sosfilt(butter(2, f, 'high', fs=SR, output='sos'), x)
def lp(x, f): return sosfilt(butter(2, f, 'low', fs=SR, output='sos'), x)
def Tm(d): return np.arange(int(d * SR)) / SR
def nz(d): return rng.standard_normal(int(d * SR))
def press(fb, v, kind):
    d = .07; t = Tm(d); x = hp(nz(d), 2600) * np.exp(-t / rng.uniform(.0012, .0022)) * .9 + bp(nz(d), fb * .92, fb * 1.08) * np.exp(-t / .009) * 2.2
    lo, hi = (110, 420) if kind == 'space' else (180, 700); dl = rng.uniform(.004, .008)
    x += bp(nz(d), lo, hi) * np.exp(-np.maximum(0, t - dl) / (.022 if kind == 'space' else .012)) * (t > dl) * (2.6 if kind != 'key' else 1.6)
    if kind == 'space':
        for q in (.006, .013): k = int(q * SR); x[k:] += hp(nz(d), 1800)[:len(x) - k] * np.exp(-t[:len(x) - k] / .0015) * .35
    return x * v
def release(fb, v): d = .04; t = Tm(d); return (hp(nz(d), 3200) * np.exp(-t / .0012) * .6 + bp(nz(d), fb * 1.15, fb * 1.35) * np.exp(-t / .005) * 1.2) * v
ev, sched, t = [], [], .30
for kind, a, *b in CRED:
    text = a + (b[0] if b else '')
    if kind == 'title': ev.append((t, 'enter', 900, 1.25, 0)); sched.append([t] * len(text)); t += .40; continue
    ts = []
    for ci, ch in enumerate(text):
        if ch == ' ': ev.append((t, 'space', 700, .9, 0)); ts.append(t); t += rng.uniform(.07, .11); continue
        ev.append((t, 'key', 1250 + (ord(ch) % 9) * 110 + rng.uniform(-40, 40), rng.uniform(.75, 1.05), ((ord(ch) % 7) - 3) / 10)); ts.append(t)
        iki = rng.lognormal(np.log(.058), .28)
        if ch in '（）：:()&·': iki += rng.uniform(.04, .09)
        if ci and ci % rng.integers(5, 8) == 0: iki += rng.uniform(.04, .08)
        t += iki
    sched.append(ts); t += rng.uniform(.06, .10); ev.append((t, 'enter', 950, 1.05, .05)); t += rng.uniform(.07, .11)
hold = A.hold or (2.5 if len(CRED) <= 6 else 1.5); DUR = round(t + hold, 2)
json.dump({'lines': sched, 'end': round(t, 3), 'dur': DUR}, open(f'{A.proj}/analysis/credits_{A.shot}.json', 'w'))
out = np.zeros((int(SR * DUR) + SR, 2))
def put(at, x, pan):
    i = int(at * SR); x = x[:len(out) - i]; l, r = np.cos((pan + 1) * np.pi / 4), np.sin((pan + 1) * np.pi / 4); out[i:i + len(x), 0] += x * l * 1.41; out[i:i + len(x), 1] += x * r * 1.41
for at, kind, fb, v, pan in ev:
    put(at, press(fb, v, kind), pan); put(at + rng.uniform(.06, .12) * (1.4 if kind != 'key' else 1), release(fb, v * (.5 if kind == 'key' else .7)), pan)
ir_t = Tm(.12); ir = lp(rng.standard_normal(len(ir_t)) * np.exp(-ir_t / .028), 5000); ir[0] = 0
for q, g in ((.0065, .35), (.0118, .22), (.019, .12)): ir[int(q * SR)] += g
out = out + np.stack([fftconvolve(out[:, c], ir)[:len(out)] for c in range(2)], 1) * .28
out += np.stack([lp(rng.standard_normal(len(out)), 300) * .0025] * 2, 1); out = out[:int(SR * DUR)]; out *= .5 / np.abs(out).max()
sf.write(f'{A.proj}/analysis/credits_{A.shot}.wav', out.astype(np.float32), SR)
print(f'鸣谢 {A.shot}：{len(ev)} 次按键，打字 {t:.2f}s，页面 {DUR}s → analysis/credits_{A.shot}.json / .wav（镜头里写 "schedule": "analysis/credits_{A.shot}.json"）')
