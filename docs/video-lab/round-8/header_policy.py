"""Bound the Pages header rules regardless of historical video count."""


def write_headers(root, active_videos):
    path = root / 'public/_headers'
    kept = []
    skip = False
    for line in path.read_text().splitlines():
        if line and not line[0].isspace() and not line.startswith('#'):
            skip = line.startswith('/media/video-lab/')
        if not skip and not line.startswith(('# Video-Lab', '# Review-only video', '# Versioned review media', '# Explicit metadata')):
            kept.append(line)
    text = '\n'.join(kept).rstrip() + '\n\n'
    text += '# Versioned review media; historical files use native MIME and length.\n'
    text += '/media/video-lab/*\n  Cache-Control: public, max-age=31536000, immutable, no-transform\n\n'
    text += '# Explicit metadata for the current hero and comparison encodes only.\n'
    for video in active_videos:
        mime = 'video/webm' if video['codec'] == 'vp9' else 'video/mp4'
        text += f"{video['src']}\n  Content-Type: {mime}\n  Content-Length: {video['bytes']}\n\n"
    path.write_text(text.rstrip() + '\n')
