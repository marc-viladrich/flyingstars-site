// CSS je Route (Audit P3, 18.11.2026): Astro bündelt Komponenten-Stile je Routendatei. Alle Inhaltsseiten teilen sich
// [...slug].astro und damit die Stile JEDER Section, auch derer, die auf der Seite nicht vorkommt. Nach dem Build behält
// jede Seite aus ihren Komponenten-Bündeln nur die Regeln, die auf ihr greifen können: Eine Regel mit
// [data-astro-cid-X] (Astros Scoping) passt nur auf Elemente mit diesem Attribut. Fehlt das Attribut im HTML der Seite,
// kann sie dort nie greifen, und sie fällt weg. Regeln ohne Scoping (global.css, :global) bleiben unberührt; ebenso die
// Reihenfolge, also die Kaskade, einschließlich der Reihenfolge benannter @layer. Seiten mit derselben Komponentenmenge
// teilen sich eine Datei (Name aus dem Inhalt).
// Referenzen (Audit 2, N3): Jeder <link>, der auf ein Bündel zeigt (Stylesheet und Preload), wird an seinem eigenen Tag
// umgeschrieben. Ein Bündel wird erst gelöscht, wenn kein HTML und kein Skript mehr darauf verweist, und am Ende muss
// jede CSS-Referenz jeder Seite auf eine vorhandene Datei zeigen, sonst bricht der Build ab.
import { createHash } from 'node:crypto';
import { access, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const CID = /data-astro-cid-([a-z0-9]+)/g;
const LINK_TAG = /<link\b[^>]*>/gi;
const BUNDLE = /^\/_astro\/[^"?#]+\.css$/;
/** global.css definiert die Kopfrollen in :root; daran ist das Basis-Stylesheet im Build zu erkennen. */
export const BASE_MARKER = /--head-gap-text:/;
const attr = (tag, name) => tag.match(new RegExp(`\\s${name}=(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'))?.slice(1).find((v) => v !== undefined);
const rels = (tag) => (attr(tag, 'rel') ?? '').toLowerCase().split(/\s+/);

/** CSS-Bündel, auf die ein <link> zeigt: angewendete Stylesheets und Preloads (as="style"). */
export function cssLinks(html) {
  const out = [];
  for (const m of html.matchAll(LINK_TAG)) {
    const href = attr(m[0], 'href');
    if (!href || !BUNDLE.test(href)) continue;
    const rel = rels(m[0]);
    if (rel.includes('stylesheet')) out.push({ href, kind: 'stylesheet' });
    else if (rel.includes('preload') && (attr(m[0], 'as') ?? '').toLowerCase() === 'style') out.push({ href, kind: 'preload' });
  }
  return out;
}

/** Schreibt href an jedem <link>-Tag um, dessen Ziel in `map` steht; anderer Text der Seite bleibt unberührt. */
export function rewriteLinks(html, map) {
  return html.replace(LINK_TAG, (tag) => {
    const href = attr(tag, 'href');
    return href && map.has(href) ? tag.replace(/(\shref=)(["']?)[^"'\s>]+\2/i, `$1$2${map.get(href)}$2`) : tag;
  });
}

/** Klammerinhalte entfernen: :not(), :is(), :where(), :has() machen ein Scoping-Attribut nicht zur Bedingung. */
function topLevel(selector) {
  let out = '', depth = 0;
  for (const ch of selector) {
    if (ch === '(') depth++;
    else if (ch === ')') depth = Math.max(0, depth - 1);
    else if (!depth) out += ch;
  }
  return out;
}

/** Scoping-Attribute, die ein Zweig der Selektorliste zwingend voraussetzt (je Zweig eine Menge). */
export function requiredCids(selector) {
  return postcss.list.comma(selector).map((branch) => new Set([...topLevel(branch).matchAll(CID)].map((m) => m[1])));
}

const canMatch = (rule, present) => requiredCids(rule.selector).some((cids) => [...cids].every((cid) => present.has(cid)));

/** Regeln entfernen, die auf einer Seite mit den Scoping-Attributen `present` nie greifen; leere Gruppen fallen mit weg.
 *  Ein benannter @layer-Block legt beim ersten Auftreten die Rangfolge der Ebene fest. Wird er leer, bleibt er deshalb als
 *  Anweisung (@layer name;) an seiner Stelle stehen, statt zu verschwinden. */
export function pruneCss(css, present) {
  const root = postcss.parse(css);
  root.walkRules((rule) => {
    if (rule.parent?.type === 'atrule' && /keyframes$/i.test(rule.parent.name)) return;
    if (!canMatch(rule, present)) rule.remove();
  });
  let emptied = true;
  while (emptied) {
    emptied = false;
    root.walkAtRules((at) => {
      if (!at.nodes || at.nodes.length || /keyframes$/i.test(at.name)) return;
      if (/^layer$/i.test(at.name) && at.params.trim()) {
        const parent = at.parent;
        at.replaceWith(postcss.atRule({ name: at.name, params: at.params }));
        if (parent.type !== 'root') parent.raws.semicolon = true; // Anweisung auch als letztes Kind mit ;
      }
      else { at.remove(); emptied = true; }
    });
  }
  return root.toString();
}

const hash = (text) => createHash('sha256').update(text).digest('base64url').slice(0, 8);

async function htmlFiles(dir) {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...(await htmlFiles(full)));
    else if (entry.name.endsWith('.html')) out.push(full);
  }
  return out;
}

/** Wendet die Regel auf ein fertiges dist/ an. Gibt je Ausgangsdatei die erzeugten Varianten zurück. */
export async function splitRouteCss(dist) {
  const sources = new Map(); // href -> { css, cids }
  const variants = new Map(); // href -> Map(key -> href)
  const pages = [];
  for (const file of await htmlFiles(dist)) {
    const html = await readFile(file, 'utf8');
    const sheets = [...new Set(cssLinks(html).filter((l) => l.kind === 'stylesheet').map((l) => l.href))];
    if (!sheets.length) { pages.push({ file, html }); continue; }
    const present = new Set([...html.matchAll(CID)].map((m) => m[1]));
    const map = new Map();
    for (const href of sheets) {
      if (!sources.has(href)) {
        const css = await readFile(path.join(dist, href), 'utf8');
        sources.set(href, { css, cids: new Set([...css.matchAll(CID)].map((m) => m[1])) });
      }
      const { css, cids } = sources.get(href);
      const missing = [...cids].filter((cid) => !present.has(cid)).sort();
      if (!missing.length) continue;
      const byKey = variants.get(href) ?? new Map();
      variants.set(href, byKey);
      const key = missing.join(',');
      if (!byKey.has(key)) {
        const pruned = pruneCss(css, present);
        const target = href.replace(/\.css$/, `.${hash(pruned)}.css`);
        await writeFile(path.join(dist, target), pruned);
        byKey.set(key, target);
      }
      map.set(href, byKey.get(key));
    }
    const next = map.size ? rewriteLinks(html, map) : html;
    if (next !== html) await writeFile(file, next);
    pages.push({ file, html: next });
  }
  // Ausgangsdateien nur löschen, wenn weder eine Seite (in welchem Tag auch immer) noch ein Skript sie noch nennt
  const scripts = (await readdir(path.join(dist, '_astro')).catch(() => []))
    .filter((name) => name.endsWith('.js'));
  const scriptText = (await Promise.all(scripts.map((name) => readFile(path.join(dist, '_astro', name), 'utf8')))).join('\n');
  for (const href of variants.keys()) {
    if (pages.some((p) => p.html.includes(href)) || scriptText.includes(path.basename(href))) continue;
    await rm(path.join(dist, href));
  }
  // Wächter am gebauten Ergebnis: jede CSS-Referenz jeder Seite zeigt auf eine vorhandene Datei
  const broken = [];
  for (const { file, html } of pages) for (const { href, kind } of cssLinks(html)) {
    if (!(await access(path.join(dist, href)).then(() => true, () => false))) broken.push(`${path.relative(dist, file)}: ${kind} ${href}`);
  }
  if (broken.length) throw new Error(`CSS-Zuschnitt: Verweise auf fehlende Stylesheets\n${broken.join('\n')}`);
  // Kaskade: Das Basis-Stylesheet (global.css, erkannt an seiner Token-Definition) steht auf jeder Seite vor allen
  // Komponentenbündeln. Vite legt die Reihenfolge der Bündel selbst fest; ein zusätzlicher CSS-Import kann sie verschieben
  // (Audit 2, N3: ein normaler Import von inquiry-form.css stellte IconFeature vor global.css).
  const isBase = new Map();
  const misordered = [];
  for (const { file, html } of pages) {
    const sheets = cssLinks(html).filter((l) => l.kind === 'stylesheet').map((l) => l.href);
    if (!sheets.length) continue;
    for (const href of sheets) if (!isBase.has(href)) isBase.set(href, BASE_MARKER.test(await readFile(path.join(dist, href), 'utf8')));
    const at = sheets.findIndex((href) => isBase.get(href));
    if (at !== 0) misordered.push(`${path.relative(dist, file)}: ${at < 0 ? 'kein Basis-Stylesheet' : `Basis an Stelle ${at + 1} nach ${sheets.slice(0, at).join(', ')}`}`);
  }
  if (misordered.length) throw new Error(`CSS-Zuschnitt: Basis-Stylesheet nicht zuerst\n${misordered.join('\n')}`);
  return variants;
}

/** Astro-Integration: läuft nach jedem statischen Build (Website, Vorschau, Editor-Build). */
export function routeCss() {
  return {
    name: 'flyingstars:route-css',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const variants = await splitRouteCss(fileURLToPath(dir));
        const count = [...variants.values()].reduce((n, byKey) => n + byKey.size, 0);
        logger.info(`${count} Komponenten-Stylesheets je Komponentenmenge zugeschnitten`);
      },
    },
  };
}
