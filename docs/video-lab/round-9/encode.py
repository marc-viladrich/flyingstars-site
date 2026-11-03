"""Round 9: rebuild the hero loop with a fly-through bridge made from moving frames."""
from pathlib import Path
import hashlib, json, subprocess, sys, tempfile, time
from PIL import Image
from transition import render_bridge

ROUND = Path(__file__).resolve().parent
root = ROUND.parents[2]
sys.path.insert(0, str(ROUND.parent / 'round-8'))
from header_policy import write_headers  # noqa: E402

source = root / 'public/media/video-lab/original-v1.mp4'
out = root / 'public/media/video-lab'
work = Path(tempfile.mkdtemp(prefix='fs-loop15-'))
base, master = work / 'approved-edit.mkv', work / 'master-loop.mkv'
EDIT, SUFFIX, DURATION, FRAMES = 'flythrough-loop-15_00-v9', '-v9', 15.0, 375
OUT_FRAMES, IN_FRAMES = 9, 8   # edit 370-378 (logo) and 0-7 (ground flight) are re-rendered
# Default swscale decodes these dark frames ~1.5 levels too dark; the bridge would visibly dip.
SWS = 'accurate_rnd+full_chroma_int+bitexact'
record = []


def run(cmd, **kw):
    subprocess.run(cmd, check=True, capture_output=True, timeout=600, **kw)
    return cmd


def decoded_hashes(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:v:0', '-an', '-f', 'framemd5', '-']).decode()
    return [line.rsplit(',', 1)[-1].strip() for line in raw.splitlines() if line and not line.startswith('#')]


# 1. The approved 379-frame edit from round 7/8, unchanged.
segments = [('ground-flight', 0, 41), ('qr-zoom-without-cube', 94, 158), ('hummingbird-puma-brockenriders-catch', 240, 387),
            ('nfl-single-logo', 408, 434), ('ford-to-dynamic-flyingstars', 463, 564)]
filters = [f'[0:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS[s{i}]' for i, (_, a, b) in enumerate(segments)]
filters.append(''.join(f'[s{i}]' for i in range(len(segments))) + f'concat=n={len(segments)}:v=1:a=0[mix]')
filters.append('[mix]fps=25,setpts=N/(25*TB),trim=end_frame=379[v]')
record.append({'role': 'source-edit-master', 'segments': segments, 'holdFrames': 0, 'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(),
               'command': run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'warning', '-i', str(source), '-filter_complex', ';'.join(filters),
                               '-map', '[v]', '-an', '-c:v', 'ffv1', '-level', '3', '-threads', '2', '-y', str(base)])})

# 2. Bridge from real moving frames on both sides: logo 370-378 pushes in, ground 0-7 arrives.
(work / 'in').mkdir(); (work / 'bridge').mkdir()
cmd = run(['ffmpeg', '-v', 'error', '-i', str(base), '-vf', f'select=gte(n\\,{379 - OUT_FRAMES})+lt(n\\,{IN_FRAMES}),scale=flags={SWS}',
           '-fps_mode', 'passthrough', str(work / 'in/%03d.png')])
stills = [Image.open(p) for p in sorted((work / 'in').glob('*.png'))]
incoming, outgoing = stills[:IN_FRAMES], stills[IN_FRAMES:]
assert len(outgoing) == OUT_FRAMES and len(incoming) == IN_FRAMES
bridge = render_bridge(outgoing, incoming)
for i, frame in enumerate(bridge, 1):
    frame.save(work / f'bridge/{i:03d}.png')
record.append({'role': 'bridge-input', 'command': cmd, 'outgoingEditFrames': [379 - OUT_FRAMES, 378], 'incomingEditFrames': [0, IN_FRAMES - 1]})

# 3. Loop master: native edit 8-369, then the 13-frame bridge. EOF -> start is ground 7 -> 8.
bridge_filter = (f'[0:v]trim=start_frame={IN_FRAMES}:end_frame={379 - OUT_FRAMES},setpts=PTS-STARTPTS[b];'
                 f'[1:v]scale=out_color_matrix=bt709:out_range=tv:flags={SWS},format=yuv420p,setsar=1,setpts=PTS-STARTPTS[t];'
                 '[b][t]concat=n=2:v=1:a=0,setpts=N/(25*TB)[v]')
cmd = run(['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'warning', '-i', str(base), '-framerate', '25', '-start_number', '1',
           '-i', str(work / 'bridge/%03d.png'), '-filter_complex', bridge_filter, '-map', '[v]', '-an', '-r', '25', '-c:v', 'ffv1', '-level', '3',
           '-threads', '2', '-color_range', 'tv', '-colorspace', 'bt709', '-color_trc', 'bt709', '-color_primaries', 'bt709', '-y', str(master)])
record.append({'role': 'lossless-loop-master', 'command': cmd, 'bridgeFrames': len(bridge), 'nativeFrames': FRAMES - len(bridge),
               'frozenOutputFrames': 0, 'pillowVersion': Image.__version__})
assert decoded_hashes(master).__len__() == FRAMES, 'bridge frames lost in concat'
if '--master-only' in sys.argv:
    print(master); sys.exit()

# 4. Same renditions as round 8.
plans = [('loop16-reference', '15,00s · Referenz, volle Auflösung', 1918, 'h264', 12, 'loop-reference')]
for width in [1918, 1600, 1440, 1280, 960]:
    plans.append((f'loop16-h264-{width}', f'15,00s · H.264 · {width} px', width, 'h264', 26 if width > 1280 else 27, 'loop-desktop'))
    plans.append((f'loop16-av1-{width}', f'15,00s · AV1 · {width} px', width, 'av1', 40 if width == 1918 else 38, 'loop-desktop'))
plans += [('loop16-mobile-h264-640', '15,00s · Mobil H.264 · 640 px', 640, 'h264', 26, 'loop-mobile'),
          ('loop16-mobile-av1-640', '15,00s · Mobil AV1 · 640 px', 640, 'av1', 36, 'loop-mobile')]
catalog = json.loads((root / 'src/data/video-lab.json').read_text())
# Keep the round-8 bridge reviewable next to the new one.
previous = next(v for v in catalog if v['id'] == 'loop16-h264-1440')
previous = {**previous, 'id': 'loop16v8-h264-1440', 'label': '15,68s · H.264 · 1440 px · Runde 8 (radialer Zoom)', 'group': 'loop-history'}
catalog = [v for v in catalog if not v['id'].startswith(('loop16-', 'loop16v8-'))]
rows = []
for key, label, width, codec, crf, group in plans:
    target = out / (key + SUFFIX + '.mp4')
    cmd = ['ffmpeg', '-nostdin', '-hide_banner', '-loglevel', 'warning', '-i', str(master), '-map', '0:v:0', '-an', '-sn', '-dn', '-map_metadata', '-1']
    if width != 1918:
        cmd += ['-vf', f'scale={width}:-2']
    if codec == 'av1':
        cmd += ['-c:v', 'libsvtav1', '-preset', '7', '-crf', str(crf), '-svtav1-params', 'lp=2:tune=0', '-tag:v', 'av01']
    else:
        cmd += ['-c:v', 'libx264', '-preset', 'slow', '-crf', str(crf), '-threads', '2']
    cmd += ['-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-y', str(target)]
    started = time.monotonic(); run(cmd)
    probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(target)]))
    stream, size, duration = probe['streams'][0], target.stat().st_size, float(probe['format']['duration'])
    assert abs(duration - DURATION) < .01 and not any(s['codec_type'] == 'audio' for s in probe['streams'])
    type_ = 'video/mp4; codecs="av01.0.%02dM.08"' % stream['level'] if codec == 'av1' else 'video/mp4; codecs="avc1.640028"'
    rows.append({'id': key, 'label': label, 'src': '/media/video-lab/' + target.name, 'codec': codec, 'contentType': type_, 'bytes': size,
                 'width': stream['width'], 'height': stream['height'], 'duration': duration, 'fps': 25, 'bitrate': round(size * 8 / duration),
                 'offset': 0, 'group': group, 'referenceId': 'loop16-reference', 'edit': EDIT, 'sha256': hashlib.sha256(target.read_bytes()).hexdigest()})
    record.append({'id': key, 'command': cmd, 'seconds': round(time.monotonic() - started, 2), 'probe': probe})
    print(key, size, flush=True)
(root / 'src/data/video-lab.json').write_text(json.dumps(catalog + rows + [previous], ensure_ascii=False, indent=2) + '\n')
(ROUND / 'encodes.json').write_text(json.dumps(record, ensure_ascii=False, indent=2) + '\n')
write_headers(root, rows + [previous])

# 5. Proofs: no frozen ending, native footage untouched, real repeated cycles.
proof = []
for v in rows:
    if v['id'] in ('loop16-reference',) or '1918' in v['id'] or '1600' in v['id']:
        continue
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-sseof', '-1.12', '-i', str(out / Path(v['src']).name), '-map', '0:v:0', '-an', '-f', 'framemd5', '-']).decode()
    hashes = [line.rsplit(',', 1)[-1].strip() for line in raw.splitlines() if not line.startswith('#') and line.strip()]
    assert len(hashes) == 28 and len(set(hashes)) == 28, v['id']
    proof.append({'id': v['id'], 'frames': 28, 'uniqueDecodedFrames': 28, 'sha256': v['sha256']})
(ROUND / 'end-motion.json').write_text(json.dumps(proof, indent=2) + '\n')

original, base_frames, loop = decoded_hashes(source), decoded_hashes(base), decoded_hashes(master)
expected = [f for _, a, b in segments for f in original[a:b]]
native = FRAMES - len(bridge)
assert base_frames == expected and len(loop) == FRAMES
assert loop[:native] == base_frames[IN_FRAMES:379 - OUT_FRAMES]
assert len(set(loop[native:])) == len(bridge)
qr_out = [41 - IN_FRAMES, 41 - IN_FRAMES + 24]
lineage = {
    'sourceSha256': hashlib.sha256(source.read_bytes()).hexdigest(), 'sourcePassages': [[a, b] for _, a, b in segments], 'baseSegments': segments,
    'baseFrames': 379, 'masterFrames': FRAMES, 'nativeFrames': native, 'bridgeFrames': len(bridge), 'allBaseFramesMatchOriginal': True,
    'nativeMatchesApprovedEdit': [IN_FRAMES, 379 - OUT_FRAMES],
    'bridge': {'outgoingEditFrames': [379 - OUT_FRAMES, 378], 'incomingEditFrames': [0, IN_FRAMES - 1], 'overlap': OUT_FRAMES + IN_FRAMES - len(bridge),
               'everyBridgeFrameFromMovingFootage': True, 'stillFramesUsed': 0},
    'firstFileFrameIsEditFrame': IN_FRAMES, 'firstFrameMatchesOriginal': loop[0] == original[IN_FRAMES],
    'qrZoom': {'sourceFrames': [94, 118], 'outputFrames': qr_out, 'matchingDecodedFrames': 24, 'matchesOriginal': loop[qr_out[0]:qr_out[1]] == original[94:118]},
    'omissions': {'cubeFramesAbsent': not any(41 <= f < 94 for _, a, b in segments for f in range(a, b)),
                  'staticLogoFramesAbsent': not any(b > 564 for _, a, b in segments), 'lastApprovedSourceFrame': 563}}
assert lineage['qrZoom']['matchesOriginal'] and lineage['firstFrameMatchesOriginal']
(ROUND / 'source-lineage.json').write_text(json.dumps(lineage, indent=2) + '\n')

mobile, repeated = out / f'loop16-mobile-h264-640{SUFFIX}.mp4', work / 'three-cycles.mp4'
cmd = run(['ffmpeg', '-v', 'error', '-stream_loop', '2', '-i', str(mobile), '-map', '0:v:0', '-an', '-c', 'copy', '-y', str(repeated)])
cycles = decoded_hashes(repeated)
assert len(cycles) == 3 * FRAMES and cycles[:FRAMES] == cycles[FRAMES:2 * FRAMES] == cycles[2 * FRAMES:]
(ROUND / 'repeat-proof.json').write_text(json.dumps({'codec': 'h264', 'width': 640, 'cycles': 3, 'decodedFrames': len(cycles), 'framesPerCycle': FRAMES,
    'identicalDecodedCycles': True, 'boundaryIndices': [[FRAMES - 1, FRAMES], [2 * FRAMES - 1, 2 * FRAMES]], 'command': cmd,
    'sourceSha256': next(v['sha256'] for v in rows if v['id'] == 'loop16-mobile-h264-640')}, indent=2) + '\n')
print('COMPLETE', len(rows), work, flush=True)
