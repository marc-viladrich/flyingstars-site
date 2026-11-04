#!/usr/bin/env python3
"""Compare rendered copy, link targets, SEO metadata and form contracts of two Astro builds."""
import argparse
from html.parser import HTMLParser
from pathlib import Path
import json
import re

class PublicOutput(HTMLParser):
    def __init__(self):
        super().__init__()
        self.skip = 0
        self.text = []
        self.contracts = []
    def handle_starttag(self, tag, attrs):
        values = dict(attrs)
        if tag in ('script', 'style'):
            self.skip += 1
        fields = {
            'html': ['lang'], 'a': ['href'],
            'meta': ['name', 'property', 'content', 'http-equiv'],
            'link': ['rel', 'hreflang', 'href'],
            'form': ['id', 'action', 'method'],
            'input': ['id', 'name', 'type', 'value', 'min', 'max', 'step', 'required'],
            'option': ['value', 'selected'],
        }.get(tag)
        if tag == 'link' and values.get('rel') not in ('canonical', 'alternate'):
            return
        if fields:
            self.contracts.append((tag, {key: values[key] for key in fields if key in values}))
    def handle_endtag(self, tag):
        if tag in ('script', 'style'):
            self.skip -= 1
    def handle_data(self, data):
        if not self.skip:
            self.text.append(data)
    def output(self):
        return {'text': re.sub(r'\s+', ' ', ''.join(self.text)).strip(), 'contracts': self.contracts}

def read(path):
    parser = PublicOutput()
    parser.feed(path.read_text())
    return parser.output()

if __name__ == '__main__':
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('before', type=Path)
    args.add_argument('after', type=Path)
    options = args.parse_args()
    before = {path.relative_to(options.before) for path in options.before.rglob('*.html')}
    after = {path.relative_to(options.after) for path in options.after.rglob('*.html')}
    changes = []
    for path in sorted(before & after):
        old, new = read(options.before / path), read(options.after / path)
        if old != new:
            changes.append({'file': str(path), 'text': old['text'] != new['text'], 'contracts': old['contracts'] != new['contracts']})
    report = {'htmlFiles': len(before), 'removed': sorted(map(str, before-after)), 'added': sorted(map(str, after-before)), 'changes': changes}
    print(json.dumps(report, ensure_ascii=False, indent=2))
    raise SystemExit(bool(report['removed'] or report['added'] or changes))
