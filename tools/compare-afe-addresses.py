#!/usr/bin/env python3
"""Compare the full multiset of AFE addresses per rendered route, including section ownership."""
import json,sys
from html.parser import HTMLParser
from collections import Counter
from pathlib import Path
class Markers(HTMLParser):
    def __init__(self):
        super().__init__(); self.addresses=Counter()
    def handle_starttag(self,tag,attrs):
        for key,value in attrs:
            if key!='data-afe': continue
            data=json.loads(value)
            for marker in data.get('markers',[data]):
                for address in [marker.get('address'),marker.get('membership'),*marker.get('addresses',[])]:
                    if address: self.addresses[json.dumps(address,sort_keys=True)]+=1
before,after=map(Path,sys.argv[1:3])
files=[{str(p.relative_to(root)) for p in root.rglob('*.html')} for root in (before,after)]
changed=[];counts=[0,0]
for route in sorted(files[0]&files[1]):
    snapshots=[]
    for i,root in enumerate((before,after)):
        parser=Markers();parser.feed((root/route).read_text());snapshots.append(parser.addresses);counts[i]+=sum(parser.addresses.values())
    if snapshots[0]!=snapshots[1]: changed.append(route)
report={'routes':len(files[0]),'addressCounts':counts,'changedRoutes':changed,'added':sorted(files[1]-files[0]),'removed':sorted(files[0]-files[1])}
print(json.dumps(report,indent=2))
sys.exit(bool(changed or files[0]!=files[1]))
