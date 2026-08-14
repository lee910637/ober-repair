"""產生 PWA 安裝用的簡易圖示（無實際素材，先用色塊+文字代替）。"""
from PIL import Image, ImageDraw, ImageFont

BG = (31, 78, 95)       # 深藍綠，呼應手冊封面色調
FG = (255, 255, 255)

def make(size, path, radius_ratio=0.22):
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    r = int(size * radius_ratio)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=r, fill=BG)
    # 簡化的「波形/檢測」符號
    cx, cy = size / 2, size / 2
    w = size * 0.6
    pts = [
        (cx - w / 2, cy),
        (cx - w / 6, cy),
        (cx - w / 14, cy - w / 3),
        (cx + w / 14, cy + w / 3),
        (cx + w / 6, cy),
        (cx + w / 2, cy),
    ]
    d.line(pts, fill=FG, width=max(2, size // 22), joint="curve")
    try:
        font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Bold.ttf", int(size * 0.13))
    except Exception:
        font = ImageFont.load_default()
    text = "17108A"
    bbox = d.textbbox((0, 0), text, font=font)
    tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
    d.text((cx - tw / 2, size * 0.72 - th / 2), text, fill=FG, font=font)
    img.save(path)
    print("wrote", path, size)


make(180, "../app/icons/apple-touch-icon.png")
make(192, "../app/icons/icon-192.png")
make(512, "../app/icons/icon-512.png")
