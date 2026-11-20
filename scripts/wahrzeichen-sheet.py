# Zeichnet den Kontaktbogen aus scripts/wahrzeichen-sheet.mjs: je Wahrzeichen eine Zeile, je Fassung/Drohnenzahl eine
# Spalte (Spaltennamen in der JSON-Datei). Lichter additiv wie auf der Bühne, Helligkeit aus dem Licht der Drohne.
# Aufruf: python3 scripts/wahrzeichen-sheet.py <ein.json> <aus.png> [Zellgröße]
import json, sys
import numpy as np
from PIL import Image, ImageDraw

data = json.load(open(sys.argv[1]))
CELL = int(sys.argv[3]) if len(sys.argv) > 3 else 260
PAD, HEAD, LEFT = 16, 24, 110
cols, rows = data["cols"], data["rows"]
W, H = LEFT + CELL * len(cols), HEAD + CELL * len(rows)
img = np.zeros((H, W, 3), np.float32)
img[:] = (6, 8, 18)


def dots(cell_x, cell_y, pts, radius):
    half = (CELL - 2 * PAD) / 2
    cx, cy = cell_x + CELL / 2, cell_y + CELL / 2
    for x, y, pr, a, r, g, b in pts:
        px, py = cx + x * half, cy - y * half
        R = radius * pr
        x0, x1, y0, y1 = int(px - 2 * R), int(px + 2 * R) + 1, int(py - 2 * R), int(py + 2 * R) + 1
        x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
        if x0 >= x1 or y0 >= y1:
            continue
        yy, xx = np.mgrid[y0:y1, x0:x1]
        d2 = ((xx - px) ** 2 + (yy - py) ** 2) / (R * R)
        k = np.exp(-d2 * 1.6) * min(1.4, a)
        img[y0:y1, x0:x1] += k[..., None] * np.array([r, g, b], np.float32)[None, None, :] * 0.9


for ri, row in enumerate(rows):
    for ci, cell in enumerate(row["cells"]):
        if not cell:
            continue
        n = max(1, cell["n"])
        dots(LEFT + ci * CELL, HEAD + ri * CELL, cell["pts"], 1.7 * min(1.4, (200 / n) ** 0.5))
out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
d = ImageDraw.Draw(out)
for ci, c in enumerate(cols):
    d.text((LEFT + ci * CELL + 8, 6), c, fill=(170, 175, 190))
for ri, row in enumerate(rows):
    d.text((8, HEAD + ri * CELL + CELL // 2 - 6), row["key"], fill=(170, 175, 190))
    for ci, cell in enumerate(row["cells"]):
        if cell:
            d.text((LEFT + ci * CELL + 8, HEAD + ri * CELL + CELL - 16), cell.get("note", ""), fill=(120, 125, 140))
out.save(sys.argv[2])
