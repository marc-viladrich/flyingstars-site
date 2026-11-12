// Logo-Modus des Show-Konfigurators (Runde 27, Marc 12.11.2026). Wird erst geladen, wenn jemand in den Logo-Modus wechselt
// oder ein Logo hochlädt (show-configurator.js importiert dieses Modul dynamisch; der Konverter selbst rechnet im Worker
// von logo-v10/ und lädt mit der ersten eigenen Datei).
// - Kundenlogos: vorberechnete Formationen (public/media/logo-modus/kundenlogos.json, erzeugt mit
//   23-logo-drohnen-konverter/tools/v10/examples.mjs). Gezeigt werden je Drohnenzahl nur die Logos, die in diese Zahl passen.
// - Eigenes Logo: logo-v10 (Kontur, Budget-Flexibilität, Detailgrad), Entfernen von Teilen in einer flachen Ansicht über der
//   Bühne (die Bühne selbst ist gekippt und fliegt; dort wäre ein Klick nicht verlässlich einer Drohne zuzuordnen).
import { logoFormations } from "./logo-v10/logo-formation.js";
import { colourRuns, targetKey, selectedPoints, widenSelection, selectElement, selectionForAction } from "./logo-v10/groups.mjs";
import { nearestHit, rectUnits } from "./logo-v10/pick.mjs";
import { bindRubberBand } from "./logo-v10/rubber-band.mjs";

let examples = null;
/** Die Kundenlogos für n Drohnen: [{ name, pts: [[x, y], …] (y nach unten, lange Seite in [-1, 1]), n }]. */
export async function customerLogos(n) {
  examples ??= fetch("/media/logo-modus/kundenlogos.json").then((r) => { if (!r.ok) throw new Error(String(r.status)); return r.json(); });
  const data = await examples;
  const step = [...data.counts].reverse().find((c) => c <= n) ?? data.counts[0];
  const out = [];
  for (const logo of data.logos) {
    const s = logo.steps[step];
    if (!s || s.n > n * 1.1) continue;
    const pts = []; for (let i = 0; i < s.p.length; i += 2) pts.push([s.p[i] / 1000, s.p[i + 1] / 1000]);
    out.push({ id: logo.id, name: logo.name, pts, n: s.n, best: s.flex === "flexible" });
  }
  // nur die beste (flexible) Fassung zeigt, was FlyingStars kann; die strenge (dünne Linien) nur, wenn sonst keine drei
  // Logos in die Zahl passen (Marc 12.11.: „wenn wir nicht mal unsere eigenen Logos hinkriegen …“)
  const best = out.filter((x) => x.best);
  return best.length >= 3 ? best : [...best, ...out.filter((x) => !x.best).slice(0, 3 - best.length)];
}

/**
 * Eine Sitzung je hochgeladener Datei. opts: { flex: 'auto'|'strict'|'medium'|'flexible', density?: Zahl }.
 * formation(n) → Punkte [{ x, y, c: [r, g, b] }] mit meta { n, wanted, over, … } (Farben schon für den Nachthimmel).
 */
export function logoSession(file) {
  let opts = { flex: "auto" }, inst = null, removed = [];
  const removals = () => ({ exclude: removed.filter((r) => !r.erase).flatMap((r) => r.anchors), erase: removed.filter((r) => r.erase).flatMap((r) => r.anchors) });
  const fresh = () => { inst?.dispose(); inst = logoFormations(file, { opts: { ...opts } }); if (removed.length) inst.setRemovals(removals()); };
  fresh();
  return {
    formation: (n, o) => inst.formation(n, o),
    setOptions(next) { const o = { ...opts, ...next }; if (o.density == null) delete o.density; if (JSON.stringify(o) === JSON.stringify(opts)) return false; opts = o; fresh(); return true; },
    get options() { return { ...opts }; },
    get removed() { return removed; },
    setRemoved(list) { removed = list; inst.setRemovals(removals()); },
    dispose() { inst?.dispose(); inst = null; },
  };
}

/**
 * Flache Bearbeitungsansicht über der Bühne: Formen anklicken (Farblinie, zweiter Klick das ganze Element), Rahmen
 * aufziehen, entfernen, wiederherstellen. el: { root, canvas, band, text, remove, restore, clear, all, close }.
 * onChange(removedList) rechnet neu; t(key, vars) liefert die Texte.
 */
export function logoEditor(el, { onChange, t }) {
  const c = el.canvas, g = c.getContext("2d");
  let shown = null, groups = null, removed = [], selected = new Set(), hover = null;
  const screen = (p) => ({ x: c.width / 2 + p.x * 0.42 * Math.min(c.width, c.height), y: c.height / 2 + p.y * 0.42 * Math.min(c.width, c.height) });
  const ghostsOf = (r) => { const f = shown?.meta.frame; return r.ghost.map((p) => (f && p.source ? { ...p, x: p.source.x * f.sx + f.ox, y: p.source.y * f.sy + f.oy } : p)); };
  const pointsFor = (key) => (key[0] === "g" ? ghostsOf(removed[+key.slice(1)]) : selectedPoints(groups, shown, key));
  function draw() {
    if (el.root.hidden) return;
    const d = Math.min(2, devicePixelRatio || 1);
    c.width = c.clientWidth * d; c.height = c.clientHeight * d;
    g.clearRect(0, 0, c.width, c.height);
    if (!shown) return;
    const radius = Math.max(1.2 * d, (shown.meta.spacing || 0.03) * 0.42 * Math.min(c.width, c.height) * 0.3);
    const dot = (p, ghost = false) => { const q = screen(p); g.fillStyle = `rgba(${p.c.join(",")},${ghost ? 0.22 : 1})`; g.beginPath(); g.arc(q.x, q.y, radius, 0, Math.PI * 2); g.fill(); };
    removed.forEach((r) => ghostsOf(r).forEach((p) => dot(p, true)));
    shown.forEach((p) => dot(p));
    for (const key of new Set([...selected, hover].filter(Boolean))) {
      g.strokeStyle = selected.has(key) ? "#ffb36b" : "rgba(255,255,255,.85)"; g.lineWidth = 1.5 * d;
      for (const p of pointsFor(key)) { const q = screen(p); g.beginPath(); g.arc(q.x, q.y, radius + 2.5 * d, 0, Math.PI * 2); g.stroke(); }
    }
  }
  function bar() {
    const s = [...selected];
    el.text.textContent = s.length ? t("logoMode.selected", { n: s.length }) : t("logoMode.editHint");
    el.remove.hidden = !s.some((k) => k[0] !== "g"); el.restore.hidden = !s.some((k) => k[0] === "g");
    el.clear.hidden = !s.length; el.all.hidden = !removed.length;
  }
  const candidates = () => [
    ...shown.filter((p) => p.e >= 0).map((p) => ({ ...screen(p), key: targetKey(groups, p) })),
    ...removed.flatMap((r, i) => ghostsOf(r).map((p) => ({ ...screen(p), key: "g" + i }))),
  ];
  function hit(e) {
    if (!shown) return null;
    const r = c.getBoundingClientRect(), k = c.width / r.width;
    return nearestHit(candidates(), (e.clientX - r.left) * k, (e.clientY - r.top) * k, Math.max(14 * k, (shown.meta.spacing || 0.03) * 0.42 * Math.min(c.width, c.height) * 1.2))?.key ?? null;
  }
  const band = bindRubberBand(c, {
    hit, overlay: el.band, candidates,
    select(d, add) {
      const r = c.getBoundingClientRect(), k = c.width / r.width;
      const rect = { x0: (Math.min(d.x0, d.x1) - r.left) * k, y0: (Math.min(d.y0, d.y1) - r.top) * k, x1: (Math.max(d.x0, d.x1) - r.left) * k, y1: (Math.max(d.y0, d.y1) - r.top) * k };
      if (!add) selected.clear();
      for (const key of rectUnits(candidates(), rect)) widenSelection(selected, key, groups);
      bar(); draw();
    },
  });
  c.addEventListener("pointermove", (e) => { if (band.active) return; hover = hit(e); c.style.cursor = hover ? "pointer" : "crosshair"; draw(); });
  c.addEventListener("pointerleave", () => { hover = null; draw(); });
  c.addEventListener("click", (e) => { if (band.suppressClick()) return; const h = hit(e); if (h) widenSelection(selected, h, groups); else selected.clear(); bar(); draw(); });
  c.addEventListener("dblclick", (e) => { const h = hit(e); if (h?.[0] === "r") { selectElement(selected, groups.runs[+h.slice(1)].e, groups); bar(); draw(); } });
  function apply(mode) {
    const chosen = selectionForAction(selected, mode), keep = removed.filter((r, i) => !chosen.has("g" + i));
    // (nie alles entfernen: ohne Punkte bliebe kein Logo; die Auswahl bleibt dann stehen)
    if (mode === "remove") { const gone = new Set(); for (const key of chosen) if (key[0] !== "g") for (const p of pointsFor(key)) gone.add(p); if (gone.size >= shown.length) return; }
    for (const key of chosen) {
      if (key[0] === "g") continue;
      if (key[0] === "r" && selected.has("e" + groups.runs[+key.slice(1)].e)) continue;
      const dots = pointsFor(key), f = shown.meta.frame;
      const anchors = key[0] === "r"
        ? (shown.meta.colourGroups || []).filter((q) => groups.runs[+key.slice(1)].cgs.includes(q.id)).map((q) => q.anchor)
        : (shown.meta.elements || []).filter((q) => q.id === +key.slice(1)).map((q) => q.anchor);
      if (anchors.length) keep.push({ erase: key[0] === "r", anchors, ghost: dots.map((p) => ({ ...p, source: { x: (p.x - f.ox) / f.sx, y: (p.y - f.oy) / f.sy } })) });
    }
    removed = keep; selected.clear(); hover = null; bar(); onChange(removed);
  }
  el.remove.addEventListener("click", () => apply("remove"));
  el.restore.addEventListener("click", () => apply("restore"));
  el.clear.addEventListener("click", () => { selected.clear(); bar(); draw(); });
  el.all.addEventListener("click", () => { removed = []; selected.clear(); bar(); onChange(removed); });
  const keys = (e) => { if (el.root.hidden) return; if (e.key === "Escape") { if (selected.size) { selected.clear(); bar(); draw(); } else el.close.click(); } else if ((e.key === "Delete" || e.key === "Backspace") && selected.size && !/input|textarea/i.test(document.activeElement?.tagName)) { e.preventDefault(); apply("remove"); } };
  document.addEventListener("keydown", keys);
  new ResizeObserver(draw).observe(c);
  return {
    /** neue Formation (nach dem Rechnen) zeigen; removedList: die Entfernungen der Sitzung */
    show(pts, removedList) {
      shown = pts; removed = removedList; selected.clear(); hover = null;
      groups = colourRuns({ points: pts.map((p) => Object.assign(p, { r: p.c[0], g: p.c[1], b: p.c[2] })), spacing: pts.meta.spacing });
      bar(); draw();
    },
    redraw: draw,
  };
}
