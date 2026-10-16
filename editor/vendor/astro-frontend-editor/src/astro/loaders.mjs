import { createHash } from 'node:crypto';
import { mkdir, readFile, realpath, rename, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { extname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sharedSlices } from './source-spans.mjs';

/** @typedef {{id:string, source:string, codec:string|null, key:unknown, hash:string|null}} ProvenanceEntry */
const sha256 = value => createHash('sha256').update(value).digest('hex');
const codecFor = path => ({ '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml', '.md': 'markdown' }[extname(path)] ?? null);

/** @param {Parameters<typeof import('astro/loaders').glob>[0]} options
 * @returns {import('astro/loaders').Loader} */
export function glob(options) { return wrap('glob', [options]); }
/** @param {string} path @param {Parameters<typeof import('astro/loaders').file>[1]} [options]
 * @returns {import('astro/loaders').Loader} */
export function file(path, options) { return wrap('file', [path, options]); }

function wrap(kind, args) {
  return {
    // Astro recognizes file-loader to generate the array/map schema envelope.
    name: `${kind}-loader`,
    /** @param {import('astro/loaders').LoaderContext} context */
    async load(context) {
      const root = fileURLToPath(context.config.root);
      const peer = createRequire(join(root, 'package.json')).resolve('astro/loaders');
      const astro = await import(peer);
      const rawEntries = new Map();
      const store = new Proxy(context.store, {
        get(target, property) {
          if (property === 'clear') return () => { rawEntries.clear(); return target.clear(); };
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      let pending = Promise.resolve();
      const persist = () => {
        pending = pending.then(() => snapshot(context, kind, args, rawEntries));
        return pending;
      };
      const watcher = context.watcher && new Proxy(context.watcher, {
        get(target, property) {
          if (property === 'on') return (event, callback) => {
            target.on(event, async (...values) => { await callback(...values); await persist(); });
            return target;
          };
          const value = Reflect.get(target, property);
          return typeof value === 'function' ? value.bind(target) : value;
        },
      });
      await astro[kind](...args).load({
        ...context, watcher, store,
        async parseData(props) {
          rawEntries.set(String(props.id), props.data);
          return context.parseData(props);
        },
      });
      await persist();
    },
  };
}

async function snapshot(context, loader, args, rawEntries) {
  const root = await realpath(fileURLToPath(context.config.root));
  const issues = [];
  const entries = [];
  let shared;
  if (loader === 'file') {
    const path = fileURLToPath(new URL(args[0], context.config.root));
    try {
      if (args[1]?.parser) throw new Error('Custom file parser has no declared reversible source mapping');
      shared = sharedSlices(await readFile(path, 'utf8'), codecFor(path));
      if (shared.array && shared.records.length !== rawEntries.size) {
        throw new Error('Array entries without unique IDs cannot be mapped safely');
      }
    } catch (error) {
      shared = undefined;
      issues.push({ code: 'unsupported-shared-source', message: error.message });
    }
  }
  for (const [id, entry] of context.store.entries().sort(([a], [b]) => a.localeCompare(b))) {
    if (!entry.filePath) throw new Error(`No public filePath for ${context.collection}/${id}`);
    const absolute = await realpath(resolve(root, entry.filePath));
    const source = relative(root, absolute).split('\\').join('/');
    if (source.startsWith('../') || isAbsolute(source)) throw new Error(`Source escapes site root: ${source}`);
    const codec = codecFor(source);
    let key = null, hash = null;
    if (loader === 'glob') hash = sha256(await readFile(absolute));
    else if (shared) {
      let slice;
      if (shared.array) {
        const raw = rawEntries.get(id);
        const field = raw?.id != null ? 'id' : 'slug';
        key = { field, value: raw?.[field] };
        // Astro's public parseData calls preserve the parser's array order.
        const index = [...rawEntries.keys()].indexOf(id);
        slice = shared.records[index];
      } else {
        key = id;
        slice = shared.records.find(record => record.key === id);
      }
      if (!slice) throw new Error(`No source slice for ${context.collection}/${id}`);
      hash = sha256(slice.raw);
    }
    if (!codec) issues.push({ code: 'unsupported-codec', id, source });
    entries.push({ id, source, codec, key, hash });
  }
  const manifest = { collection: context.collection, loader, entries, issues };
  const directory = resolve(root, process.env.AFE_PROVENANCE_DIR ?? '.astro/afe-provenance');
  await mkdir(directory, { recursive: true });
  const path = join(directory, `${sha256(context.collection)}.json`);
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(manifest, null, 2) + '\n');
  await rename(temporary, path);
  // Opt-in checker evidence from the public parseData boundary, never Astro's
  // internal store. Capture cold input for reference and concrete marker paths.
  if (process.env.AFE_CHECK_DATA_DIR) {
    const dataDirectory = resolve(root, process.env.AFE_CHECK_DATA_DIR);
    await mkdir(dataDirectory, { recursive: true });
    await writeFile(join(dataDirectory, `${sha256(context.collection)}.json`),
      JSON.stringify({ collection: context.collection, records: Object.fromEntries(rawEntries) }));
  }
}
