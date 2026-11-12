import { t as message } from '../i18n/ui.mjs';
// Tempo, Licht und Übergänge des Show-Konfigurators an einer Stelle (zwölfte Fassung, Marc 30.10.2026).
// Alle Zeiten in Sekunden der virtuellen Show-Uhr (show-field.js); der Tempofaktor der Vorführ-Steuerung skaliert sie.
// Vierzehnte Fassung (Marc, 30.10.2026 abends): Lichtlauf entlang der Linien (lightOrder statt Hilbert) und die Abfolge
// der eigenen Bilder (Text-Durchlauf, Logo) in composeShow().
import { lightOrder } from "./formation/index.js";

export const TEMPO = {
  /** Lebendige Wolke zwischen zwei Motiven, Gesamtdauer. Marc fand in der Designsprache-Probe die langsamste Stufe am
   * realistischsten: 2600 ms / 0,6 ≈ 4,3 s. Jede Drohne fliegt davon 60 %, die Starts sind über 40 % gestaffelt. */
  cloud: 4.3,
  cloudWindow: 0.6,
  /** Helligkeit im Flug und Anteil der Drohnen, die gleichzeitig aufblitzen (Studie 2: 0,07 und 10 %). */
  cloudDim: 0.07,
  cloudTwinkle: 0.1,
  cloudSpark: 1.15,
  // Runde 24 (Plimmiri-Messung, Recherche show-bewegung-messung/): In FlyingStars' dunklen Wechseln leuchten rund 10 % der
  // Drohnen, aber in zusammenhängenden Phasen von etwa 0,83 s real (Median), in der dreifach schnellen Vorschau 0,28 s.
  // Vorher wurde siebenmal je Sekunde neu ausgewählt (0,14 s), das flackerte statt zu blinken.
  cloudBlink: 0.28,
  /** Automatische Neupositionierung zwischen zwei Bildern ohne Wolke: langsamer als die Klick-Reaktion. */
  flight: { min: 1.8, max: 4.3 },
  /** Wie lange das letzte Bild eines Motivs steht, in allen Paketen (vorher 3,5 / 5 / 3,5 s). */
  hold: 3,
  /** Lichtlauf entlang der Form (Hilbert-Reihenfolge oder eigene Reihenfolge des Motivs): reine Zusatzhelligkeit.
   * Dreizehnte Fassung: schwächer (0,65 → 0,4), seltener (alle 4,6 → 6,5 s), nur noch bei Linien und Konturen ohne
   * eigenes Licht (runFits()); der Kopf beginnt vor der Form und blendet über 0,8 s ein, damit nichts aufblitzt. */
  run: { delay: 0.6, duration: 2.2, period: 6.5, width: 0.085, tail: 2.2, strength: 0.4, fadeIn: 0.8 },
  /** Fünfzehnte Fassung (Marc: „Logo glänzt“): der Lichtlauf über einem hochgeladenen Logo wie in Studie 1 der
   * Designsprache-Probe (früherer Swarm der Probe: wave 0,45, waveWidth 0,06, boost 0,6). Der Kopf läuft ohne
   * Pause von −0,3 bis 1,3 der Linienreihenfolge (1,6 / 0,45 ≈ 3,6 s), eine symmetrische Glocke, die nur aufhellt; er
   * beginnt mit der Ankunft und blendet über 0,8 s ein, so blitzt beim Start nichts auf. */
  logoRun: { delay: 0, duration: 3.56, period: 3.56, width: 0.06, tail: 1, strength: 0.6, fadeIn: 0.8 },
  /** Vierzehnte Fassung: das hochgeladene Logo steht 5 s (wie in Studie 1 der Designsprache-Probe) und kehrt vor jedem
   * zweiten Motiv zurück. */
  logoHold: 5,
  logoEvery: 2,
  /** Text-Durchlauf nach dem Tippen: je Schrift so viele Bilder, bis sie mindestens so lange stand. */
  tourHold: 5,
};

/** Tempostufen der Vorführ-Steuerung. */
export const RATES = [0.5, 1, 2];

/**
 * Grundhelligkeit (Marc: „Die Form leuchtet in voller Grundhelligkeit, ein Lichtlauf ist zusätzliche Helligkeit
 * obendrauf und dimmt die Form nie ab“). Effekte der Motive dürfen nur aufhellen: Werte zwischen 0,6 und 1 werden zu 1.
 * Bewusst dunkle Drohnen (unter Wasser, verdeckte Zeilen, Feuerwerksglut, unter 0,2) bleiben dunkel; dazwischen ein
 * weicher Übergang, damit ein Ausblenden nicht springt.
 */
export function lift(a) {
  if (a >= 1 || a <= 0.2) return a;
  if (a >= 0.6) return 1;
  const u = (a - 0.2) / 0.4;
  return 0.2 + 0.8 * u * u * (3 - 2 * u);
}

/** Zusatzhelligkeit des Lichtlaufs für eine Drohne an Stelle u ∈ [0, 1] der Reihenfolge, tau s nach der Ankunft.
 * Wie in der Designsprache-Probe: der Kopf startet bei −0,3 (vor dem Anfang der Form) und die Stärke wächst über
 * fadeIn, so blitzt beim Start kein Teil der Form auf; jeder Lauf endet hinter der Form (Kopf bei 1,3).
 * Vierzehnte Fassung (Marc: „weich und organisch, kein harter Rand“): Glockenform ohne Kante, dahinter ein längerer,
 * langsam auslaufender Schweif (tail × Breite), damit das Licht wie ein Schein über die Linie zieht. */
export function runLight(u, tau, params = TEMPO.run) {
  const { delay, duration, period, width, tail, strength, fadeIn } = params;
  if (tau < delay) return 0;
  const since = tau - delay, phase = since % period;
  if (phase > duration) return 0;
  const d = u - (-0.3 + (phase / duration) * 1.6), w = d < 0 ? width * tail : width;
  return strength * Math.min(1, since / fadeIn) * Math.exp(-((d / w) ** 2));
}

/**
 * Bekommt ein Bild den Lichtlauf? (Marc, 30.10.2026: „overdone“, manche Formen haben ihr Licht schon eingebaut.)
 * Nur Linien- und Konturformen ohne eigenes Licht: Das Bild bewegt sein Licht in live() nicht selbst, und die meisten
 * Punkte liegen auf einer Linie (lokal eindimensional). Flächen, Körperoberflächen und Punktwolken bekommen keinen.
 */
export function runFits(beat) {
  if (beat.run !== undefined) return beat.run;
  if (beat.shimmer === false || beat.interlude) return false;
  const pts = beat.pts, n = pts.length, out = [0, 0, 0, 1];
  // eigenes Licht: an einigen Zeitpunkten weicht die Helligkeit eines nennenswerten Teils der Drohnen von 1 ab
  if (beat.live) {
    let own = 0;
    for (let j = 0; j < n; j += 3) for (const t of [0.4, 1.3, 2.6, 4.1]) { const p = pts[j]; out[0] = p[0]; out[1] = p[1]; out[2] = p[2] || 0; out[3] = 1; beat.live(p, j, t, out); if (Math.abs(lift(out[3]) - 1) > 0.03) { own++; break; } }
    if (own > n / 3 * 0.05) return false;
  }
  // Linie: die vier nächsten Nachbarn liegen fast auf einer Geraden (größte Hauptachse dominiert)
  let linear = 0, tested = 0;
  const step = Math.max(1, Math.floor(n / 90));
  for (let j = 0; j < n; j += step) {
    const p = pts[j], near = [];
    for (let q = 0; q < n; q++) { if (q === j) continue; const d = (pts[q][0] - p[0]) ** 2 + (pts[q][1] - p[1]) ** 2 + ((pts[q][2] || 0) - (p[2] || 0)) ** 2; if (near.length < 4) { near.push([d, q]); near.sort((a, b) => a[0] - b[0]); } else if (d < near[3][0]) { near[3] = [d, q]; near.sort((a, b) => a[0] - b[0]); } }
    const nb = [p, ...near.map(([, q]) => pts[q])], m = [0, 1, 2].map((k) => nb.reduce((s, x) => s + (x[k] || 0), 0) / nb.length);
    let xx = 0, yy = 0, zz = 0, xy = 0, xz = 0, yz = 0;
    for (const x of nb) { const a = x[0] - m[0], b = x[1] - m[1], c = (x[2] || 0) - m[2]; xx += a * a; yy += b * b; zz += c * c; xy += a * b; xz += a * c; yz += b * c; }
    // Anteil der Streuung entlang der Hauptachse (Potenziteration, wenige Schritte reichen)
    let v = [1, 0.7, 0.3];
    for (let it = 0; it < 12; it++) { const w = [xx * v[0] + xy * v[1] + xz * v[2], xy * v[0] + yy * v[1] + yz * v[2], xz * v[0] + yz * v[1] + zz * v[2]], l = Math.hypot(...w) || 1; v = w.map((c) => c / l); }
    const along = xx * v[0] * v[0] + yy * v[1] * v[1] + zz * v[2] * v[2] + 2 * (xy * v[0] * v[1] + xz * v[0] * v[2] + yz * v[1] * v[2]), total = xx + yy + zz || 1;
    tested++; if (along / total > 0.9) linear++;
  }
  return linear / tested >= 0.7;
}

/** Hilbert-Index (lokalitätserhaltende Reihenfolge, wie hilbertSort in der Designsprache-Probe). */
function hilbert(x, y, n) {
  let d = 0;
  for (let s = n >> 1; s > 0; s >>= 1) {
    const rx = (x & s) > 0 ? 1 : 0, ry = (y & s) > 0 ? 1 : 0;
    d += s * s * ((3 * rx) ^ ry);
    if (ry === 0) { if (rx === 1) { x = s - 1 - x; y = s - 1 - y; } const t = x; x = y; y = t; }
  }
  return d;
}

/** Indizes 0..n-1 in Hilbert-Reihenfolge ihrer Punkte (x(i), y(i)); y wächst nach oben. */
export function hilbertOrder(n, x, y) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (let i = 0; i < n; i++) { x0 = Math.min(x0, x(i)); x1 = Math.max(x1, x(i)); y0 = Math.min(y0, y(i)); y1 = Math.max(y1, y(i)); }
  const s = Math.max(x1 - x0, y1 - y0, 1e-6), G = 1024;
  return Array.from({ length: n }, (_, i) => [hilbert(Math.round(((x(i) - x0) / s) * (G - 1)), Math.round(((y1 - y(i)) / s) * (G - 1)), G), i]).sort((a, b) => a[0] - b[0]).map(([, i]) => i);
}

/** Stelle jedes Punktes in der Lichtlauf-Reihenfolge, 0..1 (Float32Array, Index = Punkt). Ein Motiv kann mit
 * `order` (Array 0..1 je Punkt, z. B. entlang der Kontur) eine eigene Reihenfolge vorgeben.
 * Vierzehnte Fassung (Marc: „Hard Cut, quadrantenweise“): Die Hilbert-Reihenfolge sprang zwischen den Bildvierteln.
 * Jetzt lightOrder() aus formation/: ein Weg von Punkt zu nächstem Nachbarn, der den Linien der Form folgt (Start links
 * unten). Die Bildpunkte haben y nach oben, lightOrder erwartet y nach unten. Gilt auch für die Staffelung der Wolke. */
export function rankOf(beat) {
  if (beat.rank) return beat.rank;
  const pts = beat.pts, n = pts.length;
  if (beat.order?.length === n) { const rank = new Float32Array(n); beat.order.forEach((u, j) => { rank[j] = u; }); return (beat.rank = rank); }
  return (beat.rank = lightOrder(pts.map((p) => ({ x: p[0], y: -p[1] }))));
}

/* ---------- Abfolge der eigenen Bilder (vierzehnte Fassung) ---------- */

/** Segmentnummern: Motive des Anlasses 0..M−1, der eigene Text als Finale M, das Logo LOGO, der Text-Durchlauf ab TOUR. */
export const LOGO_SEGMENT = -1;
export const TOUR_SEGMENT = 100;
/** Reihenfolge des Text-Durchlaufs nach dem Tippen (Marc: Schreibschrift → Druckschrift → Initialen). */
export const TOUR_STYLES = ["script", "print", "initials"];

/**
 * Setzt die Show aus den gebauten Teilen zusammen. main: die Show des Anlasses (buildSequence, Segmente 0..M, der
 * eigene Text in der gewählten Schrift als Segment M); tour: die drei Schriften des eigenen Textes (buildSequence mit
 * drei Text-Motiven) oder null; logo: Punkte des hochgeladenen Logos [x, y, z, r, g, b] oder null.
 * - Der Text-Durchlauf steht vorn und läuft einmal: loopTo zeigt hinter ihn, die Runde beginnt danach mit dem Logo
 *   bzw. dem ersten Motiv. Je Schrift nur so viele Bilder, bis sie TEMPO.tourHold stand (ODYSSEY erzählt den Text in
 *   drei Akten, der letzte verwandelt ihn in eine andere Schrift; im Durchlauf entfällt das, im Finale bleibt es).
 *   Ein Bild mit tour: false lässt der Durchlauf aus.
 * - Das Logo eröffnet die Runde und kehrt vor jedem TEMPO.logoEvery-ten Motiv zurück; es wird durch die lebendige
 *   Wolke erreicht, das Bild danach dann ohne eine zweite Wolke.
 * Die Bilder werden kopiert (die gebauten Sequenzen liegen im Cache und bleiben unverändert). tourCaption(caption,
 * style) benennt die Bilder des Durchlaufs für die Bildbeschreibung (z. B. „…, in Druckschrift“).
 */
export function composeShow({ main, tour = null, logo = null, logoCaption = message('showConfigurator.yourLogo'), textStyle = null, textSegment = -2, tourCaption = (caption) => caption }) {
  const copy = (b, extra) => ({ ...b, ...extra });
  const intro = [];
  if (tour) {
    const per = new Map();
    for (const b of tour.beats) { if (b.interlude || b.tour === false) continue; const s = b.segment ?? 0; if (!per.has(s)) per.set(s, []); per.get(s).push(b); }
    [...per.keys()].sort((a, b) => a - b).forEach((s, i) => {
      let stood = 0;
      for (const b of per.get(s)) {
        if (stood >= TEMPO.tourHold) break;
        intro.push(copy(b, { segment: TOUR_SEGMENT + i, textStyle: TOUR_STYLES[i] ?? null, caption: tourCaption(b.caption, TOUR_STYLES[i]) }));
        stood += b.hold ?? 2.2;
      }
    });
  }
  const loopBeat = logo?.length ? { pts: logo, caption: logoCaption, motif: "Logo", hold: TEMPO.logoHold, cloud: true, segment: LOGO_SEGMENT, logo: true } : null;
  // fünfzehnte Fassung: das Logo glänzt immer, mit dem Lichtlauf aus Studie 1 (runFits() hätte einer Fläche keinen gegeben)
  if (loopBeat) { loopBeat.run = true; loopBeat.runLight = TEMPO.logoRun; }
  // Runde 26: schwarze Punkte am Ende sind Reserve-Drohnen (der Strichgraph braucht oft weniger als n); sie bleiben ganz
  // dunkel, auch der Lichtlauf erfasst sie nicht (er hellt nur Drohnen ab voller Helligkeit auf)
  const dark = loopBeat ? logo.findIndex((p) => p[3] + p[4] + p[5] === 0) : -1;
  if (dark >= 0) loopBeat.live = (b, j, t, o) => { if (j >= dark) o[3] = 0; };
  const round = [];
  let motifs = 0, last = null, afterLogo = false, body = main.beats;
  // with a logo the round begins with it: a figure that led back into the first motif (SPARK) is not needed there
  if (loopBeat) { let e = body.length; while (e > 0 && body[e - 1].interlude) e--; body = body.slice(0, e); }
  for (const b of body) {
    const s = b.segment ?? 0, starts = s !== last;
    last = s;
    if (starts && loopBeat && motifs % TEMPO.logoEvery === 0) { round.push(copy(loopBeat)); afterLogo = true; }
    if (starts) motifs++;
    // one cloud is enough: the picture after the logo is reached by a normal flight
    const extra = afterLogo && b.cloud === true ? { cloud: false } : {};
    afterLogo = false;
    round.push(copy(b, s === textSegment && textStyle ? { ...extra, textStyle } : extra));
  }
  return { beats: [...intro, ...round], loopTo: intro.length };
}

/* ---------- Freischalten und Mindestzahlen (vierzehnte Fassung) ---------- */

/** Mindestzahl einer Motivfassung: `minDrones` (pflegt Worker B in content/show-configurator.js), sonst das ältere
 * `min` der dreizehnten Fassung, sonst keine. */
export const minDronesOf = (version) => version?.minDrones ?? version?.min ?? 0;
/** Spielt dieses Motiv im Paket bei dieser Drohnenzahl? */
export const canPlay = (motif, pkg, drones) => Boolean(motif.tiers[pkg]) && minDronesOf(motif.tiers[pkg]) <= drones;
/** Ab wie vielen Drohnen die Fassung eines Pakets möglich ist: ihre Mindestzahl, mindestens der Anfang des Paketbereichs. */
export const possibleFrom = (version, rangeMin) => Math.max(minDronesOf(version), rangeMin);
/** Motive, die bei `after` ({ pkg, drones }) spielen und bei `before` nicht, in der Reihenfolge des Anlasses. */
export const freshMotifs = (motifs, before, after) => motifs.filter((m) => canPlay(m, after.pkg, after.drones) && !canPlay(m, before.pkg, before.drones));
/** Freischalt-Meldung: ein Motiv mit Namen, mehrere mit Zahl und Namen. */
export const unlockNote = (list) => (list.length === 1 ? message('configurator.newMotif', { label: list[0].label }) : message('configurator.newMotifs', { count: list.length, list: list.map((m) => m.label).join(', ') }));
