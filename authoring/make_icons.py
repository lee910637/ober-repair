"""
用 Ober-Repair Logo.png（跟本script同一個資料夾）產生 PWA 安裝用圖示。
只取上半部的六邊形圖標（不含下方「Chroma OBER-Repair」文字），
裁切、置中、補白邊成正方形後，輸出各尺寸圖示。
"""
from PIL import Image, ImageChops

SRC_LOGO = "Ober-Repair Logo.png"
FULL_LOGO_OUT = "../app/images/ober-repair-logo.png"  # 首頁用，完整版（含文字）

# 六邊形標誌在原圖裡的裁切框（用 ImageChops.difference 對白底分析得出，
# 若之後換一張新 logo，需重新分析這個框）
MARK_BBOX = (147, 0, 840, 780)
PADDING_RATIO = 0.08  # 四周留白比例


def load_mark():
    im = Image.open(SRC_LOGO).convert("RGBA")
    mark = im.crop(MARK_BBOX)
    w, h = mark.size
    side = int(max(w, h) * (1 + PADDING_RATIO * 2))
    canvas = Image.new("RGBA", (side, side), (255, 255, 255, 255))
    canvas.paste(mark, ((side - w) // 2, (side - h) // 2), mark)
    return canvas


def make(size, path, mark):
    img = mark.resize((size, size), Image.LANCZOS)
    img.save(path)
    print("wrote", path, size)


def main():
    mark = load_mark()
    make(180, "../app/icons/apple-touch-icon.png", mark)
    make(192, "../app/icons/icon-192.png", mark)
    make(512, "../app/icons/icon-512.png", mark)
    make(32, "../app/icons/favicon-32.png", mark)

    # 首頁品牌區用的完整版 logo（含文字），只是複製過去、稍微限制寬度即可
    full = Image.open(SRC_LOGO).convert("RGBA")
    full.thumbnail((700, 700 * full.height // full.width))
    full.save(FULL_LOGO_OUT)
    print("wrote", FULL_LOGO_OUT, full.size)


if __name__ == "__main__":
    main()
