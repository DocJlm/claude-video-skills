"""交付：响度归一（两遍 loudnorm，-14 LUFS / 峰值 -1 dBTP）→ 合轨 → 字幕 → 可选鸣谢页（拼接 + 打字声）
用法：
  python3 tools/deliver.py <项目> <无声画面.mp4> <成片名> [--start 0] [--credits <鸣谢片段.mp4> --typing <analysis/credits_x.wav>]
  --start：画面在歌曲里的起点秒（只渲染了片段时用）
产物：<项目>/成片/<成片名>.mp4 和 .srt；最后打印时长、响度、峰值、黑场检查
"""
import argparse, json, os, re, subprocess, sys
ap = argparse.ArgumentParser(); ap.add_argument('proj'); ap.add_argument('video'); ap.add_argument('name')
ap.add_argument('--start', type=float, default=0); ap.add_argument('--credits'); ap.add_argument('--typing'); ap.add_argument('--typing-lufs', type=float, default=-21)
A = ap.parse_args(); P = os.path.abspath(A.proj); OUT = os.path.join(P, '成片'); os.makedirs(OUT, exist_ok=True)
run = lambda *a: subprocess.run(list(a), check=True, capture_output=True, text=True)
dur = lambda f: float(run('ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f).stdout)
song = next(os.path.join(P, f) for f in os.listdir(P) if f.startswith('song.'))
norm = os.path.join(P, 'analysis', 'song_norm.wav')
if not os.path.exists(norm):   # 两遍 loudnorm
    r = subprocess.run(['ffmpeg', '-i', song, '-af', 'loudnorm=I=-14:TP=-1.0:LRA=11:print_format=json', '-f', 'null', '-'], capture_output=True, text=True).stderr
    d = json.loads(r[r.rindex('{'):r.rindex('}') + 1])
    mi = f"measured_I={d['input_i']}:measured_TP={d['input_tp']}:measured_LRA={d['input_lra']}:measured_thresh={d['input_thresh']}:offset={d['target_offset']}"
    run('ffmpeg', '-v', 'error', '-y', '-i', song, '-af', f'loudnorm=I=-14:TP=-1.0:LRA=11:{mi}:linear=true', '-ar', '48000', norm)
V = os.path.abspath(A.video); vd = dur(V); final = os.path.join(OUT, A.name + '.mp4')
if not A.credits:
    run('ffmpeg', '-v', 'error', '-y', '-i', V, '-ss', str(A.start), '-t', str(vd), '-i', norm, '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-shortest', '-movflags', '+faststart', final)
else:
    C = os.path.abspath(A.credits); lst = os.path.join(P, 'out', '_cred_list.txt')
    open(lst, 'w').write(f"file '{V}'\nfile '{C}'\n"); cat = os.path.join(P, 'out', '_cred_video.mp4')
    run('ffmpeg', '-v', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', cat)   # 两段都由 render.mjs 出，编码参数一致，可直接拼
    td = dur(cat); ms = int(round(vd * 1000))
    r = subprocess.run(['ffmpeg', '-i', A.typing, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    li = float(re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]); g = A.typing_lufs - li
    fc = (f'[1:a]atrim=start={A.start}:end={A.start + vd},asetpts=PTS-STARTPTS,apad=whole_dur={td}[s];'
          f'[2:a]volume={g:.2f}dB,alimiter=limit=0.6:attack=1:release=30:level=disabled,adelay={ms}|{ms},apad=whole_dur={td}[k];[s][k]amix=inputs=2:normalize=0:duration=first[a]')
    run('ffmpeg', '-v', 'error', '-y', '-i', cat, '-i', norm, '-i', A.typing, '-filter_complex', fc, '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', final)
# 字幕：歌词映射到成片时间轴
L = json.load(open(os.path.join(P, 'analysis', 'lyrics.json'), encoding='utf-8'))
fmt = lambda t: f"{int(t // 3600):02d}:{int(t % 3600 // 60):02d}:{int(t % 60):02d},{int(round((t % 1) * 1000)) % 1000:03d}"
cues = []
for i, x in enumerate(L):
    if x.get('t0') is None: continue
    a, nxt = x['t0'] - A.start, (L[i + 1]['t0'] if i + 1 < len(L) and L[i + 1].get('t0') else x['t1'] + 2) - A.start
    b = min(max(x['t1'] + .4 - A.start, a + 1.8), nxt - .02); a, b = max(0, a), min(vd, b)
    if b - a > .4: cues.append((a, b, re.sub(r'——|~', '', x['text']).strip()))
open(os.path.join(OUT, A.name + '.srt'), 'w', encoding='utf-8').write('\n'.join(f'{k + 1}\n{fmt(a)} --> {fmt(b)}\n{t}\n' for k, (a, b, t) in enumerate(cues)))
# 自检
r = subprocess.run(['ffmpeg', '-i', final, '-af', 'ebur128=peak=true', '-vn', '-f', 'null', '-'], capture_output=True, text=True).stderr
I = re.findall(r'I:\s+(-?[\d.]+) LUFS', r)[-1]; pk = re.findall(r'Peak:\s+(-?[\d.]+) dBFS', r)[-1]
bl = re.findall(r'black_start:([\d.]+) black_end:([\d.]+)', subprocess.run(['ffmpeg', '-i', final, '-vf', 'blackdetect=d=0.6:pix_th=0.03', '-an', '-f', 'null', '-'], capture_output=True, text=True).stderr)
print(f'成片 {final}\n  时长 {dur(final):.2f}s · 响度 {I} LUFS · 峰值 {pk} dBFS · 字幕 {len(cues)} 句 · 黑场 {bl or "无"}')
if float(pk) > -1: print('  ⚠ 峰值高于 -1 dBFS，检查鸣谢打字声的限幅')
