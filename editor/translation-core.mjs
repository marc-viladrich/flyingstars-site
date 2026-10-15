// Incremental machine translation: only texts that are new or whose German wording changed are sent.
// A field is fresh when its translation carries sourceHash = sha256(current German text). Identical
// segments are sent once, and a translation memory (hash + locale) makes repeated runs cost nothing.
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";

export const sha256 = (text) => createHash("sha256").update(String(text), "utf8").digest("hex");
const getPath = (data, path) => path.reduce((value, key) => value?.[key], data);
const translatableOwners = /^(page|post|project|faq|client|team|screen|package|site)\//;

// Markdown is translated per paragraph/line so an edited sentence does not resend a whole article.
// Link targets and inline code are protected with tokens and restored afterwards.
export function segmentsOf(field) {
  if (!field.markdown) return [{ prefix: "", text: field.text, suffix: "", join: "" }];
  const parts = [];
  let fence = null;
  for (const block of field.text.split(/(\n{2,})/)) {
    if (/^\n+$/.test(block)) {
      parts.push({ raw: block });
      continue;
    }
    // Code stays untouched, also across blank lines inside the fence.
    const marks = block.match(/^\s*(```|~~~)/gm) || [];
    if (fence || marks.length) {
      parts.push({ raw: block });
      for (const mark of marks) {
        const kind = mark.trim();
        fence = fence === kind ? null : fence || kind;
      }
      continue;
    }
    const lines = block.split("\n");
    const lineWise = lines.length > 1 && lines.every((line) => /^\s*([-*+]|\d+\.|#{1,6})\s/.test(line) || !line.trim());
    for (const [i, line] of (lineWise ? lines : [block]).entries()) {
      const match = /^(\s*(?:[-*+]|\d+\.|#{1,6}|>)\s+)?([\s\S]*?)(\s*)$/.exec(line);
      parts.push({ prefix: match[1] || "", text: match[2], suffix: match[3], join: lineWise && i < lines.length - 1 ? "\n" : "" });
    }
  }
  return parts;
}
function protect(text) {
  const tokens = [];
  const out = text
    // Inline code, {placeholders} and the format marks {o}…{/o}, {c}…{/c} never reach the provider.
    .replace(/`[^`]+`|\{\/?\w+\}/g, (m) => `⟦${tokens.push(m) - 1}⟧`)
    .replace(/\*\*|~~|\*/g, (m) => `⟦${tokens.push(m) - 1}⟧`)
    .replace(/\]\(([^)\s]+)((?:\s+"[^"]*")?)\)/g, (m, url, title) => `](⟦${tokens.push(url) - 1}⟧${title})`);
  return { out, tokens };
}
function restore(text, tokens) {
  return text.replace(/⟦\s*(\d+)\s*⟧/g, (m, i) => tokens[Number(i)] ?? m);
}
// A translation that lost or duplicated a protected link/placeholder is rejected, not stored.
function tokensIntact(translated, tokens) {
  const found = [...translated.matchAll(/⟦\s*(\d+)\s*⟧/g)].map((m) => Number(m[1]));
  return found.length === tokens.length && tokens.every((_, i) => found.filter((n) => n === i).length === 1);
}

export async function loadMemory(file) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return { version: 1, entries: {} };
  }
}
export async function saveMemory(file, memory) {
  const temp = file + ".tmp";
  await fs.writeFile(temp, JSON.stringify(memory, null, 1) + "\n");
  await fs.rename(temp, file);
}

const translationIdFor = (ownerId, locale) => "translation/" + ownerId.replaceAll("/", "-") + "-" + locale;

// Which fields need a (new) translation, which segments must actually be sent, and what that costs.
export function plan({ records, locale, memory, ids }, {translatableFields}) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const owners = (Array.isArray(ids) ? ids.map((id) => byId.get(id)).filter(Boolean) : records).filter((r) => translatableOwners.test(r.id));
  const jobs = [];
  const unique = new Map();
  let fieldChars = 0,
    cachedChars = 0,
    freshFields = 0;
  for (const owner of owners) {
    const existing = byId.get(translationIdFor(owner.id, locale));
    for (const field of translatableFields(owner)) {
      const sourceHash = sha256(field.text);
      const current = existing?.data.values?.find((v) => JSON.stringify(v.path) === JSON.stringify(field.path));
      if (current && current.sourceHash === sourceHash) {
        freshFields++;
        continue;
      }
      const segments = segmentsOf(field).map((part) => {
        if (part.raw !== undefined || !part.text.trim()) return part;
        const { out, tokens } = protect(part.text);
        const key = locale + ":" + sha256(out);
        if (memory.entries[key]) cachedChars += [...out].length;
        else if (!unique.has(key)) unique.set(key, { text: out, tokens: tokens.length });
        return { ...part, key, tokens };
      });
      fieldChars += [...field.text].length;
      jobs.push({ ownerId: owner.id, revision: owner.revision, path: field.path, sourceHash, segments });
    }
  }
  const toSend = [...unique].map(([key, { text, tokens }]) => ({ key, text, tokens }));
  return { locale, jobs, toSend, chars: toSend.reduce((n, s) => n + [...s.text].length, 0), cachedChars, fieldChars, freshFields };
}

// Long segments are split at sentence ends for providers with a per-text limit (MyMemory ~500 bytes).
const bytes = (text) => new TextEncoder().encode(text).length;
function chunk(text, max) {
  if (bytes(text) <= max) return [text];
  const out = [];
  let current = "";
  const pieces = text.split(/(?<=[.!?])\s+/).flatMap((sentence) => (bytes(sentence) <= max ? [sentence] : sentence.split(/(?<=[,;:])\s+|\s+/)));
  for (const piece of pieces) {
    if (current && bytes(current + " " + piece) > max) {
      out.push(current);
      current = piece;
    } else current = current ? current + " " + piece : piece;
  }
  if (current) out.push(current);
  return out;
}

export async function execute(planned, provider, { memory, maxChars = 3000 } = {}) {
  if (planned.chars > maxChars) throw Object.assign(Error(`Budget überschritten: ${planned.chars} Zeichen geplant, erlaubt ${maxChars}.`), { status: 413 });
  // All pieces go to the provider in one call (it batches or parallelises), then are reassembled per segment.
  // Successful pieces are kept even if others fail, so nothing already billed is paid twice.
  const pieces = planned.toSend.flatMap((segment) => chunk(segment.text, provider.maxChars || 5000).map((text) => ({ segment, text })));
  const result = pieces.length ? await provider.translate({ source: "de", target: planned.locale, texts: pieces.map((p) => p.text) }) : { texts: [], billedCharacters: 0 };
  const billed = result.billedCharacters || 0;
  const failed = new Set();
  const joined = new Map();
  pieces.forEach((piece, i) => {
    const text = result.texts[i];
    if (typeof text !== "string") return failed.add(piece.segment.key);
    joined.set(piece.segment.key, (joined.has(piece.segment.key) ? joined.get(piece.segment.key) + " " : "") + text);
  });
  for (const segment of planned.toSend) {
    const text = joined.get(segment.key);
    if (failed.has(segment.key) || text === undefined || !tokensIntact(text, Array.from({ length: segment.tokens }))) {
      failed.add(segment.key);
      continue;
    }
    memory.entries[segment.key] = { text, provider: provider.id, at: new Date().toISOString().slice(0, 10) };
  }
  const values = new Map();
  let skipped = 0;
  for (const job of planned.jobs) {
    if (job.segments.some((part) => part.key && !memory.entries[part.key])) {
      skipped++;
      continue;
    }
    const text = job.segments
      .map((part) => (part.raw !== undefined ? part.raw : !part.text.trim() ? part.prefix + part.text + part.suffix + part.join : part.prefix + restore(memory.entries[part.key].text, part.tokens) + part.suffix + part.join))
      .join("");
    if (!values.has(job.ownerId)) values.set(job.ownerId, { revision: job.revision, entries: [] });
    values.get(job.ownerId).entries.push({ path: job.path, text, reviewed: false, sourceHash: job.sourceHash });
  }
  return { values, billed, failedSegments: failed.size, skippedFields: skipped, errors: result.errors || [] };
}

// A locale can exceed a provider/run allowance. Cache completed pieces across runs, then assemble
// only whole, token-intact segments. Partial paid work survives exhaustion or a provider failure.
export async function executeBatched(planned, provider, {memory, maxChars=3000, budgetChars=30000, onBatch=()=>{}}={}) {
  if (![maxChars,budgetChars].every(n => Number.isSafeInteger(n) && n>0)) throw Error('Zeichenbudgets müssen positive ganze Zahlen sein.');
  const segments=planned.toSend.map(segment => ({...segment,pieces:chunk(segment.text,Math.min(provider.maxChars||5000,maxChars))}));
  const pieceKey=text => `piece:${planned.locale}:${sha256(text)}`;
  const pending=[...new Map(segments.flatMap(segment => segment.pieces).filter(text => !memory.entries[pieceKey(text)]).map(text => [pieceKey(text),{key:pieceKey(text),text}])).values()];
  let sent=0,billed=0,batches=0,errors=[];
  while (pending.length) {
    const batch=[];let chars=0;
    while (pending.length) {
      const cost=[...pending[0].text].length;
      if (chars+cost>maxChars || sent+chars+cost>budgetChars) break;
      chars+=cost;batch.push(pending.shift());
    }
    if (!batch.length) break;
    const result=await provider.translate({source:'de',target:planned.locale,texts:batch.map(piece=>piece.text)});
    sent+=chars;billed+=result.billedCharacters??chars;batches++;
    batch.forEach((piece,i) => {if(typeof result.texts[i]==='string')memory.entries[piece.key]={text:result.texts[i],provider:provider.id,at:new Date().toISOString().slice(0,10)};});
    errors.push(...result.errors||[]);
    await onBatch({batches,sent,billed});
    if (batch.some((piece,i)=>typeof result.texts[i]!=='string')) break;
  }
  let invalidSegments=0;
  for (const segment of segments) {
    if (!segment.pieces.every(text=>memory.entries[pieceKey(text)])) continue;
    const text=segment.pieces.map(text=>memory.entries[pieceKey(text)].text).join(' ');
    if (tokensIntact(text,Array.from({length:segment.tokens}))) memory.entries[segment.key]={text,provider:provider.id,at:new Date().toISOString().slice(0,10)};
    else {
      invalidSegments++;
      // Invalid markup is not reusable paid work: a later run must be able to ask again.
      for(const piece of segment.pieces)delete memory.entries[pieceKey(piece)];
      errors.push('Der Anbieter hat geschützte Markierungen verändert. Der Text bleibt unübersetzt.');
    }
  }
  const result=await execute({...planned,toSend:[],chars:0},provider,{memory,maxChars});
  return {...result,failedSegments:invalidSegments,billed,batches,sent,errors,budgetExhausted:pending.length>0,remainingSegments:segments.filter(segment=>!memory.entries[segment.key]).length};
}

// Machine results become unreviewed values of the owner's translation record; reviewed values whose
// German text is unchanged are kept as they are.
export function mergeIntoTranslations({ records, locale, values }, {translatableFields}) {
  const byId = new Map(records.map((r) => [r.id, r]));
  const out = [];
  for (const [ownerId, { revision, entries }] of values) {
    const id = translationIdFor(ownerId, locale);
    const existing = byId.get(id);
    const data = existing ? structuredClone(existing.data) : { sourceId: ownerId, locale, sourceHash: revision, values: [] };
    // Older values without a field hash: pin them to their German text if they were current,
    // otherwise to a hash that can never match, so moving the record hash cannot revive them.
    const owner = byId.get(ownerId);
    const allowed=new Set(translatableFields(owner).map(field=>JSON.stringify(field.path)));
    data.values=data.values.filter(value=>allowed.has(JSON.stringify(value.path)));
    for (const value of data.values)
      if (!value.sourceHash) {
        const german = getPath(owner?.data, value.path);
        value.sourceHash = data.sourceHash === revision && typeof german === "string" ? sha256(german) : sha256("");
      }
    data.sourceHash = revision;
    for (const entry of entries) {
      const index = data.values.findIndex((v) => JSON.stringify(v.path) === JSON.stringify(entry.path));
      if (index < 0) data.values.push(entry);
      else data.values[index] = entry;
    }
    out.push({ id, data, create: !existing, expectedRevision: existing?.revision });
  }
  return out;
}

export function createTranslationCore(site) {
 return {plan:request=>plan(request,site),mergeIntoTranslations:request=>mergeIntoTranslations(request,site)};
}
