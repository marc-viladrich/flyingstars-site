# Zeichnet den Kontaktbogen aus scripts/catalog-2d-sheet.mjs: je Motiv eine Zeile Katalog | n1 | n2 | …,
# Lichter additiv wie auf der Bühne, Punktgröße wie im Konfigurator kleiner bei mehr Drohnen.
# Aufruf: python3 scripts/catalog-2d-sheet.py <ein.json> <aus.png> [Zeilen je Bild, Standard alle]
import json, sys, math
import numpy as np
from PIL import Image, ImageDraw

CELL, PAD, HEAD = 260, 18, 24
data = json.load(open(sys.argv[1]))
rows = data["rows"]
per = int(sys.argv[3]) if len(sys.argv) > 3 else len(rows)
ncol = 1 + len(data["counts"])

def draw(chunk, path):
    W, H = CELL * ncol, (CELL + HEAD) * len(chunk)
    img = np.zeros((H, W, 3), np.float32); img[:] = (6, 8, 18)
    def dots(cx0, cy0, pts):
        if not pts: return
        xs = [p[0] for p in pts]; ys = [p[1] for p in pts]
        cxm, cym = (max(xs) + min(xs)) / 2, (max(ys) + min(ys)) / 2
        ext = max(max(xs) - min(xs), max(ys) - min(ys)) / 2 or 1
        half = (CELL - 2 * PAD) / 2
        R = max(1.6, min(3.4, 3.4 * math.sqrt(120 / max(120, len(pts)))))
        for x, y, a, r, g, b in pts:
            px, py = cx0 + CELL / 2 + (x - cxm) / ext * half, cy0 + CELL / 2 - (y - cym) / ext * half
            x0, x1, y0, y1 = int(px - 2 * R), int(px + 2 * R) + 2, int(py - 2 * R), int(py + 2 * R) + 2
            x0c, y0c, x1c, y1c = max(x0, 0), max(y0, 0), min(x1, W), min(y1, H)
            if x0c >= x1c or y0c >= y1c: continue
            yy, xx = np.mgrid[y0c:y1c, x0c:x1c]
            k = np.exp(-((xx - px) ** 2 + (yy - py) ** 2) / (R * R) * 1.6) * a
            img[y0c:y1c, x0c:x1c] += k[..., None] * np.array([r, g, b], np.float32)[None, None, :] * 0.95
    for i, row in enumerate(chunk):
        y = i * (CELL + HEAD) + HEAD
        for c, cell in enumerate(row["cells"]): dots(CELL * c, y, cell["pts"])
    out = Image.fromarray(np.clip(img, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(out)
    for i, row in enumerate(chunk):
        y = i * (CELL + HEAD)
        d.line([(0, y), (W, y)], fill=(40, 44, 60))
        for c, cell in enumerate(row["cells"]):
            d.text((CELL * c + 6, y + 6), (row["name"] + " · " if c == 0 else "") + cell["label"], fill=(200, 200, 210))
    for c in range(1, ncol): d.line([(CELL * c, 0), (CELL * c, H)], fill=(40, 44, 60))
    out.save(path); print(path, out.size)

base = sys.argv[2][:-4] if sys.argv[2].endswith('.png') else sys.argv[2]
if per >= len(rows): draw(rows, base + '.png')
else:
    for k in range(0, len(rows), per): draw(rows[k:k + per], f'{base}-{k // per + 1:02d}.png')
