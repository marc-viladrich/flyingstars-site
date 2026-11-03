from pathlib import Path
import subprocess,json,hashlib,time
root=Path(__file__).resolve().parents[3]; source=root/'public/media/video-lab/original-v1.mp4'; master=Path(__import__('tempfile').mkdtemp(prefix='fs-cut15d-'))/'master-motion.mkv';out=root/'public/media/video-lab';record=[]
segments=[('ground-flight',0,41),('qr-zoom-without-cube',94,158),('hummingbird-puma-brockenriders-catch',240,387),('nfl-single-logo',408,434),('ford-to-dynamic-flyingstars',463,564)]
filters=[]
for i,(name,a,b) in enumerate(segments):
 f=f'[0:v]trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS'

 filters.append(f+f'[s{i}]')
filters.append(''.join(f'[s{i}]' for i in range(len(segments)))+f'concat=n={len(segments)}:v=1:a=0[mix]')
filters.append('[mix]fps=25,setpts=N/(25*TB),trim=end_frame=379[v]')
cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','warning','-i',str(source),'-filter_complex',';'.join(filters),'-map','[v]','-an','-c:v','ffv1','-level','3','-threads','2','-y',str(master)]
subprocess.run(cmd,check=True,capture_output=True,timeout=240)
record.append({'role':'lossless-edit-master','command':cmd,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'segments':segments,'holdFrames':0})
# Reference is a high quality H264 transcode of the same edit, not the byte-identical uncut original.
plans=[('cut15d-reference','15,16s · Referenz, volle Auflösung',1918,'h264',12,'final-reference')]
for width in [1918,1600,1440,1280,960]:
 plans.append((f'cut15d-h264-{width}',f'15,16s · H.264 · {width} px',width,'h264',26 if width>1280 else 27,'final-desktop'))
 plans.append((f'cut15d-av1-{width}',f'15,16s · AV1 · {width} px',width,'av1',40 if width==1918 else 38,'final-desktop'))
plans += [('cut15d-mobile-h264-640','15,16s · Mobil H.264 · 640 px',640,'h264',26,'final-mobile'),('cut15d-mobile-av1-640','15,16s · Mobil AV1 · 640 px',640,'av1',36,'final-mobile')]
old=json.loads((root/'src/data/video-lab.json').read_text());old=[x for x in old if not x['id'].startswith('cut15d-')];rows=[]
for key,label,width,codec,crf,group in plans:
 target=out/(key+'-v7.mp4');cmd=['ffmpeg','-nostdin','-hide_banner','-loglevel','warning','-i',str(master),'-map','0:v:0','-an','-sn','-dn','-map_metadata','-1']
 if width!=1918:cmd+=['-vf',f'scale={width}:-2']
 if codec=='av1':cmd+=['-c:v','libsvtav1','-preset','7','-crf',str(crf),'-svtav1-params','lp=2:tune=0','-tag:v','av01']
 else:cmd+=['-c:v','libx264','-preset','slow','-crf',str(crf),'-threads','2']
 cmd+=['-pix_fmt','yuv420p','-movflags','+faststart','-y',str(target)]
 started=time.monotonic();r=subprocess.run(cmd,capture_output=True,text=True,timeout=240);assert r.returncode==0,r.stderr
 probe=json.loads(subprocess.check_output(['ffprobe','-v','error','-show_streams','-show_format','-of','json',str(target)]));stream=probe['streams'][0];size=target.stat().st_size;duration=float(probe['format']['duration']);assert abs(duration-15.16)<.01 and not any(s['codec_type']=='audio' for s in probe['streams'])
 # AV1 level index comes from the actual elementary stream.
 type_='video/mp4; codecs="av01.0.%02dM.08"'%stream['level'] if codec=='av1' else 'video/mp4; codecs="avc1.640028"'
 rows.append({'id':key,'label':label,'src':'/media/video-lab/'+target.name,'codec':'av1' if codec=='av1' else 'h264','contentType':type_,'bytes':size,'width':stream['width'],'height':stream['height'],'duration':duration,'fps':25,'bitrate':round(size*8/duration),'offset':0,'group':group,'referenceId':'cut15d-reference','edit':'dynamic-ending-no-cube-15_16-v7','sha256':hashlib.sha256(target.read_bytes()).hexdigest()})
 record.append({'id':key,'command':cmd,'seconds':round(time.monotonic()-started,2),'probe':probe});print(key,size,flush=True)
 (root/'src/data/video-lab.json').write_text(json.dumps(old+rows,ensure_ascii=False,indent=2)+'\n')
(root/'docs/video-lab/round-7/encodes.json').write_text(json.dumps(record,ensure_ascii=False,indent=2)+'\n')
# Keep known lengths for WebKit and immutable versioned files. Replace only this round's generated rules.
p=root/'public/_headers';s=p.read_text();marker='# Video-Lab dynamic ending without Cube v7';
import re
for v in rows:s=re.sub(r'(?m)^'+re.escape(v['src'])+r'\n(?:[ \t]+[^\n]*\n)*', '', s)
s=s.replace(marker, '').rstrip()+'\n\n'+marker+'\n'
for v in rows:s+=f"{v['src']}\n  Content-Type: video/mp4\n  Content-Length: {v['bytes']}\n  Cache-Control: public, max-age=31536000, immutable, no-transform\n\n"
p.write_text(s.rstrip()+'\n')
print('COMPLETE',len(rows),flush=True)

# Decode the final 1.12s of every approved rendition. Appended freezes must not return.
proof=[]
for v in rows:
 if v['id'] not in ['cut15d-h264-1440','cut15d-av1-1440','cut15d-h264-1280','cut15d-av1-1280','cut15d-h264-960','cut15d-av1-960','cut15d-mobile-h264-640','cut15d-mobile-av1-640']:continue
 raw=subprocess.check_output(['ffmpeg','-v','error','-sseof','-1.12','-i',str(out/Path(v['src']).name),'-map','0:v:0','-an','-f','framemd5','-']).decode()
 hashes=[line.rsplit(',',1)[-1].strip() for line in raw.splitlines() if not line.startswith('#') and line.strip()]
 assert len(hashes)==28 and len(set(hashes))==28,v['id']
 proof.append({'id':v['id'],'frames':len(hashes),'uniqueDecodedFrames':len(set(hashes)),'sha256':v['sha256']})
(root/'docs/video-lab/round-7/end-motion.json').write_text(json.dumps(proof,indent=2)+'\n')

# Verify every source passage, with no Cube frames and no later static logo shot.
def decoded_hashes(path):
 raw=subprocess.check_output(['ffmpeg','-v','error','-i',str(path),'-map','0:v:0','-an','-f','framemd5','-']).decode()
 return [line.rsplit(',',1)[-1].strip() for line in raw.splitlines() if line and not line.startswith('#')]
original_frames,edit_frames=decoded_hashes(source),decoded_hashes(master)
expected_frames=[frame for _,a,b in segments for frame in original_frames[a:b]]
assert edit_frames==expected_frames
lineage={'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'sourceFrames':len(original_frames),'masterFrames':len(edit_frames),'sourcePassages':[[a,b] for _,a,b in segments],'matchingDecodedFrames':len(edit_frames),'allFramesMatchOriginal':True,'extraInsertedCuts':len(segments)-1,'segments':segments,'qrZoom':{'sourceFrames':[94,118],'outputFrames':[41,65],'matchingDecodedFrames':24,'matchesOriginal':edit_frames[41:65]==original_frames[94:118]}}
selected_frames=[f for _,a,b in segments for f in range(a,b)]
lineage['omissions']={'cubeFramesAbsent':not any(41<=f<94 for f in selected_frames),'staticLogoFramesAbsent':not any(f>=564 for f in selected_frames),'lastSourceFrame':selected_frames[-1]}
assert lineage['qrZoom']['matchesOriginal'] and lineage['omissions']['cubeFramesAbsent'] and lineage['omissions']['staticLogoFramesAbsent']
(root/'docs/video-lab/round-7/source-lineage.json').write_text(json.dumps(lineage,indent=2)+'\n')
