"""剪辑版（高燃版 / 短版）：从完整成片按原片时间段剪接
用法：python3 tools/recut.py <项目> <完整成片.mp4（带声音）> <剪辑表.json> <输出名>
剪辑表：{"segments": [[8.38, 113.38], [137.38, 195.66], [212.81, 228.45]],
         "video_segments": [[8.38, 113.38], [137.38, 195.46], [212.61, 228.45]]}   ← 可选：画面剪点与音频不同（长度要一致），用来避开被剪镜头的残帧
选点原则（见 docs/07）：剪点落在拍点或小节线；前后 0.3 s 内没有唱到一半的字；两端小节相位尽量一致
产物：<项目>/成片/<输出名>.mp4 + .srt；打印每个接缝前后 0.25 s 的音量（差 > 8 dB 要去听一下）
"""
import json, os, re, subprocess, sys
P, SRC, CUT, NAME = sys.argv[1:5]; FPS = 30
cut = json.load(open(CUT)); fq = lambda t: round(t * FPS) / FPS
segs = [(fq(a), fq(b)) for a, b in cut['segments']]; vsegs = [(fq(a), fq(b)) for a, b in cut.get('video_segments', cut['segments'])]
assert len(segs) == len(vsegs) and all(abs((b - a) - (d - c)) < .05 for (a, b), (c, d) in zip(segs, vsegs)), '画面段和音频段长度必须一致'
vf, af = [], []
for i, ((a, b), (va, vb)) in enumerate(zip(segs, vsegs)):
    vf.append(f'[0:v]trim=start={va}:end={vb},setpts=PTS-STARTPTS[v{i}]')
    af.append(f'[0:a]atrim=start={a}:end={b},asetpts=PTS-STARTPTS,afade=t=in:d={.001 if i == 0 else .025},afade=t=out:st={b - a - .025:.3f}:d=0.025[a{i}]')
n = len(segs); fc = ';'.join(vf + af) + f";{''.join(f'[v{i}]' for i in range(n))}concat=n={n}:v=1:a=0[vo];{''.join(f'[a{i}]' for i in range(n))}concat=n={n}:v=0:a=1[ao]"
out = os.path.join(P, '成片', NAME + '.mp4')
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', SRC, '-filter_complex', fc, '-map', '[vo]', '-map', '[ao]', '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-r', str(FPS), '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', out], check=True)
L = json.load(open(os.path.join(P, 'analysis', 'lyrics.json'), encoding='utf-8')); cues, off, joins = [], 0, []
for a, b in segs:
    for x in L:
        if x.get('t0') is None or x['t1'] + .4 <= a or x['t0'] >= b: continue
        s0, s1 = max(x['t0'], a) - a + off, min(x['t1'] + .4, b) - a + off
        if s1 - s0 > .4: cues.append((s0, s1, re.sub(r'——|~', '', x['text']).strip()))
    off += b - a; joins.append(off)
fmt = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)) % 1000:03d}"
open(out.replace('.mp4', '.srt'), 'w', encoding='utf-8').write('\n'.join(f'{k + 1}\n{fmt(a)} --> {fmt(b)}\n{t}\n' for k, (a, b, t) in enumerate(cues)))
def vol(t0, t1):
    r = subprocess.run(['ffmpeg', '-ss', str(max(0, t0)), '-t', str(t1 - t0), '-i', out, '-af', 'volumedetect', '-vn', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'mean_volume: (-?[\d.]+)', r)[0])
print(f'剪辑版 {out}  总长 {off:.2f}s · 字幕 {len(cues)} 句')
for j in joins[:-1]:
    a, b = vol(j - .25, j - .03), vol(j + .03, j + .25); print(f'  接缝 {j:7.2f}s  前 {a:6.1f} dB  后 {b:6.1f} dB' + ('  ⚠ 落差大，听一下' if abs(a - b) > 8 else ''))
