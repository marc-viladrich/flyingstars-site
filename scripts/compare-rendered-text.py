#!/usr/bin/env python3
"""Compare normalized German HTML text against a separately built design reference."""
import argparse
from pathlib import Path
from html.parser import HTMLParser
import json
import re

class Text(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.ignored = 0
        self.parts = []
    def handle_starttag(self, tag, attrs):
        if tag in ('script', 'style'):
            self.ignored += 1
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.ignored -= 1
    def handle_data(self, data):
        if not self.ignored:
            self.parts.append(data)

def contents(root):
    result = {}
    for file in sorted(root.rglob('*.html')):
        relative = file.relative_to(root)
        if relative.parts[0] in ('en', 'nl'):
            continue
        parser = Text()
        parser.feed(file.read_text())
        result[str(relative)] = re.sub(r'\s+', ' ', ' '.join(parser.parts)).strip()
    return result

if __name__ == '__main__':
    cli = argparse.ArgumentParser(description=__doc__)
    cli.add_argument('reference', type=Path)
    cli.add_argument('result', type=Path)
    args = cli.parse_args()
    before, after = contents(args.reference), contents(args.result)
    report = {'referencePages': len(before), 'resultPages': len(after),
              'missing': sorted(before.keys() - after.keys()),
              'added': sorted(after.keys() - before.keys()),
              'different': [key for key in before.keys() & after.keys() if before[key] != after[key]]}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(bool(report['missing'] or report['added'] or report['different']))
