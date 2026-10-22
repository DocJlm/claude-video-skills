"""把 logo / 图标 / 任意图做成“汇聚用遮罩”：白色形状 + 黑底 PNG（火星只落在白色上）
用法：uv run --with pillow --with numpy python tools/make_mask.py <输入图> <输出.png> [--keep dark|light|color] [--color '#a6cf4f'] [--tol 60] [--crop x0,y0,x1,y1]
  dark  ：保留深色部分（白底黑字 logo）    light：保留浅色部分（黑底白字）    color：保留接近 --color 的部分
提示：彩色方块里镂空的图案（如绿底黑屋顶），用 --keep dark 并 --crop 到图标范围即可只取图案"""
import sys, argparse, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--keep', default='dark'); ap.add_argument('--color', default='#ffffff')
ap.add_argument('--tol', type=float, default=60); ap.add_argument('--crop'); A = ap.parse_args()
im = Image.open(A.src).convert('RGBA')
if A.crop: im = im.crop(tuple(int(v) for v in A.crop.split(',')))
a = np.array(im).astype(float); rgb, al = a[..., :3], a[..., 3] / 255; lum = rgb @ [.299, .587, .114]
if A.keep == 'dark': m = (lum < 110) & (al > .5)
elif A.keep == 'light': m = (lum > 150) & (al > .5)
else: c = np.array([int(A.color[i:i + 2], 16) for i in (1, 3, 5)]); m = (np.linalg.norm(rgb - c, axis=-1) < A.tol) & (al > .5)
ys, xs = np.where(m)
if not len(xs): sys.exit('没有选中任何像素：换 --keep 或调 --tol')
m = m[ys.min():ys.max() + 1, xs.min():xs.max() + 1]; h, w = m.shape; s = max(h, w); pad = int(s * .08)
out = np.zeros((s + 2 * pad, s + 2 * pad), np.uint8); out[pad + (s - h) // 2: pad + (s - h) // 2 + h, pad + (s - w) // 2: pad + (s - w) // 2 + w] = m * 255
Image.fromarray(out).save(A.dst); print('遮罩', A.dst, out.shape)
