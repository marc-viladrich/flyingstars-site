/** Exact source slices for shared JSON and a deliberately bounded YAML subset. */
export function sharedSlices(text, codec) {
  if (codec === 'json') return jsonSlices(text);
  if (codec !== 'yaml') throw new Error('Shared source codec is unsupported');
  // Aliases/anchors can depend on bytes outside the selected record.
  if (/(?:^|\s)[&*][\w-]+|<<\s*:/.test(text)) {
    throw new Error('YAML anchors, aliases and merge keys need a YAML CST codec');
  }
  const lines = [...text.matchAll(/^.*(?:\n|$)/gm)].filter(m => m[0]);
  const starts = [];
  let array;
  for (const line of lines) {
    const value = line[0].replace(/\r?\n$/, '');
    if (!value.trim() || /^\s*#/.test(value) || /^(---|\.\.\.)\s*$/.test(value)) continue;
    if (/^\s/.test(value)) continue;
    const sequence = /^-(?:\s|$)/.test(value);
    if (array === undefined) array = sequence;
    if (array !== sequence) throw new Error('Mixed YAML root structure');
    let key;
    if (!sequence) {
      const match = value.match(/^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[A-Za-z0-9_-]+)\s*:(?:\s|$)/);
      if (!match) throw new Error('YAML root needs block mapping keys or a block sequence');
      key = match[1].startsWith('"') ? JSON.parse(match[1])
        : match[1].startsWith("'") ? match[1].slice(1, -1).replaceAll("''", "'") : match[1];
    }
    starts.push({ start: line.index, key });
  }
  if (!array) assertUniqueKeys(starts);
  return { array: array ?? false, records: starts.map((entry, i) => ({
    key: entry.key, raw: text.slice(entry.start, starts[i + 1]?.start ?? text.length),
  })) };
}

function jsonSlices(text) {
  JSON.parse(text); // Syntax validation, while retaining original lexical bytes below.
  let pos = 0;
  const whitespace = () => { while (/\s/.test(text[pos] ?? '') && pos < text.length) pos++; };
  function valueEnd() {
    const start = pos;
    let depth = 0, quoted = false, escaped = false;
    while (pos < text.length) {
      const char = text[pos];
      if (quoted) {
        if (escaped) escaped = false;
        else if (char === '\\') escaped = true;
        else if (char === '"') quoted = false;
      } else if (char === '"') quoted = true;
      else if (char === '{' || char === '[') depth++;
      else if (char === '}' || char === ']') { if (!depth) break; depth--; }
      else if (char === ',' && !depth) break;
      pos++;
    }
    return text.slice(start, pos).trimEnd();
  }
  whitespace();
  const array = text[pos] === '[';
  if (!array && text[pos] !== '{') throw new Error('Shared JSON needs an array or object');
  pos++;
  const records = [];
  while (true) {
    whitespace();
    if (text[pos] === ']' || text[pos] === '}') break;
    let key;
    if (!array) {
      const start = pos++;
      while (text[pos] !== '"') { if (text[pos] === '\\') pos++; pos++; }
      key = JSON.parse(text.slice(start, ++pos));
      whitespace();
      pos++; // colon, already validated by JSON.parse
      whitespace();
    }
    records.push({ key, raw: valueEnd() });
    whitespace();
    if (text[pos] !== ',') break;
    pos++;
  }
  if (!array) assertUniqueKeys(records);
  return { array, records };
}

function assertUniqueKeys(records) {
  if (new Set(records.map(record => record.key)).size !== records.length) {
    throw new Error('Duplicate shared mapping keys have no unambiguous source locator');
  }
}
