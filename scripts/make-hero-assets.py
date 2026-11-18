"""
Prépare les images du hero « Du plan à la réalité » à partir d'une photo (rendu) de bâtiment :
  - <out>/reel.webp       : la photo, optimisée web
  - <out>/plan.webp       : la même vue en « plan d'architecte » (traits blancs sur fond bleu)
  - <out>/depth.png       : carte de profondeur approximative (blanc = proche) pour l'effet 3D parallaxe
Usage : python scripts/make-hero-assets.py <photo_haute_def> <dossier_sortie>
"""
import sys, os
from PIL import Image, ImageFilter, ImageChops, ImageDraw, ImageFont, ImageOps

src, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
SIZE = 2400

photo = Image.open(src).convert('RGB').resize((SIZE, SIZE), Image.LANCZOS)
photo.save(os.path.join(out, 'reel.webp'), 'WEBP', quality=86, method=6)

# ---------- plan d'architecte ----------
W = H = 1600
small = photo.resize((W, H), Image.LANCZOS)
g = ImageOps.grayscale(small).filter(ImageFilter.GaussianBlur(1.4))
kx = ImageFilter.Kernel((3, 3), [-1, 0, 1, -2, 0, 2, -1, 0, 1], scale=1)
ky = ImageFilter.Kernel((3, 3), [-1, -2, -1, 0, 0, 0, 1, 2, 1], scale=1)
gi = ImageOps.invert(g)
edges = ImageChops.lighter(ImageChops.lighter(g.filter(kx), g.filter(ky)), ImageChops.lighter(gi.filter(kx), gi.filter(ky)))
edges = ImageOps.autocontrast(edges, cutoff=1).point(lambda v: 0 if v < 75 else min(255, int((v - 75) * 2.3)))
edges = edges.filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.GaussianBlur(0.7))

bg = Image.new('RGB', (W, H), '#0b2f63')
grad = Image.linear_gradient('L').resize((W, H)).point(lambda v: int(v * 0.4))
bg = Image.composite(Image.new('RGB', (W, H), '#071f45'), bg, grad)
d = ImageDraw.Draw(bg)
for p in range(0, W, 32):
    col = (62, 112, 182) if p % 160 == 0 else (36, 80, 142)
    d.line([(p, 0), (p, H)], fill=col, width=1)
    d.line([(0, p), (W, p)], fill=col, width=1)
glow = edges.filter(ImageFilter.GaussianBlur(4)).point(lambda v: int(v * 0.45))
plan = Image.composite(Image.new('RGB', (W, H), '#7fb4ff'), bg, glow)
plan = Image.composite(Image.new('RGB', (W, H), '#eaf3ff'), plan, edges)

def font(sz, bold=False):
    for f in (['arialbd.ttf'] if bold else ['arial.ttf']):
        try:
            return ImageFont.truetype(f, sz)
        except OSError:
            pass
    return ImageFont.load_default()

c = (232, 242, 255)
d = ImageDraw.Draw(plan)
d.rectangle([30, 30, W - 30, H - 30], outline=c, width=3)
bx0, by0 = W - 560, H - 210
d.rectangle([bx0, by0, W - 30, H - 30], outline=c, width=3, fill=(9, 36, 76))
d.line([bx0, by0 + 64, W - 30, by0 + 64], fill=c, width=2)
d.line([bx0 + 290, by0 + 64, bx0 + 290, H - 30], fill=c, width=2)
d.text((bx0 + 22, by0 + 14), 'TRABAF CONSTRUCTION', font=font(34, True), fill=c)
d.text((bx0 + 22, by0 + 82), 'RÉSIDENCE R+4 + PISCINE', font=font(20), fill=c)
d.text((bx0 + 22, by0 + 118), 'FAÇADE PRINCIPALE', font=font(20), fill=c)
d.text((bx0 + 308, by0 + 82), 'ÉCH. 1:100', font=font(20), fill=c)
d.text((bx0 + 308, by0 + 118), 'PLANCHE A-02', font=font(20), fill=c)
y = 84
d.line([200, y, W - 200, y], fill=c, width=2)
for xx in (200, W - 200):
    d.line([xx, y - 12, xx, y + 12], fill=c, width=3)
d.text((W // 2 - 50, y - 34), '32,40 m', font=font(22), fill=c)
x = 76
d.line([x, 220, x, H - 300], fill=c, width=2)
for yy in (220, H - 300):
    d.line([x - 12, yy, x + 12, yy], fill=c, width=3)
d.text((x + 12, (220 + H - 300) // 2), '16,80 m', font=font(22), fill=c)
plan.resize((SIZE, SIZE), Image.LANCZOS).save(os.path.join(out, 'plan.webp'), 'WEBP', quality=88, method=6)

# ---------- carte de profondeur (heuristique) ----------
N = 512
sm = photo.resize((N, N), Image.BILINEAR)
px = sm.load()
dep = Image.new('L', (N, N))
dp = dep.load()
def smoothstep(a, b, t):
    t = max(0.0, min(1.0, (t - a) / (b - a)))
    return t * t * (3 - 2 * t)
for j in range(N):
    yv = j / (N - 1)
    for i in range(N):
        xv = i / (N - 1)
        r, gg, b = px[i, j]
        lum = (r + gg + b) / 3
        sky = yv < 0.55 and b > r + 12 and lum > 135
        if sky:
            v = 0.0
        else:
            ground = smoothstep(0.42, 1.0, yv)                 # sol : plus proche en bas
            building = smoothstep(0.50, 0.95, xv) * 0.85        # immeuble de droite : premier plan
            far_city = 0.12 if yv < 0.47 and xv < 0.45 else 0.0  # arrière-plan à gauche
            v = max(ground * 0.9, building, 0.25) - far_city
        dp[i, j] = int(max(0, min(1, v)) * 255)
dep = dep.filter(ImageFilter.GaussianBlur(10))
dep.save(os.path.join(out, 'depth.png'))
print('ok')
