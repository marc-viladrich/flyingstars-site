# Zeichnet den Kontaktbogen aus scripts/catalog-3d-sheet.mjs: je Motiv eine Zeile
# 2D (SPARK) | 3D −30° | 3D 0° | 3D +30° | Bewegung (Spur über 12 s). Lichter additiv wie auf der Bühne.
# Aufruf: python3 scripts/catalog-3d-sheet.py <ein.json> <aus.png>
import json, sys
import numpy as np
from PIL import Image, ImageDraw

CELL, PAD, HEAD = 300, 22, 26
rows = json.load(open(sys.argv[1]))
cols = ["2D (SPARK)", "3D -30°", "3D 0°", "3D +30°", "Bewegung"]
W, H = CELL * len(cols), HEAD + CELL * len(rows)
img = np.zeros((H, W, 3), np.float32)
img[:] = (6, 8, 18)

def dots(cell_x, cell_y, pts, scale=1.0, radius=3.2):
    half = (CELL - 2 * PAD) / 2
    cx, cy = cell_x + CELL / 2, cell_y + CELL / 2
    for x, y, pr, a, r, g, b in pts:
        px, py = cx + x * half, cy - y * half
        R = radius * pr
        x0, x1, y0, y1 = int(px - 2 * R), int(px + 2 * R) + 1, int(py - 2 * R), int(py + 2 * R) + 1
        x0c, y0c = max(x0, 0), max(y0, 0)
        x1c, y1c = min(x1, W), min(y1, H)
        if x0c >= x1c or y0c >= y1c:
            continue
        yy, xx = np.mgrid[y0c:y1c, x0c:x1c]
        d2 = ((xx - px) ** 2 + (yy - py) ** 2) / (R * R)
        k = np.exp(-d2 * 1.6) * min(1.3, a) * scale
        img[y0c:y1c, x0c:x1c] += k[..., None] * np.array([r, g, b], np.float32)[None, None, :] * 0.9

for i, row in enumerate(rows):
    y = HEAD + i * CELL
    dots(0, y, row["flat"])
    for c, v in enumerate(row["views"]):
        dots(CELL * (c + 1), y, v)
    for f in row["trail"]:
        dots(CELL * 4, y, f, scale=0.22, radius=2.6)
    dots(CELL * 4, y, row["trail"][0], scale=0.6, radius=2.6)

out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8))
d = ImageDraw.Draw(out)
for c, name in enumerate(cols):
    d.text((CELL * c + 10, 7), name, fill=(170, 175, 190))
for i, row in enumerate(rows):
    y = HEAD + i * CELL
    label = f'{row["key"]}  {"3D" if row["is3d"] else "nur 2D"}  {row["lit"]}/{row["drones"]}'
    d.text((8, y + 6), label, fill=(200, 200, 210))
    d.line([(0, y), (W, y)], fill=(40, 44, 60))
for c in range(1, len(cols)):
    d.line([(CELL * c, HEAD), (CELL * c, H)], fill=(40, 44, 60))
out.save(sys.argv[2])
print(sys.argv[2], out.size)
