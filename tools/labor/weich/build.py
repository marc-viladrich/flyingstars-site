#!/usr/bin/env python3
# From repo root: /Users/marcviladrich/opt/miniconda3/bin/python3 -I tools/labor/weich/build.py
# Only fontTools + its WOFF2 dependency are required. Sequential, no external geometry library.
from pathlib import Path
from collections import Counter, defaultdict
from math import hypot, atan2
from copy import deepcopy
from fontTools.ttLib import TTFont, newTable
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.ttLib.tables._f_v_a_r import Axis, NamedInstance
from fontTools.ttLib.tables.TupleVariation import TupleVariation
from fontTools.pens.ttGlyphPen import TTGlyphPen
import json, shutil
ROOT=Path(__file__).resolve().parents[3]
OUT=ROOT/'public/fonts/labor2/geist-pixel-weich'
SRC=ROOT/'public/fonts/labor/geist-pixel/geist-pixel-variable.woff2'
OUT.mkdir(parents=True,exist_ok=True)
f=instantiateVariableFont(TTFont(SRC),{'ELSH':1},inplace=True)
original_metrics=deepcopy(f['hmtx'].metrics)
original_cmap=f.getBestCmap().copy()
polygons={}; stats=Counter(); origins=Counter()
for name in f.getGlyphOrder():
 coords,ends,flags=f['glyf'][name].getCoordinates(f['glyf']); start=0; cells=set()
 for end in ends:
  pts=coords[start:end+1];start=end+1
  x=min(p[0] for p in pts); y=min(p[1] for p in pts)
  assert max(p[0] for p in pts)-x==38 and max(p[1] for p in pts)-y==38,(name,x,y)
  cells.add((x,y)); origins[x%38,y%38]+=1;stats['pixels']+=1
 edges=set()
 for x,y in cells:
  p=[(x,y),(x,y+38),(x+38,y+38),(x+38,y)]
  for a,b in zip(p,p[1:]+p[:1]):
   if (b,a) in edges:edges.remove((b,a))
   else:edges.add((a,b))
 # Separate half-module grids occur in different glyphs, never overlap within a glyph.
 outgoing=defaultdict(set)
 for a,b in edges:outgoing[a].add(b)
 loops=[]
 while edges:
  a,b=min(edges); first=a;loop=[a]
  while True:
   edges.remove((a,b));outgoing[a].remove(b)
   if b==first:break
   loop.append(b); candidates=outgoing[b]
   assert candidates,(name,b)
   if len(candidates)>1:stats['diagonal_junctions']+=1
   dx,dy=b[0]-a[0],b[1]-a[1]
   # Left turn joins diagonal-only cells. Right turn would isolate their contours.
   c=max(candidates,key=lambda c:atan2(dx*(c[1]-b[1])-dy*(c[0]-b[0]),dx*(c[0]-b[0])+dy*(c[1]-b[1])))
   a,b=b,c
  clean=[]
  for i,p in enumerate(loop):
   a=loop[i-1];b=loop[(i+1)%len(loop)]
   if (p[0]-a[0])*(b[1]-p[1])!=(p[1]-a[1])*(b[0]-p[0]):clean.append(p)
  loops.append(clean)
 polygons[name]=loops

def outline(loops,r):
 from fontTools.ttLib.tables._g_l_y_f import Glyph, GlyphCoordinates
 from array import array
 g=Glyph();points=[];flags=[];ends=[]
 for loop in loops:
  for i,p in enumerate(loop):
   a=loop[i-1];b=loop[(i+1)%len(loop)];la=hypot(a[0]-p[0],a[1]-p[1]);lb=hypot(b[0]-p[0],b[1]-p[1]);d=min(r,la/2,lb/2)
   entry=tuple(round(p[k]+(a[k]-p[k])*d/la) for k in (0,1));leave=tuple(round(p[k]+(b[k]-p[k])*d/lb) for k in (0,1))
   points.extend([entry,p,leave]);flags.extend([1,0,1])
  ends.append(len(points)-1)
 g.numberOfContours=len(loops)
 if loops:
  g.coordinates=GlyphCoordinates(points);g.flags=array('B',flags);g.endPtsOfContours=ends
  from fontTools.ttLib.tables.ttProgram import Program
  g.program=Program();g.program.fromBytecode(b'')
 return g

for tag in ['STAT','prep','fpgm','cvt ']:
 if tag in f:del f[tag]
for nid,value in {1:'FS Pixel Weich',2:'Regular',3:'FS Pixel Weich 1.000',4:'FS Pixel Weich Regular',6:'FSPixelWeich-Regular',16:'FS Pixel Weich',17:'Regular',10:'Merged-outline rounding derived from Geist Pixel, Copyright 2026 The Geist Project Authors. SIL OFL 1.1. ROND controls radius from 0 to 19 units. Quadratic corner fillets; diagonal contact bridges grow with radius.',13:(SRC.parent/'OFL.txt').read_text(),14:'https://openfontlicense.org'}.items():
 f['name'].removeNames(nameID=nid)
 f['name'].setName(value,nid,3,1,0x409)
f['fvar']=newTable('fvar'); axis=Axis();axis.axisTag='ROND';axis.minValue=0;axis.defaultValue=0;axis.maxValue=100;axis.flags=0;axis.axisNameID=f['name'].addName('Roundness');f['fvar'].axes=[axis];f['fvar'].instances=[]
f['gvar']=newTable('gvar');f['gvar'].version=1;f['gvar'].reserved=0;f['gvar'].variations={}
for name,loops in polygons.items():
 base=outline(loops,0);rounded=outline(loops,19)
 assert len(base.coordinates)==len(rounded.coordinates) if loops else True
 f['glyf'][name]=base
 if loops:
  delta=[(b[0]-a[0],b[1]-a[1]) for a,b in zip(base.coordinates,rounded.coordinates)]+[(0,0)]*4
  f['gvar'].variations[name]=[TupleVariation({'ROND':(0,1,1)},delta)]
 else:f['gvar'].variations[name]=[]
for v in [0,25,50,75,100]:
 inst=NamedInstance();inst.subfamilyNameID=f['name'].addName('Round '+str(v));inst.coordinates={'ROND':v};f['fvar'].instances.append(inst)
source_tables=TTFont(SRC)
f['OS/2']=deepcopy(source_tables['OS/2'])
f['hhea']=deepcopy(source_tables['hhea'])
for name in f.getGlyphOrder():f['glyf'][name].recalcBounds(f['glyf'])
f.recalcBBoxes=False
f.flavor='woff2';target=OUT/'geist-pixel-weich-variable.woff2';f.save(target)
shutil.copyfile(SRC.parent/'OFL.txt',OUT/'OFL.txt')
v=TTFont(target)
assert v.getGlyphOrder()==f.getGlyphOrder() and v.getBestCmap()==original_cmap
assert v['hmtx'].metrics==original_metrics
for tag in ['cmap','OS/2','hhea','GSUB','GPOS','GDEF']:
 assert source_tables[tag].compile(source_tables)==v[tag].compile(v),tag
for amount in [0,25,50,75,100]:
 check=instantiateVariableFont(v,{'ROND':amount},inplace=False)
 assert all(check['glyf'][n].numberOfContours>0 for n,p in polygons.items() if p)
report={'module':38,'origins':{str(k):v for k,v in origins.items()},'stats':dict(stats),'glyphs':len(v.getGlyphOrder()),'cmap':len(original_cmap),'source_bytes':SRC.stat().st_size,'output_bytes':target.stat().st_size,'verification':'glyph order, best cmap, hmtx identical; all nonempty outlines remain nonempty at 0/25/50/75/100'}
(OUT/'build-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
rows=[('Original Square','original',1),('Original Circle','original',20)]+[(f'Weich ROND {v}','weich',v) for v in [0,25,50,75,100]]
html='''<!doctype html><meta charset="utf-8"><title>FS Pixel Weich probe</title><style>@font-face{font-family:original;src:url('../../labor/geist-pixel/geist-pixel-variable.woff2')}@font-face{font-family:weich;src:url('geist-pixel-weich-variable.woff2');font-weight:100 900}*{box-sizing:border-box}body{margin:0;padding:32px;background:#171412;color:#f2ede4}section{padding:24px 0;border-bottom:1px solid #685b50}h2{font:16px system-ui;color:#d1bba2;margin:0 0 16px}p{margin:12px 0;line-height:1.25}.large{font-size:150px}.heading{font-size:44px}.body{font-size:20px}.small{font-size:13px;letter-spacing:.12em;text-transform:uppercase}.tiny{font-size:11px;letter-spacing:.12em;text-transform:uppercase}</style>'''
for label,family,value in rows:
 axis='ELSH' if family=='original' else 'ROND'
 html+=f'<section><h2>{label}</h2><div style="font-family:{family};font-variation-settings:\'{axis}\' {value}"><p class="large">Show 27</p><p class="heading">Vom Logo bis zur fertigen Show.</p><p class="body">Ihr nennt uns Termin, Ort und Ziel. Größe ß ÄÖÜ 0123456789 €</p><p class="small">48 h Antwort · Ablauf · Anfrage senden</p><p class="tiny">48 h Antwort · Ablauf · Anfrage senden</p><p class="body">Counter / Diagonalen: e a 8 ß · 2 7 w S</p></div></section>'
(OUT/'probe.html').write_text(html)
