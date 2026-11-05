#!/usr/bin/env node
// Übernimmt kuratierte Formationen aus dem FlyingStars-Motivkatalog (https://flyingstars-katalog-web.vercel.app, Stand
// 05.11.2026) in den Show-Konfigurator. Quelle ist der gesicherte Rechercheordner im akomo-Hub
// (freelance/clients/flyingstars/20-katalog-und-materialinventar-2026-11-05: katalog-inventar.json + quellen/), nicht
// die Live-Seite: Der Katalog-Endpunkt lieferte HTTP 500, der eingebettete Stand ist die belegte Quelle.
//
// Aufruf: node scripts/import-catalog.mjs <rechercheordner>
// Schreibt:
//   public/media/katalog/<variante>.json   eine Formation je Variante, auf Einheitsgröße gebracht (Mitte 0, halbe
//                                          Breite oder Höhe 1), x rechts, y oben, z Tiefe, Farben wie im Katalog
//   src/content/catalog-motifs.json        Metadaten: Motiv, Namen, Varianten (gezählte Punkte, Katalogangabe), Bewegung,
//                                          Herkunft. Der Konfigurator liest nur diese Datei.
//
// Importwächter (bricht ab, statt still zu übernehmen): Punktliste nicht leer, alle Werte endlich, Farben 0–255,
// `exact` gleich der Zahl der Punkte. Die Drohnenzahl im Katalog (`drones`) steht getrennt als `declared`; gezählt wird
// immer das Punktearray (41 von 85 Dateien weichen ab, z. B. Sportwagen „150“ mit 147 Punkten). Varianten ohne
// Punktdaten (z. B. Golfcaddy 100) werden nicht erfunden.
//
// Kuratiert, nicht alles: Wappen, Flaggen, Karten, Kundenslogans, Kundenlogos und Porträts bleiben draußen (keine
// Nutzungsfreigabe, siehe docs/show-katalog-motive.md). Jede Auswahl hier ist ein Vorschlag an FlyingStars.
import fs from 'node:fs';
import path from 'node:path';

const SRC = process.argv[2];
if (!SRC) { console.error('Aufruf: node scripts/import-catalog.mjs <rechercheordner>'); process.exit(2); }
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT_MEDIA = path.join(ROOT, 'public/media/katalog');
const OUT_META = path.join(ROOT, 'src/content/catalog-motifs.json');

/**
 * Bewegungsprofile nach der Sichtung der Katalogclips (Recherche clip-analyse/, 05.11.): Bewegung nur dort, wo FlyingStars'
 * eigene Vorschau sie zeigt oder der Körper sie nahelegt (Räder, Nadel). Atom, Möbius-Schleife, Pyramide, Stern,
 * Schmetterling und Taube leben in den Clips vom Licht, nicht von einer Drehung; Kugel, Spirale und Galaxie drehen sich;
 * die Blüten drehen ihre Blätter um die eigene Mitte; Ballons schweben einzeln; Gläser neigen sich zueinander.
 * key: stabiler Schlüssel im Konfigurator. nr: Motivnummer im Katalog. motion: Bewegungsprofil in
 * src/scripts/scenes/catalog.js. name: Anzeigename je Sprache.
 */
const CURATED = [
  { key: 'anstossen', nr: 17, motion: 'clink', name: { de: 'Anstoßende Gläser', en: 'Clinking glasses', nl: 'Klinkende glazen' } },
  { key: 'doppelherz', nr: 75, motion: 'breathe', name: { de: 'Doppelherz', en: 'Double heart', nl: 'Dubbel hart' } },
  { key: 'initialen', nr: 123, motion: 'breathe', name: { de: 'Herz mit Initialen', en: 'Heart with initials', nl: 'Hart met initialen' } },
  { key: 'taube', nr: 14, motion: 'shimmer', name: { de: 'Friedenstaube', en: 'Dove of peace', nl: 'Vredesduif' } },
  { key: 'blueten', nr: 85, motion: 'blossoms', name: { de: 'Zwei Blüten', en: 'Two blossoms', nl: 'Twee bloesems' } },
  { key: 'unendlich', nr: 88, motion: 'run', name: { de: 'Unendlich-Zeichen', en: 'Infinity sign', nl: 'Oneindigteken' } },
  { key: 'schmetterling', nr: 86, motion: 'shimmer', name: { de: 'Schmetterling', en: 'Butterfly', nl: 'Vlinder' } },
  { key: 'ballons', nr: 47, motion: 'bob', name: { de: 'Ballons', en: 'Balloons', nl: 'Ballonnen' } },
  { key: 'fahnen', nr: 118, motion: 'wave', name: { de: 'Wehende Fahnen', en: 'Waving flags', nl: 'Wapperende vlaggen' } },
  { key: 'handschlag', nr: 115, motion: 'shimmer', name: { de: 'Handschlag', en: 'Handshake', nl: 'Handdruk' } },
  { key: 'stern', nr: 13, motion: 'twinkle', name: { de: 'Stern', en: 'Star', nl: 'Ster' } },
  { key: 'golfer', nr: 90, motion: 'shimmer', name: { de: 'Golfer', en: 'Golfer', nl: 'Golfer' } },
  { key: 'konfetti', nr: 55, motion: 'confetti', name: { de: 'Konfetti-Kanone', en: 'Confetti cannon', nl: 'Confettikanon' } },
  { key: 'sportwagen', nr: 127, motion: 'drive', name: { de: 'Sportwagen', en: 'Sports car', nl: 'Sportwagen' } },
  { key: 'drehzahl', nr: 126, motion: 'needle', name: { de: 'Drehzahlmesser', en: 'Rev counter', nl: 'Toerenteller' } },
  { key: 'galaxie', nr: 4, motion: 'swirl', name: { de: 'Galaxie', en: 'Galaxy', nl: 'Melkweg' } },
  { key: 'moebius', nr: 3, motion: 'glow', name: { de: 'Möbius-Schleife', en: 'Möbius strip', nl: 'Möbiusband' } },
  { key: 'kugel', nr: 87, motion: 'turn', name: { de: 'Kugel', en: 'Sphere', nl: 'Bol' } },
  { key: 'atom', nr: 72, motion: 'glow', name: { de: 'Atom', en: 'Atom', nl: 'Atoom' } },
  { key: 'pyramide', nr: 2, motion: 'glow', name: { de: 'Umgedrehte Pyramide', en: 'Inverted pyramid', nl: 'Omgekeerde piramide' } },
  { key: 'spirale', nr: 73, motion: 'turn', name: { de: 'Spirale', en: 'Spiral', nl: 'Spiraal' } },
  { key: 'palme', nr: 83, motion: 'palm', name: { de: 'Palmeninsel', en: 'Palm island', nl: 'Palmeiland' } },
  { key: 'bierkrug', nr: 117, motion: 'shimmer', name: { de: 'Bierkrug', en: 'Beer mug', nl: 'Bierpul' } },
  { key: 'cocktail', nr: 84, motion: 'shimmer', name: { de: 'Cocktailglas', en: 'Cocktail glass', nl: 'Cocktailglas' } },
  // die 92-Punkt-Variante ist ein schräges Punktraster und liest sich nicht als Regenbogen (Sichtung 05.11.): erst ab 201
  { key: 'regenbogen', nr: 59, motion: 'rainbow', skip: ['m-1a99044c19f00ded'], name: { de: 'Regenbogen', en: 'Rainbow', nl: 'Regenboog' } },
  { key: 'kuhufo', nr: 70, motion: 'shimmer', name: { de: 'Kuh und UFO', en: 'Cow and UFO', nl: 'Koe en ufo' } },
  { key: 'schiff', nr: 37, motion: 'sail', name: { de: 'Schiff', en: 'Ship', nl: 'Schip' } },
  // dreht sich in FlyingStars' Plimmiri-Entwurf starr um rund 5° je Sekunde (Recherche show-bewegung-messung/)
  { key: 'wasserball', nr: 42, motion: 'turn', name: { de: 'Wasserball', en: 'Beach ball', nl: 'Strandbal' } },
  { key: 'welle', nr: 137, motion: 'surf', name: { de: '3D-Welle', en: '3D wave', nl: '3D-golf' } },
  { key: 'lebensbaum', nr: 114, motion: 'shimmer', name: { de: 'Lebensbaum', en: 'Tree of life', nl: 'Levensboom' } },
  { key: 'mandala', nr: 71, motion: 'spin', name: { de: 'Mandala', en: 'Mandala', nl: 'Mandala' } },
  { key: 'sektflasche', nr: 16, motion: 'confetti', name: { de: 'Sektflasche', en: 'Champagne bottle', nl: 'Champagnefles' } },
];

const inv = JSON.parse(fs.readFileSync(path.join(SRC, 'katalog-inventar.json'), 'utf8'));
const fail = (msg) => { console.error(`Importwächter: ${msg}`); process.exit(1); };
const r3 = (v) => Math.round(v * 1000) / 1000;

/** Bewegliche Teile, die das Bewegungsprofil braucht (in Einheitskoordinaten). */
function groupsFor(motion, pts) {
  const white = (p) => p[3] > 200 && p[4] > 200 && p[5] > 200;
  if (motion === 'drive') {
    // Räder: die weißen Ringe unten am Wagen, links und rechts der Mitte. Mitte = Schwerpunkt, Radius = mittlerer Abstand.
    const ys = pts.map((p) => p[1]), low = Math.min(...ys) + (Math.max(...ys) - Math.min(...ys)) * 0.36;
    const cand = pts.map((p, j) => [p, j]).filter(([p]) => white(p) && p[1] < low);
    const xs = cand.map(([p]) => p[0]).sort((a, b) => a - b), split = (xs[0] + xs[xs.length - 1]) / 2;
    const wheels = [cand.filter(([p]) => p[0] < split), cand.filter(([p]) => p[0] >= split)].map((g) => {
      const cx = g.reduce((s, [p]) => s + p[0], 0) / g.length, cy = g.reduce((s, [p]) => s + p[1], 0) / g.length;
      return { cx: r3(cx), cy: r3(cy), idx: g.map(([, j]) => j) };
    });
    if (wheels.some((w) => w.idx.length < 6)) fail('Sportwagen: Räder nicht gefunden');
    return { wheels };
  }
  if (motion === 'needle') {
    // Nadel: die roten Punkte; Drehpunkt ist ihr unteres Ende (zur Skalenmitte hin).
    const idx = pts.map((p, j) => [p, j]).filter(([p]) => p[3] > 200 && p[4] < 60 && p[5] < 60).map(([, j]) => j);
    const cx = pts.filter((p) => !(p[3] > 200 && p[4] < 60)).reduce((s, p) => s + p[0], 0) / (pts.length - idx.length);
    const cy = pts.filter((p) => !(p[3] > 200 && p[4] < 60)).reduce((s, p) => s + p[1], 0) / (pts.length - idx.length);
    // Drehpunkt: das Nadelende, das der Skalenmitte am nächsten liegt (die Nabe), nicht die Skalenmitte selbst
    const hub = idx.map((j) => pts[j]).sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy))[0];
    return { needle: { idx, cx: r3(hub[0]), cy: r3(hub[1]) } };
  }
  if (motion === 'bob' || motion === 'clink') {
    // Einzelne Ballons / Gläser: zusammenhängende Gruppen (Nachbarn näher als 1,8 × typischer Abstand).
    const d = pts.map((p, i) => Math.min(...pts.map((q, k) => (k === i ? Infinity : Math.hypot(p[0] - q[0], p[1] - q[1])))));
    const step = d.slice().sort((a, b) => a - b)[Math.floor(d.length / 2)] * 1.9;
    const label = new Array(pts.length).fill(-1); let g = 0;
    for (let i = 0; i < pts.length; i++) {
      if (label[i] >= 0) continue;
      const stack = [i]; label[i] = g;
      while (stack.length) { const a = stack.pop(); for (let k = 0; k < pts.length; k++) if (label[k] < 0 && Math.hypot(pts[a][0] - pts[k][0], pts[a][1] - pts[k][1]) < step) { label[k] = g; stack.push(k); } }
      g++;
    }
    const members = Array.from({ length: g }, (_, q) => label.map((l, j) => (l === q ? j : -1)).filter((j) => j >= 0)).filter((m) => m.length >= 4);
    const out = members.map((m) => ({ cx: r3(m.reduce((s, j) => s + pts[j][0], 0) / m.length), base: r3(Math.min(...m.map((j) => pts[j][1]))), idx: m }));
    if (motion === 'clink') {
      // Gläser: links und rechts der Mitte (die Gläser berühren sich am Rand, darum nicht nach Zusammenhang)
      const left = pts.map((p, j) => [p, j]).filter(([p]) => p[0] < 0).map(([, j]) => j), right = pts.map((_, j) => j).filter((j) => !left.includes(j));
      return { glasses: [left, right].map((idx) => ({ idx, base: r3(Math.min(...idx.map((j) => pts[j][1]))), cx: r3(idx.reduce((s, j) => s + pts[j][0], 0) / idx.length) })) };
    }
    return { balloons: out };
  }
  if (motion === 'blossoms') {
    // zwei Blüten links und rechts; Mitte je Blüte = Schwerpunkt ihrer Punkte
    const sides = [pts.map((p, j) => [p, j]).filter(([p]) => p[0] < 0), pts.map((p, j) => [p, j]).filter(([p]) => p[0] >= 0)];
    return { blossoms: sides.map((g) => ({ cx: r3(g.reduce((a, [p]) => a + p[0], 0) / g.length), cy: r3(g.reduce((a, [p]) => a + p[1], 0) / g.length), idx: g.map(([, j]) => j) })) };
  }
  if (motion === 'palm') {
    // Wedel: die grünen Punkte; sie wiegen sich um den obersten Punkt des Stamms (nicht grün, höchster Punkt darunter)
    const green = pts.map((p, j) => [p, j]).filter(([p]) => p[4] > 150 && p[3] < 120 && p[5] < 120);
    const lowGreen = Math.min(...green.map(([p]) => p[1]));
    const trunk = pts.filter((p) => !(p[4] > 150 && p[3] < 120 && p[5] < 120) && p[1] <= lowGreen + 0.05).sort((a, b) => b[1] - a[1])[0];
    return { fronds: { idx: green.map(([, j]) => j), cx: r3(trunk[0]), cy: r3(trunk[1]) } };
  }
  return undefined;
}

fs.mkdirSync(OUT_MEDIA, { recursive: true });
for (const f of fs.readdirSync(OUT_MEDIA)) if (f.endsWith('.json')) fs.rmSync(path.join(OUT_MEDIA, f)); // nur die aktuelle Auswahl ausliefern

const motifs = {}, report = [];
for (const c of CURATED) {
  const variants = inv.variants.filter((v) => Number(v.nr) === c.nr);
  if (!variants.length) fail(`Motiv Nr. ${c.nr} (${c.key}) fehlt im Inventar`);
  const used = [];
  for (const v of variants) {
    if (c.skip?.includes(path.basename(v.formation ?? '', '.json'))) { report.push(`${c.key}: ${path.basename(v.formation, '.json')} bewusst nicht übernommen`); continue; }
    if (!v.formation) { report.push(`${c.key}: Variante ${v.variante} (${v.drohnen} lt. Katalog) ohne Punktdaten, übersprungen`); continue; }
    const file = path.join(SRC, 'quellen', `katalog-formations-${path.basename(v.formation)}`);
    const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (!Array.isArray(raw.points) || raw.points.length === 0) { report.push(`${c.key}: ${raw.id} leer, übersprungen`); continue; }
    if (raw.exact !== raw.points.length) fail(`${raw.id}: exact ${raw.exact} ≠ ${raw.points.length} Punkte`);
    for (const p of raw.points) {
      if (p.length !== 6 || !p.every(Number.isFinite)) fail(`${raw.id}: ungültiger Punkt ${JSON.stringify(p)}`);
      if (p.slice(3).some((v) => v < 0 || v > 255)) fail(`${raw.id}: Farbe außerhalb 0–255`);
    }
    const xs = raw.points.map((p) => p[0]), ys = raw.points.map((p) => p[1]), zs = raw.points.map((p) => p[2]);
    const mx = (Math.max(...xs) + Math.min(...xs)) / 2, my = (Math.max(...ys) + Math.min(...ys)) / 2, mz = (Math.max(...zs) + Math.min(...zs)) / 2;
    const half = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) / 2;
    const pts = raw.points.map(([x, y, z, r, g, b]) => [r3((x - mx) / half), r3((y - my) / half), r3((z - mz) / half), r, g, b]);
    const depth = r3((Math.max(...zs) - Math.min(...zs)) / (2 * half));
    const out = { id: raw.id, key: c.key, points: pts, groups: groupsFor(c.motion, pts) };
    fs.writeFileSync(path.join(OUT_MEDIA, `${raw.id}.json`), JSON.stringify(out));
    if (Number(v.drohnen) !== pts.length) report.push(`${c.key}: ${raw.id} Katalog ${v.drohnen} Drohnen, gezählt ${pts.length} Punkte (gezählt gilt)`);
    used.push({ id: raw.id, points: pts.length, declared: Number(v.drohnen), depth, clip: Boolean(v.clip_id), sizeM: raw.sizeM });
  }
  if (!used.length) fail(`${c.key}: keine nutzbare Variante`);
  used.sort((a, b) => a.points - b.points);
  const first = variants[0];
  motifs[c.key] = { nr: c.nr, name: c.name, theme: first.thema, labels: String(first.anlaesse || '').split(';').map((s) => s.trim()).filter(Boolean), motion: c.motion, dimension: variants.some((v) => v.dimension === '3D') ? '3D' : '2D', variants: used };
}

// Texte der Katalogmotive je Sprache. Bewusst hier und nicht in src/i18n/ui.json: Jede Änderung dort macht die
// Übersetzungsnachweise aller Inhaltsdateien ungültig (site/ui ist eine Abhängigkeit des Übersetzungsvertrags).
const TEXTS = {
  caption: { de: '{name}, eine Formation aus dem FlyingStars-Katalog', en: '{name}, a formation from the FlyingStars catalogue', nl: '{name}, een formatie uit de FlyingStars-catalogus' },
  body: { de: '{name} als Körper in 3D', en: '{name} as a 3D body', nl: '{name} als 3D-lichaam' },
  story: { de: '{name}: Licht zeichnet die Form, dann wird sie lebendig', en: '{name}: light draws the shape, then it comes alive', nl: '{name}: licht tekent de vorm, dan komt hij tot leven' },
  lightDraws: { de: 'Licht zeichnet: {name}', en: 'Light draws: {name}', nl: 'Licht tekent: {name}' },
  comesAlive: { de: '{name} wird lebendig', en: '{name} comes alive', nl: '{name} komt tot leven' },
  becomesBody: { de: '{name} wird zum Körper', en: '{name} becomes a body', nl: '{name} wordt een lichaam' },
};
const meta = {
  texts: TEXTS,
  source: { title: 'FlyingStars-Motivkatalog', url: 'https://flyingstars-katalog-web.vercel.app/', snapshot: '2026-11-05', note: 'Eingebetteter Katalogstand, Punkte gezählt; Auswahl ist ein Vorschlag an FlyingStars, keine Flugfreigabe.' },
  motifs,
};
fs.writeFileSync(OUT_META, JSON.stringify(meta, null, 1) + '\n');
console.log(`${Object.keys(motifs).length} Motive, ${Object.values(motifs).reduce((s, m) => s + m.variants.length, 0)} Varianten übernommen.`);
for (const line of report) console.log(`- ${line}`);
