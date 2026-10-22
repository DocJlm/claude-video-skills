"""审片拼图：把一个目录里的静帧拼成总览；竖版自动叠手机安全区框（顶 260 / 左右 80 / 右侧 950 / 底 1760）
用法：uv run --with pillow python tools/audit.py <静帧目录> <输出.jpg> [--cols 6]"""
import sys, glob, os, argparse
from PIL import Image, ImageDraw
ap = argparse.ArgumentParser(); ap.add_argument('dir'); ap.add_argument('out'); ap.add_argument('--cols', type=int, default=0); A = ap.parse_args()
fs = sorted(glob.glob(os.path.join(A.dir, '*.png')))
if not fs: sys.exit('目录里没有 png')
ims = []
for f in fs:
    im = Image.open(f).convert('RGB'); V = im.height > im.width; d = ImageDraw.Draw(im)
    if V:
        s = im.width / 1080; lw = max(2, int(3 * s))
        d.rectangle([80 * s, 280 * s, 950 * s, 1560 * s], outline=(0, 200, 255), width=lw)
        for y in (260, 1760): d.line([0, y * s, im.width, y * s], fill=(255, 0, 80), width=lw)
    tw = 300 if V else 480; im = im.resize((tw, int(im.height * tw / im.width)))
    ImageDraw.Draw(im).text((6, 4), os.path.basename(f).rsplit('_', 1)[-1][:-4] + ' ' + os.path.basename(f).split('_')[1], fill=(255, 255, 0))
    ims.append(im)
cols = A.cols or (8 if ims[0].height > ims[0].width else 5); w, h = ims[0].size; rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * w, rows * h))
for i, im in enumerate(ims): sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(A.out, quality=85); print('总览', A.out, f'{len(ims)} 张')
