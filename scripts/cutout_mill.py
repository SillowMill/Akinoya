"""One-off asset pipeline: cut the playable 'Mill' character (panel 2, 3/4 view) out of the
character-locking turnaround sheet MilLLL.PNG and write a small transparent PNG for the runner."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

SRC = 'src/assets/images/character_locking/MilLLL.PNG'
img = Image.open(SRC).convert('RGB')
W, H = img.size
a = np.asarray(img).astype(int)

# Panel separators are near-white vertical bands in the top row.
row = a[100:800]
white_cols = np.where((row.min(axis=2) > 225).mean(axis=0) > 0.9)[0]
# collapse to bands
bands, start = [], None
prev = None
for c in white_cols:
    if start is None:
        start = c
    elif c != prev + 1:
        bands.append((start, prev)); start = c
    prev = c
if start is not None:
    bands.append((start, prev))
print('bands', bands, 'size', W, H)

col = a[:, 760:1340]
white_rows = np.where((col.min(axis=2) > 225).mean(axis=1) > 0.9)[0]
print('white rows', white_rows[:5], white_rows[-5:], [r for r in white_rows if 100 < r < 1400][:3], [r for r in white_rows if 100 < r < 1400][-3:])

X0, X1 = 750, 1355
rows_mid = [r for r in white_rows if 600 < r < 1200]
Y0 = 9
Y1 = int(min(rows_mid)) if rows_mid else 890
print('panel2 crop', X0, Y0, X1, Y1)
panel = img.crop((X0 + 14, Y0 + 14, X1 - 14, Y1 - 14))
panel.save('tmp_runner/panel2.png')
print(panel.size)

# ---- background removal: edge-aware flood fill (smooth slate backdrop, textured/outlined character) ----
pa = np.asarray(panel).astype(np.float32)
h, w, _ = pa.shape
lum = pa.mean(axis=2)
gy, gx = np.gradient(lum)
grad = np.hypot(gx, gy)
# smooth gradient a little so grain noise does not block but outlines do
grad_img = Image.fromarray(np.clip(grad * 20, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(0.8))
grad = np.asarray(grad_img).astype(np.float32) / 20.0

ring = np.concatenate([pa[0:6].reshape(-1, 3), pa[-6:].reshape(-1, 3), pa[:, 0:6].reshape(-1, 3), pa[:, -6:].reshape(-1, 3)])
bg_med = np.median(ring, axis=0)
print('bg median', bg_med)
dist_global = np.abs(pa - bg_med).sum(axis=2)
GRAD_T = float(sys.argv[1]) if len(sys.argv) > 1 else 3.2
DIST_T = float(sys.argv[2]) if len(sys.argv) > 2 else 60
cand = (dist_global < DIST_T) & (grad < GRAD_T)

seed = np.zeros((h, w), dtype=bool)
seed[0, :] = seed[-1, :] = True
seed[:, 0] = seed[:, -1] = True
bg_mask = seed & cand
frontier = bg_mask.copy()
while frontier.any():
    grown = np.zeros_like(bg_mask)
    grown[1:, :] |= frontier[:-1, :]
    grown[:-1, :] |= frontier[1:, :]
    grown[:, 1:] |= frontier[:, :-1]
    grown[:, :-1] |= frontier[:, 1:]
    new = grown & ~bg_mask & cand
    bg_mask |= new
    frontier = new

# anything non-bg that is NOT connected to the main character blob is a stray (shadow etc) -> keep only largest component
fg = ~bg_mask
lab = np.zeros((h, w), dtype=np.int32)
cur = 0
best, best_n = 0, 0
ys, xs = np.nonzero(fg)
visited = np.zeros((h, w), dtype=bool)
import collections
for y0, x0 in zip(ys, xs):
    if visited[y0, x0]:
        continue
    cur += 1
    q = collections.deque([(y0, x0)])
    visited[y0, x0] = True
    n = 0
    comp = []
    while q:
        y, x = q.popleft()
        comp.append((y, x))
        n += 1
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and fg[yy, xx] and not visited[yy, xx]:
                visited[yy, xx] = True
                q.append((yy, xx))
    if n > best_n:
        best, best_n = cur, n
        best_comp = comp
keep = np.zeros((h, w), dtype=bool)
for y, x in best_comp:
    keep[y, x] = True
print('largest component px', best_n)

# ---- cast-shadow removal: large, smooth, bluish-grey regions (the character's shadow on the backdrop) ----
R, G, B = pa[..., 0], pa[..., 1], pa[..., 2]
lum_img = Image.fromarray(np.clip(lum, 0, 255).astype(np.uint8))
mean = np.asarray(lum_img.filter(ImageFilter.BoxBlur(2))).astype(np.float32)
sq = np.asarray(Image.fromarray(np.clip(lum * lum / 255.0, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(2))).astype(np.float32)
local_std = np.sqrt(np.maximum(sq * 255.0 - mean * mean, 0))
SH_BR = float(sys.argv[3]) if len(sys.argv) > 3 else 11
SH_STD = float(sys.argv[4]) if len(sys.argv) > 4 else 7
shadow_like = (lum > 55) & (lum < 130) & ((B - R) >= SH_BR) & ((B - R) <= 40) & (local_std < SH_STD) & keep
vis2 = np.zeros((h, w), dtype=bool)
removed = 0
sys_ys, sys_xs = np.nonzero(shadow_like)
for y0, x0 in zip(sys_ys, sys_xs):
    if vis2[y0, x0]:
        continue
    q = collections.deque([(y0, x0)]); vis2[y0, x0] = True; comp = []
    while q:
        y, x = q.popleft(); comp.append((y, x))
        for dy, dx in ((1,0),(-1,0),(0,1),(0,-1)):
            yy, xx = y + dy, x + dx
            if 0 <= yy < h and 0 <= xx < w and shadow_like[yy, xx] and not vis2[yy, xx]:
                vis2[yy, xx] = True; q.append((yy, xx))
    if len(comp) > 350:
        removed += len(comp)
        for y, x in comp:
            keep[y, x] = False
print('shadow px removed', removed)
# ---- second pass: leftover shadow splotches between the legs / under the boots (hand-placed polygon, cutout coords) ----
OFFX, OFFY = 128, 12
gap = Image.new('L', (w, h), 0)
ImageDraw.Draw(gap).polygon([(c[0] + OFFX, c[1] + OFFY) for c in
    [(168, 585), (232, 585), (226, 700), (216, 780), (214, 845), (160, 845), (176, 780), (172, 700)]], fill=255)
gap = np.asarray(gap) > 0
below = (np.arange(h)[:, None] * np.ones((1, w))) > (815 + OFFY)
shadow2 = (gap | below) & (lum < 142) & ((B - R) >= 5) & (local_std < 14)
keep &= ~shadow2
alpha = keep.astype(np.uint8) * 255
al = Image.fromarray(alpha)
al = al.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))   # close pinholes
al = al.filter(ImageFilter.MinFilter(3))                                     # erode 1px halo
al = al.filter(ImageFilter.GaussianBlur(0.9))                                # feather
rgba = panel.convert('RGBA')
rgba.putalpha(al)
bbox = rgba.getbbox()
print('bbox', bbox)
rgba = rgba.crop(bbox)
rgba.save('tmp_runner/mill_cutout_full.png')
print('cutout size', rgba.size)

# =====================================================================================
# RIG: slice the cut-out into articulated parts (head / torso / 2 arms / 2 legs) and pack
# them into one small atlas (50 % scale) + a TypeScript metadata module for the runner.
# Coordinates below are in cut-out space (338 x 845 px).
# =====================================================================================
import json, os
cw, ch = rgba.size
cut = np.asarray(rgba).copy()           # RGBA uint8
alpha_full = cut[..., 3] > 8
yy, xx = np.mgrid[0:ch, 0:cw]

def xb_left(y):   # boundary between viewer-left arm and torso
    return np.where(y < 360, 128.0, 118.0 - (y - 360) * 0.127)
def xb_right(y):  # boundary between torso and viewer-right arm
    return np.where(y < 360, 236.0, 236.0 + (y - 360) * 0.07)

arm_l = alpha_full & (yy >= 300) & (xx < xb_left(yy.astype(float))) & (yy <= 620)
arm_r = alpha_full & (yy >= 300) & (xx > xb_right(yy.astype(float))) & (yy <= 620)
# arms may only claim torso pixels from the shoulder-pad region upward if they are outside the torso silhouette
arm_l &= ~((yy < 360) & (xx > 112))
arm_r &= ~((yy < 360) & (xx < 252))
head = alpha_full & (yy < 272)
legs_zone = alpha_full & (yy >= 520) & ~arm_l & ~arm_r
split = 168 + (yy - 548) * 0.12
leg_l = legs_zone & (xx < split)
leg_r = legs_zone & (xx >= split)
torso = alpha_full & (yy >= 225) & (yy < 566) & ~((yy >= 360) & (xx < xb_left(yy.astype(float)))) & ~((yy >= 360) & (xx > xb_right(yy.astype(float))))
# soft vertical feather so cut edges blend when parts rotate
def feather(mask, edge_y, side, px=10):
    a = mask.astype(np.float32)
    if side == 'bottom':
        a *= np.clip((edge_y - yy) / px, 0, 1)
    elif side == 'top':
        a *= np.clip((yy - edge_y) / px, 0, 1)
    return a

PARTS = {
    # name: (mask float, pivot (x, y), draw order)
    'legL':  (leg_l.astype(np.float32) * np.clip((yy - 520) / 14, 0, 1), (138, 552)),
    'armL':  (arm_l.astype(np.float32) * np.clip((yy - 300) / 18, 0, 1), (112, 338)),
    'torso': (torso.astype(np.float32) * np.clip((566 - yy) / 12, 0, 1) * np.clip((yy - 225) / 12, 0, 1), (170, 548)),
    'head':  (head.astype(np.float32) * np.clip((272 - yy) / 16, 0, 1), (166, 262)),
    'legR':  (leg_r.astype(np.float32) * np.clip((yy - 520) / 14, 0, 1), (206, 552)),
    'armR':  (arm_r.astype(np.float32) * np.clip((yy - 300) / 18, 0, 1), (250, 336)),
}
SCALE = 0.5
atlas_items = []
for name, (m, pivot) in PARTS.items():
    ys_, xs_ = np.nonzero(m > 0.02)
    x0_, x1_, y0_, y1_ = xs_.min(), xs_.max() + 1, ys_.min(), ys_.max() + 1
    piece = cut[y0_:y1_, x0_:x1_].copy()
    piece[..., 3] = (piece[..., 3].astype(np.float32) * m[y0_:y1_, x0_:x1_]).astype(np.uint8)
    im = Image.fromarray(piece, 'RGBA')
    sw, sh = max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))
    im = im.resize((sw, sh), Image.LANCZOS)
    atlas_items.append((name, im, int(x0_), int(y0_), int(x1_ - x0_), int(y1_ - y0_), pivot))

pad = 2
atlas_w = max(i[1].width for i in atlas_items) * 2 + pad * 3
cur_x, cur_y, row_h = pad, pad, 0
placed = []
for name, im, x0_, y0_, w0, h0, pivot in atlas_items:
    if cur_x + im.width + pad > atlas_w:
        cur_x, cur_y, row_h = pad, cur_y + row_h + pad, 0
    placed.append((name, im, cur_x, cur_y, x0_, y0_, w0, h0, pivot))
    cur_x += im.width + pad
    row_h = max(row_h, im.height)
atlas_h = cur_y + row_h + pad
atlas = Image.new('RGBA', (atlas_w, atlas_h), (0, 0, 0, 0))
meta = {}
for name, im, ax, ay, x0_, y0_, w0, h0, pivot in placed:
    atlas.alpha_composite(im, (ax, ay))
    meta[name] = dict(sx=ax, sy=ay, sw=im.width, sh=im.height, ox=x0_, oy=y0_, ow=w0, oh=h0, px=pivot[0], py=pivot[1])
os.makedirs('src/assets/images/runner', exist_ok=True)
atlas.save('src/assets/images/runner/mill_rig.png', optimize=True)
os.makedirs('src/components/runner', exist_ok=True)
with open('src/components/runner/millRig.ts', 'w') as f:
    f.write('// AUTO-GENERATED by scripts/cutout_mill.py from MilLLL.PNG (panel 2). Do not edit by hand.\n')
    f.write('export interface RigPart { sx: number; sy: number; sw: number; sh: number; ox: number; oy: number; ow: number; oh: number; px: number; py: number }\n')
    f.write('/** Source-space (cut-out) size of the character the part coordinates refer to. */\n')
    f.write(f'export const RIG_SOURCE = {{ w: {cw}, h: {ch}, atlasScale: {SCALE} }};\n')
    f.write('/** Draw order = back to front. */\n')
    f.write('export const RIG_ORDER = ' + json.dumps(list(PARTS.keys())) + ' as const;\n')
    f.write('export type RigPartName = typeof RIG_ORDER[number];\n')
    f.write('export const RIG_PARTS: Record<RigPartName, RigPart> = ' + json.dumps(meta, indent=2) + ';\n')
print('atlas', atlas.size, 'bytes', os.path.getsize('src/assets/images/runner/mill_rig.png'))
atlas_bg = Image.new('RGBA', atlas.size, (255, 0, 160, 255)); atlas_bg.alpha_composite(atlas); atlas_bg.save('tmp_runner/atlas_check.png')
# reassembly check at rest pose
recon = Image.new('RGBA', (cw, ch), (255, 0, 160, 255))
for name in PARTS:
    mt = meta[name]
    part = atlas.crop((mt['sx'], mt['sy'], mt['sx'] + mt['sw'], mt['sy'] + mt['sh'])).resize((mt['ow'], mt['oh']), Image.LANCZOS)
    recon.alpha_composite(part, (mt['ox'], mt['oy']))
recon.convert('RGB').save('tmp_runner/recon_check.png')
