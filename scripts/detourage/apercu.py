#!/usr/bin/env python3
"""Planche de controle : chaque PNG detoure sur fond indigo et fond rose.
Usage : apercu.py SORTIE.jpg fichier1.png [fichier2.png ...]  (ou un dossier)"""
import sys, os, glob
from PIL import Image, ImageDraw

H = int(os.environ.get("APERCU_H", "300"))
COLS = int(os.environ.get("APERCU_COLS", "3"))
out = sys.argv[1]
files = []
for a in sys.argv[2:]:
    files += sorted(glob.glob(os.path.join(a, "**", "*.png"), recursive=True)) if os.path.isdir(a) else [a]
cells = []
for f in files:
    im = Image.open(f).convert("RGBA")
    w = round(im.width * H / im.height)
    im = im.resize((w, H), Image.LANCZOS)
    cell = Image.new("RGB", (2 * w, H + 16), "white")
    for i, col in enumerate(["#2F4B7C", "#F6E3DF"]):
        bgc = Image.new("RGBA", (w, H), col)
        bgc.alpha_composite(im)
        cell.paste(bgc.convert("RGB"), (i * w, 16))
    ImageDraw.Draw(cell).text((3, 2), os.path.basename(f), fill="black")
    cells.append(cell)
cw = max(c.width for c in cells); ch = max(c.height for c in cells)
rows = (len(cells) + COLS - 1) // COLS
sheet = Image.new("RGB", (COLS * cw + (COLS + 1) * 6, rows * ch + (rows + 1) * 6), "#999999")
for i, c in enumerate(cells):
    sheet.paste(c, (6 + (i % COLS) * (cw + 6), 6 + (i // COLS) * (ch + 6)))
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
sheet.save(out, quality=85)
print(out, sheet.size)
