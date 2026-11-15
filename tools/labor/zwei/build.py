#!/usr/bin/env python3
"""From repo root: /Users/marcviladrich/opt/miniconda3/bin/python3 -I tools/labor/zwei/build.py
Requires fontTools + brotli. Sequential build; writes only labor2/pixel-zwei.
Four explicit corner outlines encoded directly as bilinear gvar tuples.
"""
from pathlib import Path
from collections import Counter
from copy import deepcopy
from array import array
import shutil,json
from fontTools.ttLib import TTFont,newTable
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.ttLib.tables._f_v_a_r import Axis
from fontTools.ttLib.tables._g_l_y_f import Glyph,GlyphCoordinates
from fontTools.ttLib.tables.ttProgram import Program
from fontTools.ttLib.tables.TupleVariation import TupleVariation
DOT_DIAMETER=0.80*38
MODULE=38
OVERLAP=2
ROOT=Path(__file__).resolve().parents[3]
SRC=ROOT/'public/fonts/labor/geist-pixel/geist-pixel-variable.woff2'
OUT=ROOT/'public/fonts/labor2/pixel-zwei';OUT.mkdir(parents=True,exist_ok=True)
source=TTFont(SRC);f=instantiateVariableFont(TTFont(SRC),{'ELSH':1},inplace=True)
metrics=deepcopy(f['hmtx'].metrics);origins=Counter();stats=Counter()
def extract(name):
 coords,ends,flags=f['glyf'][name].getCoordinates(f['glyf']);start=0;cells=set()
 for end in ends:
  pts=coords[start:end+1];start=end+1
  x=min(p[0] for p in pts);y=min(p[1] for p in pts)
  assert max(p[0] for p in pts)-x==38 and max(p[1] for p in pts)-y==38,name
  cells.add((x,y));origins[x%38,y%38]+=1
 return cells
cells_by_name={n:extract(n) for n in f.getGlyphOrder()}
def outline(cells,fill,soft):
 points=[];flags=[];ends=[]
 def contour(p,fl):
  points.extend([(round(x),round(y)) for x,y in p]);flags.extend(fl);ends.append(len(points)-1)
 for x,y in sorted(cells):
  # Clockwise cell corners, incoming then control then outgoing point.
  corners=[(0,0,-1,0,0,-1),(0,38,0,1,-1,0),(38,38,1,0,0,1),(38,0,0,-1,1,0)]
  p=[]
  for cx,cy,ix,iy,ox,oy in corners:
   sx=-1 if cx==0 else 1;sy=-1 if cy==0 else 1
   nx=(x+sx*38,y) in cells;ny=(x,y+sy*38) in cells
   diag=(x+sx*38,y+sy*38) in cells
   if not fill:
    inset=(38-DOT_DIAMETER)/2;px=x+(inset if cx==0 else 38-inset);py=y+(inset if cy==0 else 38-inset);r=DOT_DIAMETER/2
   else:
    # Extend only shared edges. Exterior boundary and rounded corners stay exact.
    px=x+cx+(sx*OVERLAP if nx else 0);py=y+cy+(sy*OVERLAP if ny else 0)
    r=19 if soft and not nx and not ny and not diag else 0
   # Incoming/outgoing tangent directions point into the cell.
   p.extend([(px-ix*r,py-iy*r),(px,py),(px-ox*r,py-oy*r)])
  contour(p,[1,0,1]*4)
 # Same left-turn diagonal policy as step 1: fill both empty quadrants.
 vertices={(x+dx,y+dy) for x,y in cells for dx in (0,38) for dy in (0,38)}
 for vx,vy in sorted(vertices):
  quadrants={(sx,sy):((vx+(0 if sx==1 else -38),vy+(0 if sy==1 else -38)) in cells) for sx in (-1,1) for sy in (-1,1)}
  occupied=[q for q,v in quadrants.items() if v]
  diagonal=len(occupied)==2 and occupied[0][0]!=occupied[1][0] and occupied[0][1]!=occupied[1][1]
  if len(occupied)!=3 and not diagonal:continue
  for (sx,sy),occupied_here in quadrants.items():
   if occupied_here:continue
   r=19 if fill and soft else 0
   # Clockwise wedge: vertex, tangent, quadratic concave arc, tangent.
   p=[(vx,vy),(vx+sx*r,vy),(vx,vy),(vx,vy+sy*r)]
   fl=[1,1,0,1]
   if sx*sy==1:p.reverse();fl.reverse()
   contour(p,fl)
 g=Glyph();g.numberOfContours=len(ends)
 if ends:
  g.coordinates=GlyphCoordinates(points);g.flags=array('B',flags);g.flags[0]|=0x40;g.endPtsOfContours=ends;g.program=Program();g.program.fromBytecode(b'')
 return g
for tag in ['STAT','prep','fpgm','cvt ']:
 if tag in f:del f[tag]
for nid,val in {1:'FS Pixel',2:'Regular',3:'FS Pixel 1.000',4:'FS Pixel Regular',6:'FSPixel-Regular',16:'FS Pixel',17:'Regular',10:'Derived from Geist Pixel, Copyright 2026 The Geist Project Authors. SIL OFL 1.1. Per-cell compatible outlines; FILL dots to filled, ROND union rounding.',13:(SRC.parent/'OFL.txt').read_text(),14:'https://openfontlicense.org'}.items():
 f['name'].removeNames(nameID=nid);f['name'].setName(val,nid,3,1,0x409)
f['fvar']=newTable('fvar');f['fvar'].axes=[];f['fvar'].instances=[]
for tag,label in [('FILL','Fill'),('ROND','Roundness')]:
 a=Axis();a.axisTag=tag;a.minValue=0;a.defaultValue=100;a.maxValue=100;a.flags=0;a.axisNameID=f['name'].addName(label);f['fvar'].axes.append(a)
f['gvar']=newTable('gvar');f['gvar'].version=1;f['gvar'].reserved=0;f['gvar'].variations={}
masters={}
for n,cells in cells_by_name.items():
 m={(fi,ro):outline(cells,fi,ro) for fi in (0,1) for ro in (0,1)};masters[n]=m
 base=m[1,1];f['glyf'][n]=base;variations=[]
 if cells:
  coords={key:list(g.coordinates) for key,g in m.items()};s=coords[1,1];h=coords[1,0];d=coords[0,0]
  assert coords[0,0]==coords[0,1]
  assert len(s)==len(h)==len(d)
  for axes,delta in [({'FILL':(-1,-1,0)},[(b[0]-a[0],b[1]-a[1]) for a,b in zip(s,d)]),({'ROND':(-1,-1,0)},[(b[0]-a[0],b[1]-a[1]) for a,b in zip(s,h)]),({'FILL':(-1,-1,0),'ROND':(-1,-1,0)},[(a[0]-b[0],a[1]-b[1]) for a,b in zip(s,h)])]:
   variations.append(TupleVariation(axes,delta+[(0,0)]*4))
  stats['cells']+=len(cells);stats['points']+=len(s);stats['fillets']+=base.numberOfContours-len(cells)
 f['gvar'].variations[n]=variations
f['OS/2']=deepcopy(source['OS/2']);f['hhea']=deepcopy(source['hhea'])
for n in f.getGlyphOrder():f['glyf'][n].recalcBounds(f['glyf'])
f.recalcBBoxes=False;f.flavor='woff2';target=OUT/'fs-pixel-variable.woff2';f.save(target)
shutil.copyfile(SRC.parent/'OFL.txt',OUT/'OFL.txt')
v=TTFont(target)
assert v['hmtx'].metrics==metrics
for tag in ['cmap','OS/2','hhea','GSUB','GPOS','GDEF']:assert source[tag].compile(source)==v[tag].compile(v),tag
for fi in (0,100):
 for ro in (0,100):
  inst=instantiateVariableFont(v,{'FILL':fi,'ROND':ro},inplace=False)
  for n,cells in cells_by_name.items():
   if cells:assert list(inst['glyf'][n].coordinates)==list(masters[n][fi//100,ro//100].coordinates),n
report={'bytes':target.stat().st_size,'glyphs':len(v.getGlyphOrder()),'axes':{'FILL':[0,100,100],'ROND':[0,100,100]},'origins':{str(k):v for k,v in origins.items()},'stats':dict(stats),'points_per_cell':12,'points_per_fillet':4,'overlap_units':OVERLAP,'dot_diameter':DOT_DIAMETER,'verification':'all four corners exact; cmap, metrics, GSUB/GPOS/GDEF preserved'}
(OUT/'build-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report,indent=2))
html='''<!doctype html><meta charset="utf-8"><title>FS Pixel two-axis probe</title><style>@font-face{font-family:pixel;src:url('fs-pixel-variable.woff2')}@font-face{font-family:weich;src:url('/fonts/labor/pixel-weich/fs-pixel-weich.woff2')}body{margin:0;padding:32px;background:#171412;color:#f2ede4}section{border-bottom:1px solid #685b50;padding:20px 0}h2{font:16px system-ui;margin:0;color:#d1bba2}p{margin:12px 0;line-height:1.25}.large{font-size:150px}.heading{font-size:44px}.body{font-size:20px}.small{font-size:13px;letter-spacing:.12em;text-transform:uppercase}.animate{font-family:pixel;font-size:80px;animation:fill 1.6s infinite alternate linear}@keyframes fill{from{font-variation-settings:'FILL' 0,'ROND' 100}to{font-variation-settings:'FILL' 100,'ROND' 100}}</style><h2>FS Pixel · FILL × ROND</h2><p class="animate">Show 27</p>'''
for fi,ro in [(0,100),(25,100),(50,100),(75,100),(100,100),(100,0),(100,50),(None,100)]:
 label=f'FILL {fi} / ROND {ro}' if fi is not None else 'Step 1 / ROND 100'
 html+=f'<section id="fill-{fi}-rond-{ro}"><h2>{label}</h2><div style="font-family:{"pixel" if fi is not None else "weich"};font-variation-settings:\'FILL\' {fi or 0},\'ROND\' {ro}"><p class="large">Show 27</p><p class="heading">Vom Logo bis zur fertigen Show.</p><p class="body">Ihr nennt uns Termin, Ort und Ziel. Größe ß ÄÖÜ 0123456789 €</p><p class="small">48 h Antwort · Ablauf · Anfrage senden</p><p class="body">e a 8 ß · 2 7 w S</p></div></section>'
(OUT/'probe.html').write_text(html)
