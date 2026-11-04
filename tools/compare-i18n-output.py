#!/usr/bin/env python3
"""Compare ordered text and accessibility/form/media contracts across every HTML route.
Only generated Astro asset hashes and AFE technical marker attributes are ignored.
"""
import argparse,json,re
from pathlib import Path
from html.parser import HTMLParser

def normalize(text):
    return re.sub(r'(/_astro/[^\s\"\'<>/?]*?)[._][A-Za-z0-9_-]{6,}(\.(?:js|css|webp|png|jpe?g|svg))',r'\1.HASH\2',text)

class Signature(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.events=[]
    def handle_starttag(self,tag,attrs):
        contract=[]
        for name,value in attrs:
            if name.startswith('data-afe') or name.startswith('data-editor'): continue
            if name.startswith('aria-') or name in {'alt','title','placeholder','value','selected','checked','disabled','required','multiple','for','id','href','src','srcset','poster','action','method','name','type','role','form','min','max','step','pattern','autocomplete','download','width','height','controls','muted','loop'}:
                contract.append((name,normalize(value or '')))
        self.events.append(('element',tag,sorted(contract)))
    def handle_data(self,data):
        self.events.append(('text',normalize(data)))
    def handle_endtag(self,tag):
        self.events.append(('end',tag))

def signature(path):
    parser=Signature();parser.feed(path.read_text());return parser.events

def compare(before,after):
    old={str(p.relative_to(before)):p for p in before.rglob('*.html')}
    new={str(p.relative_to(after)):p for p in after.rglob('*.html')}
    changed=[]
    for route in sorted(old.keys()&new.keys()):
        a,b=signature(old[route]),signature(new[route])
        if a!=b:
            first=next((i for i,(x,y) in enumerate(zip(a,b)) if x!=y),min(len(a),len(b)))
            changed.append({'route':route,'firstEvent':first,'before':a[first:first+2],'after':b[first:first+2]})
    return {'htmlFiles':len(old),'removed':sorted(old.keys()-new.keys()),'added':sorted(new.keys()-old.keys()),'changes':changed}

if __name__=='__main__':
    args=argparse.ArgumentParser();args.add_argument('before',type=Path);args.add_argument('after',type=Path);a=args.parse_args();result=compare(a.before,a.after);print(json.dumps(result,ensure_ascii=False,indent=2));raise SystemExit(bool(result['removed'] or result['added'] or result['changes']))
