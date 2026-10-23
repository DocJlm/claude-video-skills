"""一键分析歌曲：速度与相位 → 八分网格鼓点 → Whisper 字级时间 → 正确歌词逐字对齐 → 段落表
用法（在 skill 根目录）：
  uv run --python 3.12 --with librosa --with faster-whisper --with numpy --with scipy python tools/analyze_song.py <项目目录> [--bpm 140] [--lang zh] [--skip-asr]
输入：<项目>/song.(mp3|wav|m4a)、<项目>/lyrics.txt（[段落标签] 行 + 歌词行；括号里的和声照写）
输出：<项目>/analysis/ 下 tempo.json  grid.json  asr.json  lyrics.json  sections.json  report.txt
"""
import sys, os, json, re, glob, subprocess, argparse
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument('proj'); ap.add_argument('--bpm', type=float, default=0, help='已知速度时直接给，跳过估计（仍会细调相位）')
ap.add_argument('--lang', default='zh'); ap.add_argument('--skip-asr', action='store_true', help='复用已有 asr.json')
ap.add_argument('--model', default='large-v3')
A = ap.parse_args()
P = os.path.abspath(A.proj); OUT = os.path.join(P, 'analysis'); os.makedirs(OUT, exist_ok=True)
song = next((f for e in ('mp3', 'wav', 'm4a', 'flac') for f in glob.glob(os.path.join(P, f'song.{e}'))), None)
if not song: sys.exit('找不到 <项目>/song.mp3（或 wav/m4a/flac）')
import librosa
y, sr = librosa.load(song, sr=22050, mono=True)
DUR = len(y) / sr
_, yp = librosa.effects.hpss(y, margin=3.0)
rep = []

# ---------- 1. 速度与相位：在起音包络上搜索使拍点能量最大的 (BPM, offset) ----------
env = librosa.onset.onset_strength(y=yp, sr=sr, hop_length=128)
dt = 128 / sr
def score(bpm, off):
    idx = np.round(np.arange(off, DUR, 60 / bpm) / dt).astype(int); idx = idx[idx < len(env)]
    return env[idx].mean()
if A.bpm: cands = [A.bpm]
else:
    t0 = float(np.atleast_1d(librosa.feature.tempo(onset_envelope=env, sr=sr, hop_length=128))[0])
    cands = [t0, t0 * 2, t0 / 2]
best = (-1, 0, 0)
for c in cands:
    if not 60 <= c <= 200: continue
    lo, hi = (c, c) if A.bpm else (c * .96, c * 1.04)
    for bpm in np.arange(lo, hi + 1e-9, .05 if not A.bpm else 1):
        per = 60 / bpm
        for off in np.arange(0, per, .004):
            s = score(bpm, off)
            if s > best[0]: best = (s, bpm, off)
_, bpm, off = best
if not A.bpm:   # 细调
    for b in np.arange(bpm - .06, bpm + .06, .01):
        for o in np.arange(max(0, off - .02), off + .02, .002):
            s = score(b, o)
            if s > best[0]: best = (s, b, o)
    _, bpm, off = best
per = 60 / bpm
# 漂移检查：每 30 s 重找相位
drift = []
for a in range(0, int(DUR) - 10, 30):
    sc = []
    for o in np.arange(-.1, .1, .004):
        g = np.arange(off + o, DUR, per); g = g[(g >= a) & (g < a + 30)]
        if len(g): sc.append((env[np.clip(np.round(g / dt).astype(int), 0, len(env) - 1)].mean(), o))
    if sc: drift.append(round(max(sc)[1] * 1000))
# 小节相位：哪一拍底鼓最强
S = np.abs(librosa.stft(yp, n_fft=1024, hop_length=128)); f = librosa.fft_frequencies(sr=sr, n_fft=1024)
tt = librosa.frames_to_time(np.arange(S.shape[1]), sr=sr, hop_length=128)
def flux(lo, hi):
    e = np.log1p(S[(f >= lo) & (f < hi)].sum(0)); return np.maximum(0, np.diff(e, prepend=e[0]))
L, M = flux(35, 140), flux(1800, 5000)
def at(e, t, w=.03):
    m = (tt > t - w) & (tt < t + w); return float(e[m].max()) if m.any() else 0.
beats = np.arange(off, DUR, per)
kb = np.array([at(L, b) for b in beats])
phase = int(np.argmax([kb[p::4].mean() for p in range(4)]))
off_bar = off + phase * per     # 第 0 小节线
# 变速歌（真人演奏、古风、抒情）：漂移大时改用逐拍跟踪的真实拍点
dynamic = max([abs(x) for x in drift] or [0]) > 25
if dynamic:
    _, bt = librosa.beat.beat_track(onset_envelope=env, sr=sr, hop_length=128, start_bpm=bpm, tightness=300, units='time')
    bt = list(bt)
    while bt and bt[0] - per > 0: bt.insert(0, bt[0] - per)          # 向前补到 0
    while bt[-1] + per < DUR: bt.append(bt[-1] + per)                # 向后补到结尾
    beats = np.array(bt)
    kb = np.array([at(L, b) for b in beats]); phase = int(np.argmax([kb[p::4].mean() for p in range(4)]))
    off, off_bar = float(beats[0]), float(beats[phase])
json.dump({'bpm': round(bpm, 3), 'beat': per, 'offset': round(off, 4), 'bar0': round(off_bar, 4), 'bar': per * 4, 'phase': phase,
           'duration': round(DUR, 3), 'phase_drift_ms': drift, 'grid': 'dynamic' if dynamic else 'fixed',
           'beats': [round(float(b), 4) for b in beats] if dynamic else None}, open(f'{OUT}/tempo.json', 'w'), indent=1)
rep.append(f'速度 {bpm:.2f} BPM，第一拍 {off:.3f} s，小节线 = {off_bar:.3f} + {per*4:.4f}·n，相位漂移(ms/30s) {drift}')
if dynamic: rep.append(f'⚠ 相位漂移 > 25 ms：判定为变速歌，已改用逐拍跟踪的 {len(beats)} 个真实拍点（tempo.json 的 beats），bar:/beat: 写法自动按真实拍点换算')

# ---------- 2. 八分网格上的底鼓 / 军鼓强度 ----------
e8 = np.sort(np.concatenate([beats, (beats[:-1] + beats[1:]) / 2])) if dynamic else np.arange(off, DUR, per / 2)
K = np.array([at(L, t) for t in e8]); Sn = np.array([at(M, t) for t in e8])
K /= np.percentile(K, 97) + 1e-9; Sn /= np.percentile(Sn, 97) + 1e-9
json.dump({'e8': [round(float(x), 4) for x in e8], 'kick': [round(float(x), 2) for x in K], 'snare': [round(float(x), 2) for x in Sn]}, open(f'{OUT}/grid.json', 'w'))
# 每秒能量（找段落、静默）
rms = librosa.feature.rms(y=y)[0]; rt = librosa.times_like(rms, sr=sr)
energy = [round(float(rms[(rt >= s) & (rt < s + 1)].mean()), 4) for s in range(int(DUR))]

# ---------- 3. Whisper 字级时间 ----------
asr_p = f'{OUT}/asr.json'
if not (A.skip_asr and os.path.exists(asr_p)):
    from faster_whisper import WhisperModel
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', song, '-ac', '1', '-ar', '16000', '-f', 'f32le', '-'], capture_output=True).stdout
    audio = np.frombuffer(raw, np.float32)
    lyr_hint = ' '.join(l.strip() for l in open(os.path.join(P, 'lyrics.txt'), encoding='utf-8') if l.strip() and not l.startswith('['))[:200]
    m = WhisperModel(A.model, device='cpu', compute_type='int8')
    segs, _ = m.transcribe(audio, language=A.lang, word_timestamps=True, vad_filter=False, initial_prompt=lyr_hint)
    asr = [{'s': round(s.start, 2), 'e': round(s.end, 2), 't': s.text, 'w': [(round(w.start, 2), round(w.end, 2), w.word) for w in s.words]} for s in segs]
    json.dump(asr, open(asr_p, 'w'), ensure_ascii=False)
asr = json.load(open(asr_p))

# ---------- 4. 正确歌词 ← ASR 时间：单调全局对齐（Needleman–Wunsch，重复副歌也不会错位） ----------
try:
    from opencc import OpenCC; t2s = OpenCC('t2s').convert
except Exception: t2s = lambda s: s
norm = lambda s: re.sub(r"[^0-9a-z一-鿿]", "", t2s(s).lower())
ac, at_ = [], []
for s in asr:
    for (a, b, w) in s['w']:
        n = norm(w)
        for k, ch in enumerate(n): ac.append(ch); at_.append(a + (b - a) * k / max(1, len(n)))
lines, sec = [], 'Song'
for raw in open(os.path.join(P, 'lyrics.txt'), encoding='utf-8'):
    raw = raw.strip()
    if not raw or raw.startswith('#'): continue
    m = re.match(r'\[(.+?)\]', raw)
    if m: sec = m.group(1).split(':')[0].strip(); continue
    lines.append({'sec': sec, 'text': raw})
lc, owner = [], []
for i, Ln in enumerate(lines):
    for ch in norm(Ln['text']): lc.append(ch); owner.append(i)
n, mm = len(lc), len(ac)
MATCH, MIS, GAP = 2, -1, -1
H = np.zeros((n + 1, mm + 1), np.int32); H[:, 0] = np.arange(n + 1) * GAP; H[0, :] = np.arange(mm + 1) * GAP
acA = np.array([ord(c) for c in ac]) if mm else np.zeros(0)
for i in range(1, n + 1):
    sub = H[i - 1, :-1] + np.where(acA == ord(lc[i - 1]), MATCH, MIS)
    row = np.maximum(sub, H[i - 1, 1:] + GAP)
    # 行内横向 gap（ASR 多出来的字）要顺序累计
    out = np.empty(mm + 1, np.int32); out[0] = H[i, 0]
    for j in range(1, mm + 1): out[j] = max(row[j - 1], out[j - 1] + GAP)
    H[i] = out
tm = [None] * n; i, j = n, mm
while i > 0 and j > 0:
    if H[i, j] == H[i - 1, j - 1] + (MATCH if ac[j - 1] == lc[i - 1] else MIS):
        if ac[j - 1] == lc[i - 1]: tm[i - 1] = at_[j - 1]
        i, j = i - 1, j - 1
    elif H[i, j] == H[i - 1, j] + GAP: i -= 1
    else: j -= 1
known = [k for k, x in enumerate(tm) if x is not None]
for k in range(n):
    if tm[k] is None:
        lo = max([q for q in known if q < k], default=None); hi = min([q for q in known if q > k], default=None)
        if lo is None and hi is None: tm[k] = 0.
        elif lo is None: tm[k] = tm[hi] - .15 * (hi - k)
        elif hi is None: tm[k] = tm[lo] + .15 * (k - lo)
        else: tm[k] = tm[lo] + (tm[hi] - tm[lo]) * (k - lo) / (hi - lo)
ks = set(known); low = []
for i, Ln in enumerate(lines):
    pos = [k for k in range(n) if owner[k] == i]
    if not pos: Ln.update(t=[], t0=None, t1=None, matched=0); continue
    ts = [round(tm[k], 2) for k in pos]
    Ln.update(t=ts, t0=ts[0], t1=round(ts[-1] + .3, 2), matched=round(sum(k in ks for k in pos) / len(pos), 2))
    if Ln['matched'] < .5: low.append(f"  {Ln['t0']:7.2f}  匹配 {Ln['matched']:.2f}  {Ln['text']}")
json.dump(lines, open(f'{OUT}/lyrics.json', 'w'), ensure_ascii=False, indent=0)
rep.append(f'歌词 {len(lines)} 行；匹配率低于 0.5 的行（时间靠插值，需人工听一下）：' + ('无' if not low else ''))
rep += low

# ---------- 5. 段落表：按歌词段落 + 吸附到最近的小节线 ----------
bar = per * 4
bars_t = beats[phase::4] if dynamic else None
snap = (lambda t: float(bars_t[np.argmin(np.abs(bars_t - t))])) if dynamic else (lambda t: off_bar + round((t - off_bar) / bar) * bar)
secs, cur = [], None
for Ln in lines:
    if Ln['t0'] is None: continue
    if cur is None or Ln['sec'] != cur['name']:
        if cur: secs.append(cur)
        cur = {'name': Ln['sec'], 't0': Ln['t0'], 't1': Ln['t1']}
    else: cur['t1'] = Ln['t1']
if cur: secs.append(cur)
for k, s in enumerate(secs):
    s['bar_t0'] = round(snap(s['t0'] - per * .5), 3)   # 段落首句通常在小节线后半拍内进来
    s['bar_index'] = int(np.argmin(np.abs(bars_t - s['bar_t0']))) if dynamic else int(round((s['bar_t0'] - off_bar) / bar))
    nxt = secs[k + 1]['t0'] if k + 1 < len(secs) else DUR
    s['energy'] = round(float(np.mean(energy[int(s['t0']):max(int(s['t0']) + 1, int(nxt))])), 4)
json.dump({'sections': secs, 'energy_per_sec': energy}, open(f'{OUT}/sections.json', 'w'), ensure_ascii=False, indent=1)
rep.append('段落：')
rep += [f"  {s['name']:<14} 歌声 {s['t0']:7.2f}–{s['t1']:7.2f}  小节线 {s['bar_t0']:7.2f}（第 {s['bar_index']} 小节）能量 {s['energy']}" for s in secs]
# 静默候选（能量骤降，可做“急停”或 Bridge）
mx = max(energy) or 1
quiet = [s for s in range(1, len(energy) - 1) if energy[s] < .35 * mx and energy[s - 1] > .5 * mx]
rep.append('能量骤降点（候选静默/急停）：' + ', '.join(f'{q}s' for q in quiet[:12]))
open(f'{OUT}/report.txt', 'w').write('\n'.join(rep))
print('\n'.join(rep))
