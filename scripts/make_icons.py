# アプリアイコンを生成するスクリプト
# 実行方法: python scripts/make_icons.py
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")
os.makedirs(OUT, exist_ok=True)

SIZE = 512
img = Image.new("RGB", (SIZE, SIZE), "#0d0d13")
d = ImageDraw.Draw(img)

# 背景: 斜めのグラデーション風(ゴールド→ローズの淡い光)
for y in range(SIZE):
    t = y / SIZE
    r = int(0x0D + t * 0x14)
    g = int(0x0D + t * 0x0C)
    b = int(0x13 + t * 0x14)
    d.line([(0, y), (SIZE, y)], fill=(r, g, b))

# 右上にゴールドの光
glow = Image.new("L", (SIZE, SIZE), 0)
gd = ImageDraw.Draw(glow)
gd.ellipse([SIZE * 0.45, -SIZE * 0.35, SIZE * 1.35, SIZE * 0.55], fill=90)
glow = glow.resize((SIZE, SIZE))
gold = Image.new("RGB", (SIZE, SIZE), (227, 182, 102))
img = Image.composite(gold, img, glow.point(lambda p: min(p, 70)))
d = ImageDraw.Draw(img)

# 文字 "B:F"
font = None
for name in ["arialbd.ttf", "seguisb.ttf", "arial.ttf"]:
    try:
        font = ImageFont.truetype(os.path.join("C:\\Windows\\Fonts", name), 210)
        break
    except OSError:
        continue
if font is None:
    font = ImageFont.load_default()

text = "B:F"
bbox = d.textbbox((0, 0), text, font=font)
w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
x = (SIZE - w) / 2 - bbox[0]
y = (SIZE - h) / 2 - bbox[1] - 14
d.text((x, y), text, font=font, fill=(242, 240, 234))

# 下に小さく "HUB"
try:
    small = ImageFont.truetype("C:\\Windows\\Fonts\\arialbd.ttf", 58)
except OSError:
    small = font
bbox2 = d.textbbox((0, 0), "H U B", font=small)
w2 = bbox2[2] - bbox2[0]
d.text(((SIZE - w2) / 2 - bbox2[0], y + h + 40), "H U B", font=small, fill=(227, 182, 102))

# 各サイズで保存
img.save(os.path.join(OUT, "icon-512.png"))
img.resize((192, 192), Image.LANCZOS).save(os.path.join(OUT, "icon-192.png"))
img.resize((180, 180), Image.LANCZOS).save(os.path.join(OUT, "apple-touch-icon.png"))
img.resize((32, 32), Image.LANCZOS).save(os.path.join(OUT, "favicon-32.png"))
print("アイコンを4サイズ生成しました:", OUT)
