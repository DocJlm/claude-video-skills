"""白底 logo → 深色背景可用版本（暗色文字变成浅色 ink，彩色保留，白底变透明）
用法：uv run --with pillow --with numpy python tools/logo_dark.py <logo.png> <输出.png> [--ink '#e9e2d6'] [--keep-dark-in-color]
--keep-dark-in-color：彩色块里的深色图案（如绿方块里的黑屋顶）改成背景色而不是 ink"""
import argparse, numpy as np
from PIL import Image
ap = argparse.ArgumentParser(); ap.add_argument('src'); ap.add_argument('dst'); ap.add_argument('--ink', default='#e9e2d6'); ap.add_argument('--bg', default='#0b0907')
ap.add_argument('--keep-dark-in-color', action='store_true'); A = ap.parse_args()
h2 = lambda s: np.array([int(s[i:i + 2], 16) for i in (1, 3, 5)])
a = np.array(Image.open(A.src).convert('RGB')).astype(int); r, g, b = a[..., 0], a[..., 1], a[..., 2]
lum = (r * .3 + g * .59 + b * .11) / 255; sat = a.max(-1) - a.min(-1); colored = sat > 60
out = np.zeros(a.shape[:2] + (4,), np.uint8); out[..., :3] = h2(A.ink); out[..., 3] = (np.clip((1 - lum) * 1.25, 0, 1) * 255).astype(np.uint8)
out[colored, :3] = a[colored]; out[colored, 3] = 255
if A.keep_dark_in_color:
    from scipy import ndimage
    inside = ndimage.binary_fill_holes(colored) & ~colored & (lum < .5); out[inside, :3] = h2(A.bg); out[inside, 3] = 255
ys, xs = np.where(out[..., 3] > 20); out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
Image.fromarray(out, 'RGBA').save(A.dst); print('深色底版本', A.dst, out.shape)
