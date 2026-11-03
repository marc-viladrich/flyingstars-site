from pathlib import Path
import subprocess,json,hashlib,time
from PIL import Image, ImageChops, ImageStat
from transition import render_bridge
from header_policy import write_headers
root=Path(__file__).resolve().parents[3]; source=root/'public/media/video-lab/original-v1.mp4'; work=Path(__import__('tempfile').mkdtemp(prefix='fs-loop16-'));base=work/'approved-edit.mkv';master=work/'master-loop.mkv';out=root/'public/media/video-lab';record=[]
segments=[('ground-flight',0,41),('qr-zoom-without-cube',94,158),('hummingbird-puma-brockenriders-catch',240,387),('nfl-single-logo',408,434),('ford-to-dynamic-flyingstars',463,564)]
filters=[]
for i,(name,a,b) in enumerate(segments):
 f=f'[0:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS'

 filters.append(f+f'[s{i}]')
filters.append(''.join(f'[s{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=0[mix]')
filters.append('[mix]fps=25,setpts=N/(25*TB),trim=end_frame=379[v]')
cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','warning','-i',str(source),'-filter_complex',';'.join(filters),'-map','[v]','-an','-c:v','ffv1','-level','3','-threads','2','-y',str(base)]
subprocess.run(cmd,check=True,capture_output=True,timeout=240)
record.append({'role':'source-edit-master','command':cmd,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'segments':segments,'holdFrames':0})
# Extend the approved dynamic logo with an animated zoom, then land on native frame 0.
# The file starts at native frame 1: physical EOF -> start is the original 0 -> 1 motion.
for frame,name in [(378,'outgoing'),(0,'incoming')]:
 cmd=['ffmpeg','-v','error','-i',str(base),'-vf',f'select=eq(n\\,{frame})','-frames:v','1',str(work/(name+'.png'))]
 subprocess.run(cmd,check=True,capture_output=True);record.append({'role':'bridge-input','command':cmd})
render_bridge(Image.open(work/'outgoing.png'),Image.open(work/'incoming.png'),work/'bridge')
bridge_filter='[0:v]trim=start_frame=1:end_frame=379,setpts=PTS-STARTPTS[b];[1:v]scale=out_color_matrix=bt709:out_range=tv,format=yuv420p,setsar=1,setpts=PTS-STARTPTS[t];[0:v]trim=start_frame=0:end_frame=1,setpts=PTS-STARTPTS[h];[b][t][h]concat=n=3:v=1:a=0,fps=25,setpts=N/(25*TB),trim=end_frame=392[v]'
cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','warning','-i',str(base),'-framerate','25','-start_number','1','-i',str(work/'bridge/%03d.png'),'-filter_complex',bridge_filter,'-map','[v]','-an','-c:v','ffv1','-level','3','-threads','2','-color_range','tv','-colorspace','bt709','-color_trc','bt709','-color_primaries','bt709','-y',str(master)]
subprocess.run(cmd,check=True,capture_output=True,timeout=240)
record.append({'role':'lossless-loop-master','command':cmd,'bridgeFrames':14,'derivedFrames':13,'frozenOutputFrames':0,'sourceEndpoints':[563,0],'pillowVersion':__import__('PIL').__version__})
# Reference is a high quality H264 transcode of the same edit, not the byte-identical uncut original.
plans=[('loop16-reference','15,68s · Referenz, volle Auflösung',1918,'h264',12,'loop-reference')]
for width in [1918,1600,1440,1280,960]:
 plans.append((f'loop16-h264-{width}',f'15,68s · H.264 · {width} px',width,'h264',26 if width>1280 else 27,'loop-desktop'))
 plans.append((f'loop16-av1-{width}',f'15,68s · AV1 · {width} px',width,'av1',40 if width==1918 else 38,'loop-desktop'))
plans += [('loop16-mobile-h264-640','15,68s · Mobil H.264 · 640 px',640,'h264',26,'loop-mobile'),('loop16-mobile-av1-640','15,68s · Mobil AV1 · 640 px',640,'av1',36,'loop-mobile')]
old=json.loads((root/'src/data/video-lab.json').read_text());old=[x for x in old if not x['id'].startswith('loop16-')];rows=[]
for key,label,width,codec,crf,group in plans:
 target=out/(key+'-v8.mp4');cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','warning','-i',str(master),'-map','0:v:0','-an','-sn','-dn','-map_metadata','-1']
 if width!=1918:cmd+=['-vf',f'scale={width}:-2']
 if codec=='av1':cmd+=['-c:v','libsvtav1','-preset','7','-crf',str(crf),'-svtav1-params','lp=2:tune=0','-tag:v','av01']
 else:cmd+=['-c:v','libx264','-preset','slow','-crf',str(crf),'-threads','2']
 cmd+=['-pix_fmt','yuv420p','-movflags','+faststart','-y',str(target)]
 started=time.monotonic();r=subprocess.run(cmd,capture_output=True,text=True,timeout=240);assert r.returncode==0,r.stderr
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]));stream=probe['streams'][0];size=target.stat().st_size;duration=float(probe['format']['duration']);assert abs(duration-15.68)<.01 and not any(s['codec_type']=='audio' for s in probe['streams'])
 # AV1 level index comes from the actual elementary stream.
 type_='video/mp4; codecs="av01.0.%02dM.08"'%stream['level'] if codec=='av1' else 'video/mp4; codecs="avc1.640028"'
 rows.append({'id':key,'label':label,'src':'/media/video-lab/'+target.name,'codec':'av1' if codec=='av1' else 'h264','contentType':type_,'bytes':size,'width':stream['width'],'height':stream['height'],'duration':duration,'fps':25,'bitrate':round(size*8/duration),'offset':0,'group':group,'referenceId':'loop16-reference','edit':'radial-zoom-loop-15_68-v8','sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 record.append({'id':key,'command':cmd,'seconds':round(time.monotonic()-started,2),'probe':probe});print(key,size,flush=True)
 (root/'src/data/video-lab.json').write_text(json.dumps(old+rows,ensure_ascii=False,indent=2)+'\n')
(root/'docs/video-lab/round-8/encodes.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
# Share immutable caching, reserve explicit lengths for the current 13 files.
write_headers(root,rows)
print('COMPLETE',len(rows),flush=True)

# Decode the final 1.12s of every approved rendition. Appended freezes must not return.
proof=[]
for v in rows:
 if v['id'] not in ['loop16-h264-1440','loop16-av1-1440','loop16-h264-1280','loop16-av1-1280','loop16-h264-960','loop16-av1-960','loop16-mobile-h264-640','loop16-mobile-av1-640']:continue
 raw=subprocess.check_output(['ffmpeg','-v','error','-sseof','-1.12','-i',str(out/Path(v['src']).name),'-map','0:v:0','-an','-f','framemd5','-']).decode()
 hashes=[line.rsplit(',',1)[-1].strip() for line in raw.splitlines() if not line.startswith('#') and line.strip()]
 assert len(hashes)==28 and len(set(hashes))==28,v['id']
 proof.append({'id':v['id'],'frames':len(hashes),'uniqueDecodedFrames':len(set(hashes)),'sha256':v['sha256']})
(root/'docs/video-lab/round-8/end-motion.json').write_text(json.dumps(proof,indent=2)+'\n')

# Verify the unchanged approved footage separately from the intentional generated bridge.
def decoded_hashes(path):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-an','-f','framemd5','-']).decode()
 return [line.rsplit(',',1)[-1].strip() for line in raw.splitlines() if line and not line.startswith('#')]
original_frames,base_frames,loop_frames=decoded_hashes(source),decoded_hashes(base),decoded_hashes(master)
expected=[frame for _,a,b in segments for frame in original_frames[a:b]]
assert base_frames==expected and len(loop_frames)==392
assert loop_frames[:378]==base_frames[1:] and loop_frames[-1]==base_frames[0]
assert len(set(loop_frames[378:391]))==13
lineage={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourcePassages':[[a,b] for _,a,b in segments],'baseFrames':379,'masterFrames':392,'nativeFrames':379,'derivedFrames':13,'bridgeFrames':14,'allBaseFramesMatchOriginal':True,'nativePrefixMatchesApprovedEdit':True,'lastFrameMatchesOriginalFirst':loop_frames[-1]==original_frames[0],'firstFrameMatchesOriginalSecond':loop_frames[0]==original_frames[1],'bridgeSourceFrames':[563,0],'baseSegments':segments,'qrZoom':{'sourceFrames':[94,118],'outputFrames':[40,64],'matchingDecodedFrames':24,'matchesOriginal':loop_frames[40:64]==original_frames[94:118]},'omissions':{'cubeFramesAbsent':not any(41<=f<94 for _,a,b in segments for f in range(a,b)),'staticLogoFramesAbsent':not any(b>564 for _,a,b in segments),'lastApprovedSourceFrame':563},'boundaryFrameHashes':{'last':loop_frames[-1],'first':loop_frames[0],'sourceFirst':original_frames[0],'sourceSecond':original_frames[1]}}
assert lineage['qrZoom']['matchesOriginal'] and lineage['omissions']['cubeFramesAbsent'] and lineage['omissions']['staticLogoFramesAbsent']
(root/'docs/video-lab/round-8/source-lineage.json').write_text(json.dumps(lineage,indent=2)+'\n')

# Decode three real repeated bitstream cycles, including both wrap boundaries.
mobile=out/'loop16-mobile-h264-640-v8.mp4';repeated=work/'three-cycles.mp4'
cmd=['ffmpeg','-v','error','-stream_loop','2','-i',str(mobile),'-map','0:v:0','-an','-c','copy','-y',str(repeated)]
subprocess.run(cmd,check=True,capture_output=True)
cycles=decoded_hashes(repeated);assert len(cycles)==1176 and cycles[:392]==cycles[392:784]==cycles[784:]
proof={'codec':'h264','width':640,'cycles':3,'decodedFrames':len(cycles),'framesPerCycle':392,'identicalDecodedCycles':True,'boundaryIndices':[[391,392],[783,784]],'command':cmd,'sourceSha256':next(v['sha256'] for v in rows if v['id']=='loop16-mobile-h264-640')}
(root/'docs/video-lab/round-8/repeat-proof.json').write_text(json.dumps(proof,indent=2)+'\n')
