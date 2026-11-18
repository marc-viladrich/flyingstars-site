// CSS je Route (Audit P3, 18.11.2026): Astro bündelt Komponenten-Stile je Routendatei. Alle Inhaltsseiten teilen sich
// [...slug].astro und damit die Stile JEDER Section, auch derer, die auf der Seite nicht vorkommt. Nach dem Build behält
// jede Seite aus ihren Komponenten-Bündeln nur die Regeln, die auf ihr greifen können: Eine Regel mit
// [data-astro-cid-X] (Astros Scoping) passt nur auf Elemente mit diesem Attribut. Fehlt das Attribut im HTML der Seite,
// kann sie dort nie greifen, und sie fällt weg. Regeln ohne Scoping (global.css, :global) bleiben unberührt; ebenso die
// Reihenfolge, also die Kaskade. Seiten mit derselben Komponentenmenge teilen sich eine Datei (Name aus dem Inhalt).
import { createHash } from 'node:crypto';
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import postcss from 'postcss';

const CID = /data-astro-cid-([a-z0-9]+)/g;
const LINK = /<link rel="stylesheet" href="(\/_astro\/[^"]+\.css)">/g;

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

/** Regeln entfernen, die auf einer Seite mit den Scoping-Attributen `present` nie greifen; leere Gruppen fallen mit weg. */
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
      if (at.nodes && at.nodes.length === 0 && !/keyframes$/i.test(at.name)) { at.remove(); emptied = true; }
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
  const used = new Set();
  for (const file of await htmlFiles(dist)) {
    const html = await readFile(file, 'utf8');
    const links = [...html.matchAll(LINK)].map((m) => m[1]);
    if (!links.length) continue;
    const present = new Set([...html.matchAll(CID)].map((m) => m[1]));
    let next = html;
    for (const href of links) {
      if (!sources.has(href)) {
        const css = await readFile(path.join(dist, href), 'utf8');
        sources.set(href, { css, cids: new Set([...css.matchAll(CID)].map((m) => m[1])) });
      }
      const { css, cids } = sources.get(href);
      const missing = [...cids].filter((cid) => !present.has(cid)).sort();
      if (!missing.length) { used.add(href); continue; }
      const byKey = variants.get(href) ?? new Map();
      variants.set(href, byKey);
      const key = missing.join(',');
      if (!byKey.has(key)) {
        const pruned = pruneCss(css, present);
        const target = href.replace(/\.css$/, `.${hash(pruned)}.css`);
        await writeFile(path.join(dist, target), pruned);
        byKey.set(key, target);
      }
      next = next.replace(`href="${href}"`, `href="${byKey.get(key)}"`);
    }
    if (next !== html) await writeFile(file, next);
  }
  // Ausgangsdateien, auf die keine Seite und kein Skript mehr verweist, nicht mit ausliefern
  const scripts = (await readdir(path.join(dist, '_astro'))).filter((name) => name.endsWith('.js'));
  const scriptText = (await Promise.all(scripts.map((name) => readFile(path.join(dist, '_astro', name), 'utf8')))).join('\n');
  for (const href of variants.keys()) {
    if (!used.has(href) && !scriptText.includes(path.basename(href))) await rm(path.join(dist, href));
  }
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
