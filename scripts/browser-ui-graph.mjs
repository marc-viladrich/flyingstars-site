import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import messages from '../src/i18n/ui.json' with { type: 'json' };
import { browserDictionaryScript } from '../src/i18n/browser-dictionary.mjs';

const dictionaryTag = /<script defer data-fs-ui(?:="")? src="(\/media\/i18n\/[^"]+\.js)"><\/script>/g;
const javascript = /^(?:module|(?:application|text)\/javascript)?$/;
const attr = (tag, key) => new RegExp(`\\s${key}="([^"]*)"`).exec(tag)?.[1];

export function visitScript(code, file, visit) {
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true);
  function walk(node) {
    if (visit(node, source) !== false) ts.forEachChild(node, walk);
  }
  walk(source);
}

export function scriptDependencies(code, file) {
  const keys = new Set();
  const imports = new Set();
  visitScript(code, file, (node) => {
    let target;
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) target = node.moduleSpecifier;
    else if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      target = node.arguments[0];
      assert.ok(target && ts.isStringLiteralLike(target), `${file}: dynamischer Import ohne statisches Ziel`);
    } else if (ts.isNewExpression(node) && ['Worker', 'SharedWorker'].includes(node.expression.getText())) {
      const url = node.arguments?.[0];
      target = url && ts.isNewExpression(url) && url.expression.getText() === 'URL' && url.arguments?.[0];
      assert.ok(target && ts.isStringLiteralLike(target), `${file}: Worker ohne statisches Ziel`);
    }
    if (target) imports.add(target.text);
    // Die serverseitige Vergleichstabelle steckt im selben JSON wie die Paketpreise.
    if (ts.isPropertyAssignment(node) && node.name.text === 'services' && ts.isArrayLiteralExpression(node.initializer)
        && node.parent.properties.some((prop) => ts.isPropertyAssignment(prop) && prop.name.text === 'SPARK')) return false;
    if (!ts.isStringLiteralLike(node) || !Object.hasOwn(messages, node.text)) return;
    // Zugriff auf die Video-Beschriftung erfolgt beim Rendern, der Kontaktcode verwendet nur die E-Mail.
    if (node.text === 'contact.videoCall' && ts.isPropertyAssignment(node.parent) && node.parent.name.text === 'labelKey') return;
    keys.add(node.text);
  });
  return { keys, imports };
}

function scriptsIn(html) {
  return [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(([, tag]) => javascript.test(attr(tag, 'type') ?? '') && !/\sdata-fs-ui\b/.test(tag))
    .map(([, tag, code], index) => ({
      src: attr(tag, 'src'), code, index,
    }));
}

function analyzeRoutes(dist) {
  const chunks = new Map();
  const routes = [];
  function reach(keys, seen, script, from = '') {
    // Externe klassische Skripte kennen das lokale UI-Modul nicht.
    if (/^(?:https?:)?\/\//.test(script)) return;
    assert.ok(script.startsWith('/') || script.startsWith('.'), `${from}: unbekannter Import ${script}`);
    const resolved = path.posix.resolve('/', path.posix.dirname(from), script).replace(/^\//, '');
    if (seen.has(resolved)) return;
    seen.add(resolved);
    if (!chunks.has(resolved)) {
      chunks.set(resolved, scriptDependencies(readFileSync(path.join(dist, resolved), 'utf8'), resolved));
    }
    merge(keys, seen, chunks.get(resolved), `/${resolved}`);
  }
  function merge(keys, seen, deps, from) {
    for (const key of deps.keys) keys.add(key);
    for (const script of deps.imports) reach(keys, seen, script, from);
  }

  for (const file of readdirSync(dist, { recursive: true }).filter((name) => name.endsWith('.html')).sort()) {
    const html = readFileSync(path.join(dist, file), 'utf8');
    const keys = new Set();
    const seen = new Set();
    const scripts = scriptsIn(html);
    if (!scripts.length && !html.includes('data-fs-ui')) continue;
    for (const { src, code, index } of scripts) {
      if (src) reach(keys, seen, src, `/${file}`);
      else merge(keys, seen, scriptDependencies(code, `${file}#${index}.js`), `/${file}`);
    }
    const locale = /<html\b[^>]*\slang="([^"]+)"/i.exec(html)?.[1];
    routes.push({ file, html, locale, keys });
  }
  return routes;
}

function address(locale, code) {
  const hash = createHash('sha256').update(code).digest('hex').slice(0, 16);
  return `/media/i18n/${locale}.${hash}.js`;
}

export function writeBrowserDictionaries(dist) {
  const directory = path.join(dist, 'media/i18n');
  mkdirSync(directory, { recursive: true });
  const routes = analyzeRoutes(dist);
  const written = new Set();
  for (const { file, html, locale, keys } of routes) {
    const tags = [...html.matchAll(dictionaryTag)];
    if (!tags.length && !keys.size) continue;
    assert.equal(tags.length, 1, `${file}: Wörterbuch-Platzhalter fehlt oder ist doppelt`);
    let replacement = '';
    if (keys.size) {
      const code = browserDictionaryScript(locale, keys);
      const href = address(locale, code);
      if (!written.has(href)) {
        writeFileSync(path.join(dist, href), code);
        written.add(href);
      }
      replacement = tags[0][0].replace(tags[0][1], href);
    }
    writeFileSync(path.join(dist, file), html.replace(tags[0][0], replacement));
  }
  return written.size;
}

export function checkBrowserDictionaries(dist) {
  const routes = analyzeRoutes(dist);
  const used = new Set();
  const dictionaries = new Set();
  for (const { file, html, locale, keys } of routes) {
    const tags = [...html.matchAll(dictionaryTag)];
    assert.equal(tags.length, Number(keys.size > 0), `${file}: Anzahl Wörterbücher`);
    if (!keys.size) continue;
    const [tag] = tags;
    const early = html.search(/<script\b[^>]*\btype="module"/i);
    assert.ok(early < 0 || tag.index < early, `${file}: Wörterbuch steht hinter einem Modul`);
    const code = browserDictionaryScript(locale, keys);
    assert.equal(tag[1], address(locale, code), `${file}: falsche Wörterbuch-Adresse`);
    assert.equal(readFileSync(path.join(dist, tag[1]), 'utf8'), code, file);
    dictionaries.add(tag[1]);
    for (const key of keys) used.add(key);
  }
  const directory = path.join(dist, 'media/i18n');
  const files = existsSync(directory) ? readdirSync(directory) : [];
  assert.deepEqual(files.sort(), [...dictionaries].map((href) => path.basename(href)).sort());
  return { routes: routes.length, dictionaries: dictionaries.size, unused: Object.keys(messages).filter(key => !used.has(key)).sort() };
}

export function routeBrowserUi() {
  return {
    name: 'flyingstars:route-browser-ui',
    hooks: {
      'astro:build:done': ({ dir, logger }) => {
        const dist = fileURLToPath(dir);
        const count = writeBrowserDictionaries(dist);
        const { routes } = checkBrowserDictionaries(dist);
        logger.info(`${count} Browser-Wörterbücher für ${routes} HTML-Seiten geprüft`);
      },
    },
  };
}
