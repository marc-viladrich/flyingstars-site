"""Fly-through bridge from the moving FlyingStars logo into the moving ground flight.

Both sides keep playing their real frames. The camera pushes into the logo with
accelerating speed, drone lights stretch into radial trails like the native
Ford/NFL transitions, and the ground flight arrives with forward-motion trails
around its own vanishing point that decay to zero. No still frame, no reverse zoom.
"""
import numpy as np
from PIL import Image

OVERLAP = 4                        # frames in which both shots are visible
LOGO = np.array([.45, .41])        # centre of the FS mark in the last logo frames
VANISHING = np.array([.66, .47])   # ground-flight vanishing point
END_SCALE = 7                      # how far the camera pushes into the logo
INCOMING_TRAIL = .55               # trail length on the first ground frame
PAD = .12
LIFT = .08                         # brightness lift at mid-bridge (native zooms: ~8 %)


def smooth(x):
    x = np.clip(x, 0, 1)
    return x * x * (3 - 2 * x)


def resample(img, size, scale, centre, offset):
    """Output pixel p reads `img` at centre + (p + offset - centre) / scale."""
    a = 1 / scale
    (cx, cy), (ox, oy) = centre, offset
    xform = (a, 0, cx + a * (ox - cx), 0, a, cy + a * (oy - cy))
    return np.stack([np.asarray(Image.fromarray(img[..., i]).transform(
        size, Image.Transform.AFFINE, xform, Image.Resampling.BILINEAR), np.float32) for i in range(3)], -1)


def radial(img, factor, centre, samples, tail):
    """Light trail toward `centre`; sample t shows the image shrunk by factor**t."""
    if factor <= 1.0005:
        return img
    size = img.shape[1], img.shape[0]
    acc, total = np.zeros_like(img), 0
    for i in range(samples):
        t = i / (samples - 1)
        weight = np.exp(-tail * t)
        acc += weight * resample(img, size, factor ** -t, centre, (0, 0))
        total += weight
    return acc / total


def streak(frame, scale, trail, centre, toe=0.0):
    """Zoom `frame` by `scale` about `centre` with a forward-motion trail."""
    h, w = frame.shape[:2]
    floor = None
    if toe:  # only the lights streak; the compressed sky haze would smear into a blob
        floor = np.minimum(frame, toe)
        frame = frame - floor
    py, px = int(h * (PAD + trail / 2)), int(w * (PAD + trail / 2))
    lin = np.pad(frame ** 2.2, ((py, py), (px, px), (0, 0)), mode='edge')
    c = (centre[0] * w + px, centre[1] * h + py)
    # Shaped tail first, then two passes that close the gaps between samples.
    lin = radial(lin, 1 + trail, c, 16, 2.0)
    lin = radial(lin, (1 + trail) ** (1 / 15), c, 16, 0)
    lin = radial(lin, (1 + trail) ** (1 / 240), c, 6, 0)
    out = np.clip(resample(lin, (w, h), scale, c, (px, py)), 0, 1) ** (1 / 2.2)
    if floor is not None:
        haze = np.pad(floor, ((py, py), (px, px), (0, 0)), mode='edge')
        out = np.clip(out + resample(haze, (w, h), scale, c, (px, py)), 0, 1)
    # Averaging clipped white cores greys the trails; restore the light colour.
    luma = out @ np.array([.2126, .7152, .0722], np.float32)
    return np.clip(luma[..., None] + (out - luma[..., None]) * (1 + .35 * min(trail, 1)), 0, 1)


def render_bridge(outgoing, incoming):
    """outgoing: last moving logo frames; incoming: first ground frames (PIL RGB).

    Returns len(outgoing) + len(incoming) - OVERLAP frames. The last one equals
    the last incoming frame, so the file can continue with the next native frame.
    """
    load = lambda im: np.asarray(im.convert('RGB'), np.float32) / 255
    n_out, n_in = len(outgoing), len(incoming)
    start_in = n_out - OVERLAP
    scale_at = lambda u: np.exp(np.log(END_SCALE) * u ** 2.4)
    frames = []
    len_total = n_out + n_in - OVERLAP
    luma = lambda img: float((img @ np.array([.2126, .7152, .0722], np.float32)).mean())
    start_luma, end_luma = luma(load(outgoing[0])), luma(load(incoming[-1]))
    for k in range(len_total):
        out_img = in_img = None
        if k < n_out:
            u = k / (n_out - 1)
            s, prev = scale_at(u), scale_at(max(0, u - 1 / (n_out - 1)))
            centre = LOGO + (VANISHING - LOGO) * smooth(u)
            out_img = streak(load(outgoing[k]), s, s / prev - 1, centre, toe=.045)
            out_alpha = 1 - smooth((k - start_in + 1) / (OVERLAP + 1))
        if k >= start_in:
            v = (k - start_in) / (n_in - 1)
            in_img = streak(load(incoming[k - start_in]), 1, INCOMING_TRAIL * (1 - smooth(v)) ** 2, VANISHING)
            in_alpha = smooth((k - start_in + 1) / OVERLAP)
        if out_img is None:
            img = in_img
        elif in_img is None:
            img = out_img
        else:  # crossfade in linear light: no dim double exposure, no flash
            mix = in_alpha / (in_alpha + out_alpha)
            img = ((1 - mix) * out_img ** 2.2 + mix * in_img ** 2.2) ** (1 / 2.2)
        # Smeared light raises the encoded mean; hold exposure on the line between
        # the two native shots, with the same slight lift the native zooms show.
        t = k / (len_total - 1)
        target = (1 - smooth(t)) * start_luma + smooth(t) * end_luma
        target *= 1 + LIFT * np.sin(np.pi * t)
        current = luma(img)
        if 0 < k < len_total - 1 and current > target:
            img = np.clip(img ** 2.2 * (target / current) ** 2.2, 0, 1) ** (1 / 2.2)
        frames.append(Image.fromarray((img * 255 + .5).astype(np.uint8)))
    return frames
