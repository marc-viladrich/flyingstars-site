"""Deterministic visual zoom bridge. No generated content or audio."""
from PIL import Image, ImageFilter

FRAMES = 14
POWER = 8
BLUR_AT_1918 = 28
SAMPLES = 7
SHUTTER_STEP = .018


def ease(value):
    value = max(0, min(1, value))
    return value * value * (3 - 2 * value)


def zoom(image, scale, center):
    width, height = image.size
    crop_width, crop_height = width / scale, height / scale
    left = max(0, min(width - crop_width, width * center[0] - crop_width / 2))
    top = max(0, min(height - crop_height, height * center[1] - crop_height / 2))
    return image.resize(image.size, Image.Resampling.LANCZOS,
                        box=(left, top, left + crop_width, top + crop_height))


def motion(image, position, outgoing):
    result = None
    for index in range(SAMPLES):
        sample = max(0, min(1, position + (index - 3) * SHUTTER_STEP))
        scale = 1 + (POWER * sample ** 2 if outgoing else POWER * .9 * (1 - sample) ** 3)
        shot = zoom(image, scale, (.53, .45) if outgoing else (.50, .38))
        result = shot if result is None else Image.blend(result, shot, 1 / (index + 1))
    sigma = BLUR_AT_1918 * image.width / 1918
    sigma *= ease(position / .7) if outgoing else 1 - ease((position - .35) / .65)
    return result.filter(ImageFilter.GaussianBlur(sigma))


def render_bridge(outgoing, incoming, directory):
    """13 transformed frames. The 14th is native incoming frame 0 in FFmpeg."""
    outgoing, incoming = outgoing.convert('RGB'), incoming.convert('RGB')
    assert outgoing.size == incoming.size
    directory.mkdir(parents=True, exist_ok=True)
    for index in range(1, FRAMES):
        position = index / FRAMES
        image = Image.blend(motion(outgoing, position, True), motion(incoming, position, False),
                            ease((position - .28) / .48))
        image.save(directory / f'{index:03d}.png')
