"""分镜检查：python3 tools/check_storyboard.py <项目目录>
查：JSON 格式、镜头类型、语义时间能否解析、时间重叠/空缺、镜头是否落在拍点、素材文件是否存在、必填参数"""
import json, os, re, sys
P = sys.argv[1]; err, warn = [], []
sb = json.load(open(os.path.join(P, 'storyboard.json'), encoding='utf-8'))
tp = json.load(open(os.path.join(P, 'analysis/tempo.json'))); L = json.load(open(os.path.join(P, 'analysis/lyrics.json'), encoding='utf-8'))
TYPES = {'title': [], 'figure': ['asset'], 'words': [], 'contrast': ['a', 'b', 'at'], 'hold': [], 'burst': ['asset'], 'tunnel': [], 'crowd': ['asset'], 'converge': ['target'],
         'spell': ['text'], 'stack': ['target'], 'zoomSpark': ['words'], 'wordWave': ['words'], 'feed': ['items'], 'code': ['lines'], 'lightUp': ['target', 'at'],
         'montage': ['items'], 'slam': ['text'], 'glow': [], 'endCard': [], 'credits': ['lines']}
def line(prefix, nth=1):
    c = 0
    for x in L:
        if x['text'].replace(' ', '').startswith(prefix.replace(' ', '')):
            c += 1
            if c == nth: return x
def beatT(n):
    B = tp.get('beats')
    if not B: return tp['offset'] + n * tp['beat']
    if n <= 0: return B[0] + n * tp['beat']
    if n >= len(B) - 1: return B[-1] + (n - len(B) + 1) * tp['beat']
    i = int(n); return B[i] + (B[i + 1] - B[i]) * (n - i)
def onbeat(t):
    B = tp.get('beats')
    if not B: off = ((t - tp['offset']) / tp['beat']) % 1; return min(off, 1 - off)
    import bisect; i = bisect.bisect(B, t); c = [B[j] for j in (i - 1, i) if 0 <= j < len(B)]; return min(abs(t - x) for x in c) / tp['beat']
def T(ref):
    if isinstance(ref, (int, float)): return float(ref)
    s, adj = str(ref).strip(), 0.
    m = re.match(r'^(.*)~(-?[\d.]+)$', s)
    if m: s, adj = m.group(1), float(m.group(2))
    if s == 'end': return tp['duration'] + adj
    m = re.match(r'^bar:(-?\d+)([+-][\d.]+)?$', s)
    if m: return beatT(tp.get('phase', 0) + int(m.group(1)) * 4 + (float(m.group(2)) if m.group(2) else 0)) + adj
    m = re.match(r'^beat:(-?[\d.]+)$', s)
    if m: return beatT(float(m.group(1))) + adj
    m = re.match(r'^lyric:(.+?)(?:@(\d+))?(?:#(\d+))?$', s)
    if m:
        x = line(m.group(1), int(m.group(2) or 1))
        if not x: raise ValueError('找不到歌词 ' + m.group(1))
        return x['t'][min(len(x['t']) - 1, int(m.group(3) or 0))] + adj
    return float(s) + adj
assets = sb.get('assets', {})
for n, a in assets.items():
    for k in ('img', 'sheet', 'mask'):
        if k in a and not os.path.exists(os.path.join(P, a[k])): (warn if a.get('fallback') else err).append(f'素材 {n}：文件不存在 {a[k]}' + ('（有 fallback）' if a.get('fallback') else ''))
shots = []
for i, s in enumerate(sb.get('shots', [])):
    sid = s.get('id', f'#{i}')
    if s.get('type') not in TYPES: err.append(f'{sid}：未知类型 {s.get("type")}'); continue
    for k in TYPES[s['type']]:
        if k not in s: err.append(f'{sid}（{s["type"]}）：缺参数 {k}')
    for k in ('asset', 'target', 'from', 'logo'):
        v = s.get(k)
        if isinstance(v, str) and v not in ('scatter', 'tube') and v not in assets: err.append(f'{sid}：{k}="{v}" 不在 assets 里')
    for it in s.get('items', []) if s['type'] == 'montage' else []:
        if it[0] not in assets: err.append(f'{sid}：montage 素材 {it[0]} 不在 assets 里')
    try:
        t0, t1 = T(s['t0']), T(s['t1'])
        for k in ('at',):
            if k in s: T(s[k])
        if isinstance(s.get('frames'), list): [T(x) for x in s['frames']]
    except Exception as e: err.append(f'{sid}：时间写法有误 {e}'); continue
    if s['type'] == 'credits': continue
    if t1 <= t0: err.append(f'{sid}：t1 ≤ t0'); continue
    ob = onbeat(t0)
    if ob > .12 and not s.get('offbeat'): warn.append(f'{sid}：起点 {t0:.2f}s 不在拍点上（偏 {ob:.2f} 拍），想故意不对拍就加 "offbeat": true')
    shots.append((t0, t1, sid))
shots.sort()
for (a0, a1, x), (b0, b1, y) in zip(shots, shots[1:]):
    if b0 < a1 - .02: err.append(f'{x} 与 {y} 重叠 {a1 - b0:.2f}s')
    elif b0 > a1 + .02: err.append(f'{x} 与 {y} 之间空了 {b0 - a1:.2f}s（会黑屏/停帧）')
R0, R1 = (T(sb['range'][0]), T(sb['range'][1])) if sb.get('range') else (0., tp['duration'])
if sb.get('range'): print(f'只做片段：{R0:.2f}–{R1:.2f}s')
if shots and shots[0][0] > R0 + .01: err.append(f'第一个镜头从 {shots[0][0]:.2f}s 开始，前面会空着' + ('' if sb.get('range') else '（第一帧应是片名）'))
if shots and shots[-1][1] < R1 - .5: warn.append(f'最后一个镜头在 {shots[-1][1]:.2f}s 结束，目标到 {R1:.2f}s')
types = [s['type'] for s in sb.get('shots', [])]
if sb.get('converge', False) and 'converge' not in types and 'stack' not in types: warn.append('已显式要求汇聚，但没有 converge 或 stack 镜头；请添加镜头或将 converge 设为 false')
print(f'镜头 {len(shots)} 个，覆盖 {shots[0][0]:.2f}–{shots[-1][1]:.2f}s' if shots else '没有镜头')
for w in warn: print('⚠', w)
for e in err: print('✗', e)
print('通过' if not err else f'{len(err)} 个错误，先改完再渲染'); sys.exit(1 if err else 0)
