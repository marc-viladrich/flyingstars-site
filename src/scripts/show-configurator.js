import {inquiryHref} from '../content/inquiry.mjs';
import {startingPrice} from '../lib/price.mjs';
import {durationValues} from '../content/show-duration.mjs';
import { localeFromPath } from '../i18n/routing.mjs';
const locale = localeFromPath(location.pathname);
const { OCCASIONS, STEPS } = getConfiguratorContent(locale);
import { t as message } from '../i18n/ui.mjs';
// Show configurator. Anlass picks a sequence of motifs that plays like a little show; Paket and Drohnenzahl set the
// price (zwölfte Fassung, Marc 30.10.2026: the drone count is the third axis, every package has its own range, crossing
// a range boundary switches the package visibly). Switching the package turns the motif on stage into its version for
// that package and plays on from there. The player bar below the stage runs on the virtual show clock of
// show-field.js: pause freezes the exact frame, 0,5× / 1× / 2× set the tempo, the track jumps between pictures.
// Dreizehnte Fassung (Marc, 30.10.2026): the drone ranges are seamless (no more flipping between packages), and complex
// motifs need a minimum drone count. Pushing the slider over such a threshold shows a small toast on the stage and flies
// the stage through the living cloud straight to the motif that was just unlocked.
// Vierzehnte Fassung, Teil A (Marc, 30.10.2026 abends; docs/show-konfigurator.md):
// - a click anywhere on the stage pauses and resumes (a real button under the controls, Space/Enter work)
// - the track tells on hover and focus from how many drones a sequence is possible
// - the unlock note also counts motifs unlocked by a package switch („3 neue Motive: …“) and flies to the first one
// - changing the occasion and the loop back to the first picture always go through the living cloud
// - the visitor's text runs once through Schreibschrift → Druckschrift → Initialen, the chosen style follows the stage
// - an uploaded logo becomes a picture of its own: it opens the round, stands 5 s and comes back regularly. The file
//   stays in the browser: it is read into a blob URL (or as SVG text) and rastered by formation() in a worker, nothing
//   is sent, stored or logged
// - no more explanatory microcopy under the slider and the package (Marc: visible at slider and picker anyway)
// Fünfzehnte Fassung (Marc, 30.10.2026, 22 Uhr; docs/show-konfigurator.md):
// - the drop zone invites once, the first time the mouse moves over the stage; afterwards only while a file is dragged
//   or the pointer is on „Logo“
// - the unlock note speaks the language of the page: the motif's name in the FlyingStars gradient, a light point draws a
//   fine gradient edge underneath (markup built in showToast, styles in components/configurator/ShowConfigurator.astro)
// Sechzehnte Fassung (Marc, 31.10.2026; docs/show-konfigurator.md):
// - Freischalt-Leiter in jedem Paket (content/show-configurator.js, LADDER): gesperrte Motive stehen rechts neben der Spur
//   als ungeleuchtete Lichtpunkte; Hinweis „Antrag · ab 450 Drohnen“, ein Klick stellt diese Drohnenzahl ein
// - der Konfigurator ist eine Komponente (components/configurator/ShowConfigurator.astro) im Seitenfluss der Preisseite;
//   die Preisleiste auf dem Handy erscheint nur, solange er im Bild ist
// Runde 11 (Marc, 1.11.2026; docs/show-konfigurator.md):
// - der Anlass ist ein natives <select>, in der Ordnung der Startseiten-Karten; Saison-Anlässe (Silvester im November
//   und Dezember) rücken beim Laden nach vorn (bySeason), vorausgewählt ist der erste, ?anlass=… gewinnt
// - der gleitende Rahmen an den Paketknöpfen ist reines CSS (ShowConfigurator.astro): er folgt dem Radio, also auch dem
//   Regler, der unten in update() das Paket umstellt
import { getConfiguratorContent, unlockAt, bySeason } from "../content/show-configurator.js";
import { SHOW_PACKAGES, DRONE_RANGES, DRONES_MIN, packageForDrones, snapDrones, clampToPackage, configuratorPrice } from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildSequence, preloadScenes } from "./show-scenes.js";
import { composeShow, canPlay, possibleFrom, minDronesOf, freshMotifs, unlockNote, LOGO_SEGMENT, TOUR_SEGMENT, TOUR_STYLES, TEMPO } from "./show-tempo.js";
import { chars } from "./text-formation.js";

const form = document.querySelector("#cfg");
if (form) {
  const $ = (s) => document.querySelector(s);
  let current = null, first = true, segment = 0;
  const track = $("#cfg-track"), marks = $("#cfg-marks"), play = $("#cfg-play"), stage = $(".cfg-stage"), tip = $("#cfg-tip"), player = $("#cfg-player"), locks = $("#cfg-locks");
  let drawn = null, scrubbing = false, lastTick = 0, tipAt = null;
  const field = createField($("#cfg-field"), {
    onBeat: (k, beat) => {
      $("#cfg-scene").textContent = beat.caption;
      const logoCaption = $("#cfg-logo-caption");
      logoCaption.hidden = !(beat.logo && !logoMode && drones < (lastLogoPts?.length ?? 0));
      logoCaption.textContent = logoCaption.hidden ? "" : beat.caption;
      segment = beat.segment ?? 0;
      if (tour && current && k >= current.loopTo) tour = false; // the text ran through once; the round goes on without it
      showStyle(beat.textStyle ?? style);
      // ein gezeigter Hinweis zu einem gesperrten Motiv (is-locked) bleibt stehen, bis der Zeiger bzw. Fokus geht
      if (document.activeElement === track) showTip(k); else if (tipAt === null && !tip.classList.contains("is-locked")) showTip(k, { quiet: true });
    },
    onTick: (tl) => { const t = performance.now(); if (scrubbing || (t - lastTick < 90 && tl && !tl.paused)) return; lastTick = t; drawTrack(tl); },
  });

  // ---------- Vorführ-Steuerung ----------
  const count = () => current?.beats.length ?? 1;
  /** One step through the pictures, round the loop; the figure interludes of SPARK are skipped (one click, one picture). */
  const stepTo = (dir) => { let k = field.beat(); do k = (k + dir + count()) % count(); while (current?.beats[k]?.interlude && k !== field.beat()); field.goto(k); };
  /** The picture under a point of the track (0..1); interludes snap to the motif they lead into. */
  const beatAt = (x) => {
    const tl = field.timeline(); if (!tl) return 0;
    const total = tl.est.reduce((a, b) => a + b, 0); let acc = 0, k = 0;
    for (; k < tl.est.length - 1; k++) { if (acc + tl.est[k] > x * total) break; acc += tl.est[k]; }
    while (tl.beats[k]?.interlude && k < tl.beats.length - 1) k++;
    return k;
  };
  function drawTrack(tl, preview) {
    if (!tl) return;
    if (drawn !== tl.beats) {
      // one mark per picture, its width the picture's estimated time; a new motif starts with a wider gap
      drawn = tl.beats;
      marks.replaceChildren(...tl.beats.map((b, k) => { const s = document.createElement("span"); s.style.flexGrow = String(tl.est[k]); if (k && b.segment !== tl.beats[k - 1].segment) s.className = "is-motif"; return s; }));
      track.setAttribute("aria-valuemax", String(tl.beats.length));
      if (tl.beats.length > 40) marks.dataset.dense = "2"; else if (tl.beats.length > 16) marks.dataset.dense = "1"; else delete marks.dataset.dense;
    }
    const total = tl.est.reduce((a, b) => a + b, 0), before = tl.est.slice(0, tl.beat).reduce((a, b) => a + b, 0);
    const at = (preview ?? (before + tl.frac * tl.est[tl.beat]) / total) * total;
    // each mark fills with the package colour as far as the show has come (the gaps between marks stay empty)
    let acc = 0;
    [...marks.children].forEach((m, k) => { const f = Math.min(1, Math.max(0, (at - acc) / tl.est[k])); acc += tl.est[k]; m.style.setProperty("--f", `${(f * 100).toFixed(1)}%`); });
    track.setAttribute("aria-valuenow", String(tl.beat + 1));
    track.setAttribute("aria-valuetext", message('showConfigurator.sceneValueOfValueValue', { v0: tl.beat + 1, v1: tl.beats.length, v2: tl.beats[tl.beat].caption }));
  }

  // Hinweis an der Spur (vierzehnte Fassung): Name der Sequenz und ab wie vielen Drohnen sie möglich ist
  /** What the sequence of beat b is and from how many drones it can be flown (its minimum, at least the package's range). */
  function tipText(b) {
    const range = DRONE_RANGES[pkgName()].min;
    if (b.logo) return [message('showConfigurator.yourLogo'), DRONES_MIN];
    const seg = b.segment ?? 0;
    const m = seg < occasion.motifs.length && seg >= 0 ? occasion.motifs[seg] : textMotif(style);
    return [seg >= 0 && seg < occasion.motifs.length ? m.label : message('showconfigurator.yourText'), possibleFrom(m.tiers[pkgName()], range)];
  }
  function showTip(k, { quiet = false } = {}) {
    const tl = field.timeline(); if (!tl || !tl.beats[k]) return hideTip();
    while (tl.beats[k]?.interlude && k < tl.beats.length - 1) k++;
    const b = tl.beats[k];
    let a = k, e = k;
    const same = (q) => tl.beats[q] && (tl.beats[q].segment ?? 0) === (b.segment ?? 0) && Boolean(tl.beats[q].logo) === Boolean(b.logo);
    while (a > 0 && (same(a - 1) || (tl.beats[a - 1].interlude && (tl.beats[a - 1].segment ?? 0) === (b.segment ?? 0)))) a--;
    while (same(e + 1)) e++;
    const [label, from] = tipText(b);
    setTip(label, from);
    const kids = marks.children; if (!kids[a] || !kids[e] || kids.length !== tl.beats.length) return;
    const r0 = kids[a].getBoundingClientRect(), r1 = kids[e].getBoundingClientRect();
    placeTip((r0.left + r1.right) / 2);
    if (quiet) return; // only the text: the description of the track stays right for the picture on stage
    tip.classList.remove("is-locked"); tip.classList.add("is-on"); tipAt = k;
  }
  const esc = (t) => t.replace(/[<&]/g, (c) => (c === "<" ? "&lt;" : "&amp;"));
  const setTip = (label, from) => { const html = message('showConfigurator.bValueBFromValueDrones', { v0: esc(label), v1: from }); if (tip.innerHTML !== html) tip.innerHTML = html; };
  /** The hint stands over a point of the player bar (x in client pixels), kept inside the bar. */
  const placeTip = (x) => {
    const pr = player.getBoundingClientRect(), half = tip.offsetWidth / 2;
    tip.style.setProperty("--x", `${Math.max(half + 4, Math.min(pr.width - half - 4, x - pr.left))}px`);
  };
  const hideTip = () => { tip.classList.remove("is-on", "is-locked"); tipAt = null; };

  // Gesperrte Motive (sechzehnte Fassung): ungeleuchtete Lichtpunkte rechts neben der Spur, nach Schwelle geordnet.
  // Zeigen oder Fokus nennt Motiv und Schwelle, ein Klick stellt die Schwelle ein (die Meldung erscheint, die Bühne fliegt
  // durch die Wolke dorthin). Runde 24: ein Punkt je Schwelle, nicht je Motiv. Mit den Katalogmotiven schalten sich bei
  // 120, 150 und 160 Drohnen mehrere Motive zugleich frei; je Motiv ein Punkt drückte auf dem Handy die Tempo-Knöpfe aus
  // dem Bild.
  function drawLocks() {
    const list = occasion.motifs.map((m) => [m, unlockAt(m, drones)]).filter(([, at]) => at !== null).sort((a, b) => a[1] - b[1]);
    const key = `${occasion.id}:` + list.map(([m, at]) => `${m.id}@${at}`).join(",");
    if (locks.dataset.key === key) return;
    locks.dataset.key = key;
    locks.hidden = !list.length;
    const groups = [];
    for (const [m, at] of list) { const g = groups.at(-1); if (g && g.at === at) g.motifs.push(m); else groups.push({ at, motifs: [m] }); }
    locks.replaceChildren(...groups.map(({ at, motifs }) => {
      const names = motifs.map((m) => m.label), short = names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(", ");
      const b = document.createElement("button");
      b.type = "button"; b.className = "cfg-lock"; b.dataset.motif = motifs.map((m) => m.id).join(" "); b.dataset.at = String(at);
      b.setAttribute("aria-label", message('showConfigurator.valueFromValueDronesSetDroneCountToValue', { v0: names.join(", "), v1: at, v2: at }));
      b.innerHTML = '<i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>';
      const show = () => { setTip(short, at); const r = b.getBoundingClientRect(); placeTip((r.left + r.right) / 2); tip.classList.add("is-on", "is-locked"); tipAt = null; };
      b.addEventListener("pointerenter", show); b.addEventListener("focus", show);
      b.addEventListener("pointerleave", () => { if (document.activeElement !== b) hideTip(); }); b.addEventListener("blur", hideTip);
      b.addEventListener("click", () => { hideTip(); first = false; setDrones(at); });
      return b;
    }));
  }

  const trackX = (e) => { const r = track.getBoundingClientRect(); return Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)); };
  track.addEventListener("pointerdown", (e) => { scrubbing = true; track.setPointerCapture(e.pointerId); drawTrack(field.timeline(), trackX(e)); showTip(beatAt(trackX(e))); });
  track.addEventListener("pointermove", (e) => {
    if (scrubbing) drawTrack(field.timeline(), trackX(e));
    if (scrubbing || e.pointerType !== "touch") { const k = beatAt(trackX(e)); if (k !== tipAt) showTip(k); }
  });
  track.addEventListener("pointerleave", () => { if (!scrubbing && document.activeElement !== track) hideTip(); });
  const release = (e) => {
    if (!scrubbing) return; scrubbing = false; const k = beatAt(trackX(e)); field.goto(k); drawTrack(field.timeline());
    if (e.pointerType === "touch") setTimeout(() => { if (!scrubbing && document.activeElement !== track) hideTip(); }, 1200);
  };
  track.addEventListener("pointerup", release);
  track.addEventListener("pointercancel", () => { scrubbing = false; drawTrack(field.timeline()); hideTip(); });
  track.addEventListener("focus", () => showTip(field.beat()));
  track.addEventListener("blur", hideTip);
  track.addEventListener("keydown", (e) => {
    const keys = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1 };
    if (e.key in keys) stepTo(keys[e.key]);
    else if (e.key === "Home") field.goto(0);
    else if (e.key === "End") { let k = count() - 1; while (k > 0 && current?.beats[k - 1]?.segment === current?.beats[k]?.segment) k--; field.goto(k); }
    else return;
    e.preventDefault();
  });
  $("#cfg-prev").addEventListener("click", () => stepTo(-1));
  $("#cfg-next").addEventListener("click", () => stepTo(1));

  // Pause: Knopf in der Leiste und die ganze Bühne (vierzehnte Fassung), beide zeigen denselben Zustand
  const hit = $("#cfg-hit"), flash = $("#cfg-flash");
  const setPlay = (paused) => {
    play.setAttribute("aria-label", paused ? message('showConfigurator.playThePreview') : message('showconfigurator.pauseThePreview2')); play.dataset.paused = String(paused);
    hit.setAttribute("aria-pressed", String(paused));
  };
  const togglePause = () => { field.setPaused(!field.paused()); setPlay(field.paused()); };
  play.addEventListener("click", togglePause);
  hit.addEventListener("click", () => {
    togglePause();
    // a short sign in the middle of the stage, what the click did (like YouTube)
    flash.dataset.state = field.paused() ? "pause" : "play";
    flash.classList.remove("is-on"); void flash.offsetWidth; flash.classList.add("is-on");
  });
  // Runde 25b (Marc, 08.11.2026, zum Testen): der schnelle Knopf wird mit jedem weiteren Klick schneller, 2× → 4× → 6× →
  // 8× → 10× und wieder 2×. Die Show-Uhr deckelt nur die echte Zeit je Bild (0,1 s), das Tempo selbst nicht.
  const FAST = [2, 4, 6, 8, 10];
  form.closest(".cfg").querySelectorAll("[data-rate]").forEach((b) => b.addEventListener("click", () => {
    let r = Number(b.dataset.rate);
    if (r >= 2) {
      const was = b.getAttribute("aria-pressed") === "true" ? Number(b.dataset.current || 2) : 0;
      r = was ? FAST[(FAST.indexOf(was) + 1) % FAST.length] : 2;
      b.dataset.current = String(r); b.textContent = `${r}×`;
    }
    field.setRate(r);
    b.parentElement.querySelectorAll("[data-rate]").forEach((o) => {
      o.setAttribute("aria-pressed", String(o === b));
      if (o !== b && Number(o.dataset.rate) >= 2) { o.dataset.current = "2"; o.textContent = "2×"; } // zurück auf 2×, sobald ein anderes Tempo gewählt ist
    });
  }));

  // ---------- Auswahl: Anlass, Paket, Drohnenzahl, Text, Logo ----------
  const eur = (v) => startingPrice(v,locale);
  // Anlass-Pills (Radio-Gruppe, Runde 22): mit dem Monat des Besuchs ordnen (der Build kennt nur seinen eigenen) und den
  // ersten wählen. Runde 23: Dieses Modul lädt erst nach (whenNear). Was jemand vorher schon angeklickt hat (Anlass, Paket,
  // Regler), weicht vom Ausgangswert des HTML ab (checked ≠ defaultChecked) und hat Vorrang vor dem Startzustand.
  const occGroup = $("#cfg-occasion"), ordered = bySeason(OCCASIONS);
  occGroup.replaceChildren(...ordered.map((o) => occGroup.querySelector(`label[data-occasion="${o.id}"]`)).filter(Boolean), occGroup.querySelector('label[data-occasion="logo"]'));
  const occRadio = (id) => occGroup.querySelector(`input[value="${id}"]`);
  const occValue = () => occGroup.querySelector("input:checked")?.value;
  const chosenEarly = (inputs) => [...inputs].find((i) => i.checked && !i.defaultChecked);
  const earlyOccasion = OCCASIONS.find((o) => o.id === chosenEarly(occGroup.querySelectorAll("input"))?.value);
  occRadio((earlyOccasion ?? ordered[0]).id).checked = true;
  let occasion = earlyOccasion ?? ordered[0], job = 0, text = "", style = "script", tour = false;
  let logo = null, logoId = 0, logoURL = null;
  // Runde 27: Logo-Modus. logoMode: die Bühne zeigt Logos (Kundenlogos, bis ein eigenes da ist); lm: logo-mode.js, erst bei
  // Bedarf geladen; session: der Konverter für das eigene Logo (logo-v10); logoVer zählt Änderungen an Reglern/Entfernungen
  let logoMode = false, lm = null, session = null, logoVer = 0, lastLogoPts = null, editor = null, overClosed = false, minimapURL = null;
  const logoModule = () => (lm ??= import("./logo-mode.js"));
  const slider = $("#cfg-drones");
  const earlyPkg = chosenEarly(form.querySelectorAll("[name=pkg]"));
  let drones = earlyPkg && slider.value === slider.defaultValue ? DRONE_RANGES[STEPS[+earlyPkg.value].pkg].min : Number(slider.value);
  // the visitor's own text joins the show as its finale (round 11); one version per package like every motif
  const CAPTIONS = { SPARK: message('showConfigurator.yourTextInTheSky'), HORIZON: message('showConfigurator.lightWritesYourText'), ODYSSEY: message('showconfigurator.yourText') };
  const textMotif = (s) => ({ id: `text-${s}`, label: message('showconfigurator.yourText'), tiers: Object.fromEntries(Object.entries(CAPTIONS).map(([k, caption]) => [k, { build: `text${k}`, caption, value: text, style: s, occasion: occasion.id }])) });
  const motifs = () => (text ? [...occasion.motifs, textMotif(style)] : occasion.motifs);
  const STYLE_LABEL = { script: message('showconfigurator.handwriting'), print: message('showconfigurator.printLettering'), initials: message('showconfigurator.initials') };
  const isText = (seg) => seg === occasion.motifs.length || seg >= TOUR_SEGMENT;
  // ---------- Runde 24: Drohnenbedarf des eigenen Textes (wie im FlyingStars-Katalog) ----------
  // Zehn Drohnen je Zeichen, Leerzeichen zählen nicht (chars() in text-formation.js), auf Zehner gerundet, mindestens der
  // Einstieg des Reglers. Das ist die Vorab-Regel des Katalogs, keine Lesbarkeitsgarantie: Die Schrift selbst plant mit
  // genau den gewählten Drohnen und wechselt ab 30 je Zeichen zum Umriss. Obergrenze: das Feld nimmt 24 Zeichen, das
  // sind höchstens 240 Drohnen und damit immer im Regler (bis 600); ein unbegrenzter Regler entsteht so nie.
  const PER_CHAR = 10, textInput = $("#cfg-text"), budget = $("#cfg-text-budget");
  const textNeed = (value) => (value ? Math.max(DRONES_MIN, Math.ceil((chars(value) * PER_CHAR) / 10) * 10) : 0);
  let textNote = ""; // "raised": die Zahl wurde für den Text angehoben; "holds": ein Absenken unter den Bedarf wurde gehalten
  function drawBudget() {
    if (!budget) return;
    const used = chars(text), max = Math.min(Number(textInput.maxLength) || 24, Math.floor(drones / PER_CHAR));
    budget.hidden = !text;
    if (!text) { budget.textContent = ""; return; }
    const line = message('showConfigurator.textBudget', { used, max, drones });
    const note = textNote === "raised" ? message('showConfigurator.textRaised', { used, need: textNeed(text) }) : textNote === "holds" ? message('showConfigurator.textHolds', { need: textNeed(text) }) : "";
    budget.textContent = note ? `${line} · ${note}` : line;
  }
  /** The text style the stage shows is marked in the picker (Text-Durchlauf), without changing the chosen one. */
  const showStyle = (s) => { const r = form.querySelector(`[name=textstyle][value="${s}"]`); if (r && !r.checked) r.checked = true; };

  const pricedDrones = () => logoMode && lastLogoPts?.length ? lastLogoPts.length : drones;
  const pkgName = () => packageForDrones(pricedDrones());
  const step = () => STEPS.find((s) => s.pkg === pkgName());
  const pkg = () => SHOW_PACKAGES[pkgName()];
  // same spacing between drones: the picture's area grows with the drone count up to ODYSSEY's 300, above that the
  // picture keeps the stage's size and gets denser
  const size = () => logoMode ? 1 : Math.min(1, Math.sqrt(drones / SHOW_PACKAGES.ODYSSEY.base));
  const cache = new Map();
  const memo = (key, make) => {
    if (cache.size > 60) cache.clear();
    if (!cache.has(key)) cache.set(key, make().catch((error) => { cache.delete(key); throw error; }));
    return cache.get(key);
  };
  /** Points of the uploaded logo for n drones (logo-v10, Kontur; Farben schon für den Nachthimmel aufgehellt). Braucht das
   * Logo mehr als n Drohnen, steht es mit seiner eigenen Zahl da, und der Hinweis im Logo-Modus sagt es ehrlich. */
  const darkReserve = (lit, n) => Array.from({ length: Math.max(0, n - lit.length) }, (_, i) => { const q = lit[(i * 7) % lit.length]; return [q[0], q[1], -0.45 - 0.04 * (i % 3), 0, 0, 0]; });
  // Only an explicit choice in the logo occasion changes the recommendation anchor.
  // Applying the recommendation or changing the show package must never feed back into it.
  const LOGO_ANCHOR_MAX = 200;
  let logoWanted = null, sessionAnchor = null;
  const logoAnchor = () => Math.max(DRONES_MIN, Math.min(logoWanted ?? drones, LOGO_ANCHOR_MAX));
  const recommendation = (source) => memo(`logo-recommendation|${logoId}|${logoAnchor()}|${logoVer}`, () => logoPoints(source, logoAnchor()));
  const logoPoints = async (source, n) => {
    const mod = await logoModule();
    if (source !== logo) throw new Error("stopped");
    if (session && sessionAnchor !== null && sessionAnchor !== n) {
      const removed = session.removed, options = session.options;
      session.dispose(); session = mod.logoSession(source.file, options); session.setRemoved(removed);
    }
    session ??= mod.logoSession(source.file, logoOptions());
    sessionAnchor = n;
    const activeSession = session, version = logoVer;
    // Old prepared files omit the density. Use the worker so the slider can report the real value.
    let pts;
    if (source.example && detailAuto.getAttribute("aria-pressed") === "true" && !session.removed.length) {
      const prepared = await mod.exampleFormation(source.example, n).catch(() => null);
      if (Number.isFinite(prepared?.meta?.density)) pts = prepared;
    }
    pts ??= await activeSession.formation(n);
    if (!pts.length) throw new Error("leer");
    if (source === logo && activeSession === session && version === logoVer) {
      form.dataset.logoState = "ready";
      lastLogoPts = pts; $("#cfg-logo-status").textContent = "";
      if (detailAuto.getAttribute("aria-pressed") === "true") {
        const used = pts.meta?.density ?? pts.meta?.auto?.density;
        if (Number.isFinite(used)) {
          detail.value = String(DENSITIES.reduce((best, d, i) => Math.abs(d - used) < Math.abs(DENSITIES[best] - used) ? i : best, 0));
          detail.dataset.usedDensity = String(used);
        }
      }
      editor ??= mod.stageEditor({ canvas: $("#cfg-pick"), band: $("#cfg-edit-band"), bar: $("#cfg-edit-bar"), text: $("#cfg-edit-text"), remove: $("#cfg-edit-remove"), restore: $("#cfg-edit-restore"), clear: $("#cfg-edit-clear"), all: $("#cfg-edit-all") }, {
        screenOf: field.screenOf, t: message,
        onChange: (list) => { if (!session) return; session.setRemoved(list); logoVer++; showCloud(); update(true, LOGO_SEGMENT, { cloud: true }); },
      });
      editor.show(pts, session.removed); drawLogoMode();
      showOver(pts, logoWanted ?? drones);
    }
    // Die Empfehlung zählt ausschließlich leuchtende Punkte; Reserven gehören nur zur Show.
    const lit = pts.map((p) => [p.x, -p.y, 0, ...p.c]);
    return lit;
  };
  // Strict show conversions have their own lifetime; they cannot replace the editor/recommendation session.
  const showLogoPoints = async (source, n) => {
    const recommended = await recommendation(source);
    if (source !== logo) throw new Error("stopped");
    if (n >= recommended.length) return [...recommended, ...darkReserve(recommended, n)];
    const mod = await logoModule(), options = logoOptions();
    let density = lastLogoPts?.meta?.density ?? densityOf(+detail.value);
    const strict = mod.logoSession(source.file, { ...options, flex: "strict", hardMax: n, density: undefined });
    strict.setRemoved(session.removed);
    try {
      for (let attempt = 0; attempt < 8; attempt++) {
        const pts = await strict.formation(n);
        if (pts.length && pts.length <= n && (pts.meta?.density ?? density) <= density) {
          const lit = pts.map(p => [p.x, -p.y, 0, ...p.c]);
          return [...lit, ...darkReserve(lit, n)];
        }
        density = Math.max(0.03, density * Math.min(0.8, n / Math.max(1, pts.length) * 0.9));
        strict.setOptions({ density });
      }
      throw new Error("Logo passt nicht in das strenge Show-Budget");
    } finally { strict.dispose(); }
  };
  /** Runde 27 (Marc 12.11., dritte Runde, wie im lokalen Prototyp): Im Anlass „Euer Logo“ ist die große Zahl der Bedarf
   * („N Drohnen werden benötigt“, rot über der gewünschten Zahl); der Regler ist die gewünschte Drohnenanzahl. Der Hinweis
   * steht als Karte unten auf der Bühne. */
  function drawCount(pts) {
    const own = logoMode && !!logo, box = $("#cfg-logo-count");
    $("#cfg-drones-label").textContent = message(logoMode ? 'logoMode.wanted' : 'configuratorteaser.drones');
    box.hidden = !own || !pts;
    $("#cfg-logo-marker").hidden = !own || !pts;
    if (!own || !pts) return;
    $("#cfg-logo-n").textContent = String(pts.length);
    // Runde 27, vierte Runde: Zahl und Bedarfspunkt in der Farbe des Pakets, das diese Zahl braucht (über dem Regler: Koralle);
    // der gewünschte Griff und seine Zahl treten blass zurück
    const lo = +slider.min, hi = +slider.max, need = pts.length;
    const color = need > hi ? "var(--logo-coral)" : `rgb(${SHOW_PACKAGES[packageForDrones(need)].color.join(",")})`;
    form.closest(".cfg").style.setProperty("--logo-need", color);
    $("#cfg-logo-marker").style.setProperty("--need-p", String(Math.max(0, Math.min(1, (need - lo) / (hi - lo)))));
    drawPrice();
  }
  function showOver(pts, n) {
    const over = pts.length > n, card = $("#cfg-over-card");
    drawCount(pts);
    card.hidden = !(logoMode && over) || overClosed;
    if (!over) return;
    const [lead, tail] = message('logoMode.over', { wanted: "\u0000", n }).split("\u0000"), b = document.createElement("b");
    b.textContent = String(pts.length);
    $("#cfg-over-text").replaceChildren(lead ?? "", b, tail ?? "");
  }
  /** Lebendige Wolke als eigenes Bild, sofort beim Hochladen und solange gerechnet wird (keine Rechenzeit nötig). */
  // Runde 27, vierte Runde (Marc: „zu predictable“): eine verzerrte Uhr gibt Tempowechsel (mal fast still, mal schnell),
  // Breite, Höhe, Lage und Drehung der Wolke wandern unregelmäßig, ab und zu ballt sie sich in drei lose Haufen und löst
  // sich wieder; jede Drohne hat ihre eigene Phase, jede siebte schweift weiter aus. Nichts davon ergibt ein Motiv.
  const stillQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const CLUMPS = [[-0.42, -0.12], [0.36, 0.2], [0.18, -0.3]];
  const cloudLive = (p, j, t, o) => {
    if (stillQuery.matches) return;
    const w = t * 0.75 + 1.5 * Math.sin(t * 0.21) + 0.8 * Math.sin(t * 0.47 + 2.1);
    const sx = 1 + 0.18 * Math.sin(t * 0.17 + 0.6) + 0.07 * Math.sin(t * 0.41);
    const sy = 1 + 0.25 * Math.sin(t * 0.23 + 2.4) + 0.1 * Math.sin(t * 0.53 + 1);
    const rot = 0.4 * Math.sin(t * 0.11 + 0.5) * Math.sin(t * 0.07 + 1.2), c = Math.cos(rot), s = Math.sin(rot);
    const gather = Math.max(0, Math.sin(t * 0.09 + 2.2)) ** 4 * 0.55, [kx, ky] = CLUMPS[j % 3];
    const amp = j % 7 === 0 ? 0.12 : 0.05, x = p[0] * sx, y = p[1] * sy;
    const ox = x * c - y * s + 0.12 * Math.sin(t * 0.13 + 1.3) + amp * Math.sin(w * 1.1 + j * 1.31) + 0.03 * Math.sin(w * 2.3 + j * 0.37);
    const oy = x * s + y * c + 0.08 * Math.sin(t * 0.19 + 4) + amp * 0.8 * Math.cos(w * 0.9 + j * 2.17);
    o[0] = ox + (kx + 0.35 * p[0] - ox) * gather; o[1] = oy + (ky + 0.35 * p[1] - oy) * gather;
    o[2] = p[2] + 0.12 * Math.sin(w * 0.6 + j * 0.73);
    o[3] = 0.5 + 0.45 * Math.sin(w * 1.3 + j * 0.9) ** 2;
  };
  function showCloud() {
    if (logoMode) { field.setPaused(false); setPlay(false); }
    const pts = Array.from({ length: drones }, (_, i) => { const a = i * 2.39996, r = Math.sqrt((i + 0.5) / drones); return [Math.cos(a) * r * 0.95, Math.sin(a) * r * 0.55, Math.sin(i * 1.7) * 0.25, 210, 220, 255]; });
    field.show({ beats: [{ pts, caption: message('logoMode.computing'), motif: "cloud", hold: 600, cloud: true, segment: LOGO_SEGMENT, live: cloudLive }], loopTo: 0 }, drones, size(), { cloud: true });
  }
  /** Runde 27, vierte Runde (Marc: „Logo zentriert und ein ganzes Stück größer“): im Logo-Anlass so groß, wie die Bühne
   * erlaubt — bis 88 % ihrer Breite oder 80 % ihrer Höhe (die Abbildung von show-field.js: Halbbreite 1,15, Halbhöhe 0,75,
   * Maßstab S = min(0,36 W, 0,6 H bzw. 0,38 H unter 600 px)). */
  const logoZoom = (pts) => {
    const r = $(".cfg-stage").getBoundingClientRect(), W = r.width, H = r.height;
    if (!pts.length || !W || !H) return 1;
    let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
    for (const p of pts) { x0 = Math.min(x0, p[0]); x1 = Math.max(x1, p[0]); y0 = Math.min(y0, p[1]); y1 = Math.max(y1, p[1]); }
    const hw = (x1 - x0) / 2 || 1e-6, hh = (y1 - y0) / 2 || 1e-6, k = 1 / Math.max(hw / 1.15, hh / 0.75);
    const S = Math.min(W * 0.36, H * (W < 600 ? 0.38 : 0.6));
    return Math.max(0.6, Math.min(0.44 * W / (hw * k * S), 0.4 * H / (hh * k * S), 1.6));
  };
  /** Ein Logo als Bild der Show (Lichtlauf, dunkle Reserve wie bei composeShow). */
  const logoBeat = (pts, caption, segment, hold = TEMPO.logoHold) => {
    const b = { pts, caption, motif: caption, hold, cloud: true, segment, logo: true, run: true, runLight: TEMPO.logoRun };
    if (logoMode) { b.fitPts = pts.filter((p) => p[3] + p[4] + p[5] > 0); b.zoom = logoZoom(b.fitPts); }
    if (pts.length > drones) b.drones = pts.length; // über der Zahl: die Lichter so groß wie bei einer Show dieser Größe
    const dark = pts.findIndex((p) => p[3] + p[4] + p[5] === 0);
    if (dark >= 0) b.live = (_, j, t, o) => { if (j >= dark) o[3] = 0; };
    return b;
  };
  /** Logo-Modus: das eigene Logo allein, sonst die Kundenlogos, die in diese Drohnenzahl passen. */
  async function logoShow() {
    if (logo) {
      const pts = await recommendation(logo);
      return { beats: [logoBeat(pts, message('showConfigurator.yourLogo'), LOGO_SEGMENT, 30)], loopTo: 0 };
    }
    const mod = await logoModule(), list = await mod.customerLogos(drones);
    if (!list.length) return null;
    return { beats: list.map((x, i) => { const lit = x.pts.map(([px, py]) => [px, -py, 0, 255, 255, 255]); return logoBeat([...lit, ...darkReserve(lit, drones)], x.fits ? message('logoMode.customer', { name: x.name }) : message('logoMode.customerFrom', { name: x.name, n: x.n }), i, 3.4); }), loopTo: 0 };
  }
  const logoFailed = (id) => {
    if (id !== logoId) return;
    $("#cfg-logo-status").textContent = message('showConfigurator.weCouldnTConvertThisFileAnSvgOrA');
    dropLogo();
  };
  const sequence = async () => {
    const showDrones = drones;
    if (logoMode) { const shown = await memo(`logomode|${showDrones}|${logoAnchor()}|${logoId}|${logoVer}`, () => logoShow().then((x) => x ?? Promise.reject(new Error("keine Logos")))).catch(() => null); if (shown) return shown; }
    const p = pkgName(), base = `${occasion.id}|${p}|${showDrones}`, id = logoId, src = logo, withTour = tour && text;
    const main = memo(`main|${base}|${text}|${style}`, () => buildSequence(motifs(), p, showDrones, pkg().color, occasion.id));
    const tourSeq = withTour ? memo(`tour|${base}|${text}`, () => buildSequence(TOUR_STYLES.map(textMotif), p, showDrones, pkg().color, occasion.id)) : null;
    const logoPts = src ? memo(`logo-show|${id}|${showDrones}|${logoAnchor()}|${logoVer}`, () => showLogoPoints(src, showDrones)).catch((error) => { console.warn("Logo konnte nicht umgerechnet werden", error); if (id === logoId) $("#cfg-logo-status").textContent = message('showConfigurator.weCouldnTConvertThisFileAnSvgOrA'); return null; }) : null;
    return memo(`show|${base}|${text}|${style}|${withTour}|${src ? id + "." + logoVer + "." + logoAnchor() : 0}`, async () => composeShow({
      logoCaption: src && showDrones < (await recommendation(src)).length ? message('logoMode.simplified', { n: showDrones }) : message('showConfigurator.yourLogo'),
      main: await main, tour: await tourSeq, logo: await logoPts, textStyle: text ? style : null, textSegment: occasion.motifs.length,
      tourCaption: (caption, s) => message('configurator.captionStyle', { caption, style: STYLE_LABEL[s] }),
    }));
  };

  /** keep: stay on the motif on stage (package or drone switch); otherwise start the occasion's show from its first
   * picture (the logo, if there is one). to: a segment to land on. cloud: reach it through the living cloud. */
  async function render(keep, to, { cloud = false } = {}) {
    if (unlockTo !== null) { to = unlockTo; cloud = true; unlockTo = null; fresh = []; } // a motif unlocked while the slider still moved
    const id = ++job, at = to ?? (keep ? segment : null);
    $("#cfg-new").textContent = pkgName();
    try {
      const built = await sequence();
      if (id !== job) return;
      $("#cfg-error").hidden = true;
      current = built;
      // the picture to land on: that segment; a motif this package does not have → the next one it has (round the
      // loop); a text picture of the run-through that is gone → the text finale; otherwise the start of the round
      const land = (test) => built.beats.findIndex((b) => test(b.segment ?? 0) && !b.interlude);
      let k = at === null ? -1 : land((s) => s === at);
      if (k < 0 && at !== null && at >= TOUR_SEGMENT) k = land((s) => s === occasion.motifs.length);
      if (k < 0 && at !== null && at >= 0 && at < TOUR_SEGMENT) k = land((s) => s > at && s < TOUR_SEGMENT);
      if (k < 0) k = built.loopTo;
      // the first picture of the page stands already, like a show that is already in the sky
      if (logoMode) { field.setPaused(false); setPlay(false); }
      field.show(built, drones, size(), { instant: first, at: k, cloud: logo?.example ? false : cloud }); // Beispiele: sofort fliegen, ohne Wolke, aber mit Übergang
      first = false;
      drawTrack(field.timeline());
      if (document.activeElement === track) showTip(field.beat());
    } catch {
      if (id === job) $("#cfg-error").hidden = false;
    }
  }

  let building = 0;
  function drawPrice() {
    const s = step(), p = pkg(), price = configuratorPrice(pricedDrones());
    document.documentElement.style.setProperty("--pkg", `rgb(${p.color.join(",")})`);
    const radio = form.querySelector(`[name=pkg][value="${STEPS.indexOf(s)}"]`);
    if (!radio.checked) radio.checked = true;
    const displayedDrones = logoMode ? (logoWanted ?? drones) : drones;
    if (Number(slider.value) !== displayedDrones) slider.value = String(displayedDrones);
    slider.setAttribute("aria-valuetext", message('showConfigurator.valueDronesValue', { v0: displayedDrones, v1: s.pkg }));
    for (const [sel, txt] of [["#cfg-pkg", s.pkg], ["#cfg-bar-pkg", s.pkg], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)], ["#cfg-dronecount", String(displayedDrones)]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = message('showConfigurator.valueExcludingVatAndTravel', { v0: message('packageDetails.showtimeLine',durationValues()) }); // Drohnenzahl steht am Regler (Runde 9), Showzeit für alle Pakete gleich (Runde 18)
    const summary = [
      message('showConfigurator.occasionValue', { v0: occasion.label }),
      message('configurator.motifs', { list: occasion.motifs.filter((m) => canPlay(m, s.pkg, drones)).map((m) => m.label).join(', ') }),
      ...(text ? [message('showConfigurator.customTextValueValue', { v0: text, v1: STYLE_LABEL[style] })] : []),
      ...(logo ? [message('showConfigurator.customLogoTriedInThePreview')] : []),
      message('showConfigurator.complexityValueValueValueDronesValueExcludingVatConfiguratorPrice', { v0: s.label, v1: s.pkg, v2: drones, v3: eur(price) }),
    ].join("\n");
    const inquiry = inquiryHref({paket:s.pkg,drohnen:pricedDrones(),anlass:occasion.anlass,show:summary},locale,'/#anfrage');
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;
    drawLocks();
    drawBudget();
  }
  function update(keep, to, { delay = 0, cloud = false } = {}) {
    drawPrice();
    // while the slider moves, the picture follows once it rests for a moment (every drone count is its own formation)
    clearTimeout(building);
    if (delay) building = setTimeout(() => render(keep, to, { cloud }), delay); else render(keep, to, { cloud });
  }

  // ---------- Freischalten (dreizehnte, erweitert in der vierzehnten Fassung) ----------
  const toast = $("#cfg-toast");
  let toastTimer = 0;
  /** A short note on the stage; it fades by itself and is read out once (role=status). Fünfzehnte Fassung: the names of
   * the motifs stand apart (in the FlyingStars gradient), the text read out stays the same sentence. */
  function showToast(note) {
    clearTimeout(toastTimer);
    const cut = note.indexOf(": "), lead = document.createElement("span"), names = document.createElement("b");
    lead.textContent = cut < 0 ? "" : note.slice(0, cut + 2); names.textContent = cut < 0 ? note : note.slice(cut + 2);
    toast.replaceChildren(lead, names);
    toast.classList.remove("is-on"); void toast.offsetWidth; toast.classList.add("is-on");
    toastTimer = setTimeout(() => { toast.classList.remove("is-on"); toastTimer = setTimeout(() => { toast.textContent = ""; }, 700); }, 3400);
  }
  let unlockTo = null; // the stage goes there with the next picture build, even if the slider moves on meanwhile
  let fresh = []; // motifs unlocked since the stage last went to one, in the occasion's order

  /** A new drone count (slider, package button, link). Crossing a package's range switches the package. Motifs that
   * play now and did not before (a threshold crossed, or a package that has more of them; only when the count grows)
   * are announced together, and the stage flies through the cloud to the first of them; otherwise it stays on its
   * motif, or goes back to the logo if there is one (Marc: „Bei neuer Drohnenzahl zurück zum Logo“). */
  // Sechzehnte Fassung: Mit der Freischalt-Leiter schaltet jeder Klick von SPARK 100 auf HORIZON ein Motiv frei. Ein
  // Paketknopf (fly: false) meldet es, bleibt aber beim Motiv auf der Bühne (der Vergleich „dasselbe Motiv, größeres
  // Paket“); Regler und gesperrte Lichtpunkte fliegen wie bisher zum neuen Motiv.
  function setDrones(n, { delay = 0, fly = true } = {}) {
    const before = { pkg: pkgName(), drones }, need = textNeed(text), previousAnchor = logoAnchor();
    // mit eigenem Text nie unter seinen Bedarf (Regler, Paketknopf, Link); der Hinweis am Text sagt, warum
    if (need && n < need) { textNote = "holds"; n = need; } else if (snapDrones(n) !== drones) textNote = ""; // dieselbe Zahl (change nach input) behält den Hinweis
    drones = snapDrones(n);
    if (logoMode) {
      logoWanted = drones;
      if (previousAnchor !== logoAnchor()) logoVer++;
    }
    else if (logo && drones < (lastLogoPts?.length ?? 0)) showCloud();
    // only more drones unlock: going down to a smaller package can bring back its simpler versions, that is no news
    const after = { pkg: pkgName(), drones }, now = after.drones > before.drones ? freshMotifs(occasion.motifs, before, after) : [];
    fresh = occasion.motifs.filter((m) => (fresh.includes(m) || now.includes(m)) && canPlay(m, after.pkg, after.drones));
    if (now.length && !logoMode) showToast(unlockNote(fresh)); // im Anlass „Euer Logo“ gibt es keine Motive
    if (!fly) fresh = [];
    unlockTo = fresh.length ? occasion.motifs.indexOf(fresh[0]) : null;
    update(true, logo && !fresh.length ? LOGO_SEGMENT : undefined, { delay });
  }

  // only the untouched first view of the page appears already formed; a choice made before it loaded plays normally
  for (const type of ["input", "click"]) form.addEventListener(type, () => { first = false; }, { capture: true });
  form.addEventListener("submit", (e) => e.preventDefault());
  // a package button sets the package's entry count (its price on the button and the package cards)
  form.querySelectorAll("[name=pkg]").forEach((r) => r.addEventListener("change", () => setDrones(DRONE_RANGES[STEPS[+r.value].pkg].min, { fly: false })));
  slider.addEventListener("input", () => setDrones(Number(slider.value), { delay: 180 }));
  slider.addEventListener("change", () => setDrones(Number(slider.value)));
  // a new occasion is reached through the living cloud (Marc: „beim Wechsel des Anlasses immer“)
  occGroup.addEventListener("change", () => {
    // Runde 27: „Euer Logo“ ist der Logo-Modus; der Anlass davor bleibt für Zusammenfassung und Rückweg
    if (occValue() === "logo") { logoMode = true; drawLogoMode(); void logoModule(); fresh = []; unlockTo = null; update(false, logo ? LOGO_SEGMENT : undefined, { cloud: true }); return; }
    const next = OCCASIONS.find((o) => o.id === occValue()), was = logoMode;
    logoMode = false; drawLogoMode();
    if (!next || (next === occasion && !was)) return;
    occasion = next; tour = false; fresh = []; unlockTo = null;
    update(false, undefined, { cloud: true });
  });
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, preloadScenes, { once: true });
  // deep links (?anlass=hochzeit&paket=ODYSSEY&drohnen=400&motiv=lotus): open the configurator on a motif, e.g. to send it on
  const params = new URLSearchParams(location.search), linked = OCCASIONS.find((o) => o.id === params.get("anlass"));
  if (linked) { occasion = linked; occRadio(linked.id).checked = true; }
  const linkedPkg = STEPS.find((x) => x.pkg === params.get("paket")?.toUpperCase())?.pkg;
  if (linkedPkg) drones = DRONE_RANGES[linkedPkg].min;
  if (params.get("drohnen")) drones = snapDrones(Number(params.get("drohnen")) || drones);
  if (linkedPkg) drones = clampToPackage(linkedPkg, drones);
  const linkedMotif = occasion.motifs.findIndex((m) => m.id === params.get("motiv"));
  if (linkedMotif >= 0) first = false; // a linked motif plays from its first act
  // a link to a motif that needs more drones opens it with enough drones (dreizehnte Fassung)
  const need = linkedMotif >= 0 ? minDronesOf(occasion.motifs[linkedMotif].tiers[pkgName()]) : 0;
  if (need && drones < need) drones = snapDrones(need);

  // ---------- Eigener Text: einmal durch alle drei Schriften, dann weiter mit den Motiven ----------
  let typing = 0;
  const styles = $("#cfg-styles");
  const showText = () => {
    const next = textInput.value.trim();
    if (next === text) return;
    const was = segment;
    text = next; styles.hidden = !text; tour = Boolean(text);
    // Runde 24: braucht der Text mehr Drohnen als gewählt, steigt die Drohnenzahl (und damit Paket und Preis) sichtbar mit
    const need = textNeed(text);
    textNote = need > drones ? "raised" : "";
    if (need > drones) { drones = snapDrones(need); fresh = []; unlockTo = null; }
    update(true, text ? TOUR_SEGMENT : isText(was) ? (logo ? LOGO_SEGMENT : 0) : was);
  };
  textInput.addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(showText, 450); });
  textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(typing); showText(); } });
  // choosing a style ends the run-through: the stage shows the text finale in that style. click, not change: the style
  // marked because it is on stage (or the chosen one) shows the finale too (arrow keys in the group fire click as well)
  form.querySelectorAll("[name=textstyle]").forEach((r) => r.addEventListener("click", () => { style = r.value; tour = false; update(true, occasion.motifs.length); }));

  // ---------- Hinweis zum Logo als Tooltip (Runde 9: „ein bisschen zu viel Text“) ----------
  // Klick schaltet um, Fokus und Zeigen öffnen, Esc oder Verlassen schließt (ein per Klick geöffneter Hinweis bleibt, bis
  // man woanders hinklickt oder Esc drückt)
  const info = $("#cfg-info"), legal = $("#cfg-legal");
  let pinned = false;
  // Lage: direkt unter dem Info-Zeichen, links so weit wie möglich am Zeichen, aber nie über den Rand des Blocks
  // (Bezug: .cfg-own-wrap, position: relative)
  const placeLegal = () => {
    const box = legal.offsetParent?.getBoundingClientRect(), r = info.getBoundingClientRect();
    if (!box) return;
    const x = r.left + r.width / 2 - box.left, w = legal.offsetWidth;
    const left = Math.max(0, Math.min(x - 20, box.width - w));
    legal.style.setProperty("--tip-left", `${left}px`);
    legal.style.setProperty("--tip-arrow", `${x - left}px`);
    legal.style.setProperty("--tip-top", `${r.bottom - box.top + 10}px`);
  };
  const openTip = (on) => { if (on) placeLegal(); legal.classList.toggle("is-open", on); info.setAttribute("aria-expanded", String(on)); if (!on) pinned = false; };
  info.addEventListener("click", () => { pinned = !pinned || !legal.classList.contains("is-open"); openTip(pinned); });
  info.addEventListener("focus", () => openTip(true));
  info.addEventListener("blur", () => { if (!pinned) openTip(false); });
  info.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") openTip(true); });
  info.addEventListener("pointerleave", (e) => { if (e.pointerType === "mouse" && !pinned && document.activeElement !== info) openTip(false); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && legal.classList.contains("is-open")) { openTip(false); } });
  document.addEventListener("pointerdown", (e) => { if (pinned && !info.contains(e.target) && !legal.contains(e.target)) openTip(false); });

  // ---------- Eigenes Logo (vierzehnte Fassung) ----------
  const file = $("#cfg-file"), upload = $("#cfg-upload"), off = $("#cfg-logo-off");
  function dropLogo() {
    logo = null; logoId++; session?.dispose(); session = null; sessionAnchor = null; lastLogoPts = null; logoVer = 0;
    delete detail.dataset.usedDensity;
    overClosed = false; editor?.reset(); $("#cfg-over-card").hidden = true; drawCount(null);
    if (minimapURL) URL.revokeObjectURL(minimapURL); minimapURL = null; drawLogoMode();
    if (logoURL) URL.revokeObjectURL(logoURL);
    logoURL = null; off.hidden = true; upload.classList.remove("has-logo"); file.value = "";
  }
  /** Reads the file in the browser only: SVG as text, pictures as a blob URL. Nothing leaves the page. */
  function takeFile(f, example = null) {
    if (!f) return;
    const status = $("#cfg-logo-status");
    if (!/^image\/(svg\+xml|png|jpeg|webp)$/.test(f.type)) { status.textContent = message('showConfigurator.pleaseChooseAnSvgPngOrJpg'); return; }
    status.textContent = "";
    const use = (source) => {
      form.dataset.logoExample = example ?? "";
      dropLogo(); logoWanted ??= drones; logo = { ...source, example }; logoId++;
      if (source.kind === "image") logoURL = source.src;
      off.hidden = false; upload.classList.add("has-logo");
      logoMode = true; occRadio("logo").checked = true; // Runde 27: ein eigenes Logo öffnet den Anlass „Euer Logo“
      if (source.file) { minimapURL = URL.createObjectURL(source.file); $("#cfg-minimap-img").src = minimapURL; }
      drawLogoMode(); showCloud(); // sofort die lebendige Wolke, bis das Logo gerechnet ist
      first = false; fresh = []; unlockTo = null; tour = false; // the logo comes now; the text run-through is over
      update(true, LOGO_SEGMENT, { cloud: true });
    };
    if (f.type === "image/svg+xml") f.text().then((markup) => use({ kind: "svg", markup, file: f }), () => { status.textContent = message('showConfigurator.weCouldnTReadThisFile'); });
    else use({ kind: "image", src: URL.createObjectURL(f), file: f });
  }
  off.addEventListener("click", () => {
    const was = segment; dropLogo(); $("#cfg-logo-status").textContent = "";
    update(true, was === LOGO_SEGMENT ? 0 : was); upload.querySelector("input").focus();
  });
  // Fünfzehnte Fassung (Marc, Kompromiss): Beim ersten Mal, wenn die Maus über die Bühne fährt, zeigt sich die Dropzone
  // einmal als Einladung (abgedunkelt, weichgezeichnet, „Dein Logo hier reinziehen“). Sie geht, wenn die Maus die Bühne
  // verlässt, bei einem Klick (der hält die Show an) oder nach 3,5 s; danach erscheint sie nur noch beim Ziehen einer
  // Datei oder beim Zeigen auf „Logo“. Einmal je Seitenaufruf, ohne Speicher (keine Spur im Browser).
  let invited = false, inviteTimer = 0;
  const endInvite = () => { clearTimeout(inviteTimer); stage.classList.remove("is-invite"); };
  stage.addEventListener("pointerenter", (e) => {
    if (invited || e.pointerType !== "mouse" || logo) return;
    invited = true; stage.classList.add("is-invite");
    inviteTimer = setTimeout(endInvite, 3500);
  });
  stage.addEventListener("pointerdown", endInvite);
  // nach dem Ablegen oder Auswählen verschwindet die Dropzone sofort, bis die Maus die Bühne (bzw. den Knopf) verlassen hat
  const done = () => { endInvite(); stage.classList.add("is-done"); };
  stage.addEventListener("pointerleave", () => { endInvite(); stage.classList.remove("is-done"); });
  file.addEventListener("change", () => { done(); takeFile(file.files?.[0]); });
  // pointing at „Logo“ shows where a file can also be dropped: the stage steps back
  // Runde 25 (Marc: am Handy bleibt das Overlay manchmal stehen): nur mit der Maus. Ein Tippen löst auf Touch-Geräten
  // pointerenter aus, das passende pointerleave kommt nach dem Dateidialog (oder dessen Abbruch) oft nie an.
  upload.addEventListener("pointerenter", (e) => { if (e.pointerType !== "mouse") return; invited = true; stage.classList.add("is-target"); }); // the invitation is no longer needed
  upload.addEventListener("pointerleave", () => { stage.classList.remove("is-target", "is-done"); });
  // wer den Dateidialog öffnet (Tippen, Tastatur), sieht die Bühne danach ohne Overlay, auch nach Abbruch
  file.addEventListener("click", () => { stage.classList.remove("is-target", "is-invite"); });
  file.addEventListener("cancel", () => { stage.classList.remove("is-target", "is-done"); });
  window.addEventListener("focus", () => { if (!stage.matches(":hover")) stage.classList.remove("is-target"); });
  // Dateien ziehen: die Bühne (und der Knopf) nehmen sie an; überall sonst wird nichts geöffnet
  const hasFiles = (e) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
  const onTarget = (e) => stage.contains(e.target) || upload.contains(e.target);
  let dragDepth = 0;
  const endDrag = () => { dragDepth = 0; stage.classList.remove("is-page-drag", "is-drag"); };
  document.addEventListener("dragenter", (e) => { if (!hasFiles(e)) return; dragDepth++; stage.classList.add("is-page-drag"); stage.classList.toggle("is-drag", onTarget(e)); });
  document.addEventListener("dragleave", (e) => { if (!hasFiles(e)) return; dragDepth = Math.max(0, dragDepth - 1); if (!dragDepth) endDrag(); });
  document.addEventListener("dragover", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); // otherwise the browser would open the file instead of the page
    const ok = onTarget(e); e.dataTransfer.dropEffect = ok ? "copy" : "none"; stage.classList.toggle("is-drag", ok);
  });
  document.addEventListener("drop", (e) => {
    if (!hasFiles(e)) return;
    e.preventDefault(); endDrag();
    if (onTarget(e)) { done(); takeFile(e.dataTransfer.files?.[0]); }
  });

  // ---------- Runde 27: Anlass „Euer Logo“ ----------
  // Marc 12.11. (zweite Runde): im Anlass nur Drohnenzahl, Liniendichte, „Euer Text, euer Logo“ und die Preiskachel; Anlass-
  // und Paketwahl treten zurück (ein Knopf führt zurück zu den Anlässen); kein Abspielen/Anhalten, keine Motiv-Leiste; Formen
  // direkt auf der Bühne anklicken und entfernen; Minimap mit dem Original
  const tools = $("#cfg-logo-tools"), own = $("#cfg-logo-own"), detail = $("#cfg-detail"), detailAuto = $("#cfg-detail-auto"), back = $("#cfg-back"), minimap = $("#cfg-minimap");
  function drawLogoMode() {
    const mine = logoMode && !!logo;
    field.setMotionIndependent(logoMode);
    form.closest(".cfg").classList.toggle("is-logomode", logoMode);
    form.closest(".cfg").classList.toggle("has-logo", mine);
    back.hidden = !logoMode; tools.hidden = !logoMode; $("#cfg-use-logo").hidden = !mine; own.hidden = !mine; minimap.hidden = !mine || !minimapURL;
    if (logoMode) { field.setPaused(false); setPlay(false); }
    const wrap = $(".cfg-own-wrap");
    if (logoMode) {
      $(".cfg-logo-own").before($(".cfg-drones"));
    } else { form.insertBefore($(".cfg-drones"), wrap); }
    $("#cfg-hit").hidden = logoMode; // ein Klick auf die Bühne wählt Formen statt anzuhalten
    editor?.setActive(mine);
    drawCount(mine ? lastLogoPts : null);
    if (!mine) $("#cfg-over-card").hidden = true;
  }
  // Runde 27, vierte Runde: im Logo-Anlass keine Preisanfrage (der Preis gilt der ganzen Show, nicht dem Logo allein):
  // „Dieses Logo in der Show verwenden“ geht zurück zum Anlass davor, mit dem Logo und der empfohlenen Drohnenzahl
  $("#cfg-use-logo").addEventListener("click", () => {
    const need = lastLogoPts?.length ?? 0;
    if (need) { const st = +slider.step || 1; drones = snapDrones(Math.max(+slider.min, Math.min(+slider.max, Math.ceil(need / st) * st))); slider.value = String(drones); } // die Empfehlung gilt in beide Richtungen (Cupra mit 92 → SPARK)
    back.click();
  });
  back.addEventListener("click", () => { occRadio(occasion.id).checked = true; occGroup.dispatchEvent(new Event("change", { bubbles: true })); occRadio(occasion.id).focus(); });
  minimap.addEventListener("click", () => { const big = minimap.getAttribute("aria-pressed") !== "true"; minimap.setAttribute("aria-pressed", String(big)); });
  $("#cfg-over-close").addEventListener("click", () => { overClosed = true; $("#cfg-over-card").hidden = true; });
  // Beispiele: wie ein eigenes Logo (die Datei kommt aus public/media/logo-modus/beispiele/)
  let exampleRequest = 0;
  const preloadExample = id => logoModule().then(mod => mod.loadExample(id));
  for (const button of $("#cfg-examples").querySelectorAll("button")) {
    button.addEventListener("pointerenter", () => void preloadExample(button.dataset.example));
    button.addEventListener("focus", () => void preloadExample(button.dataset.example));
  }
  $("#cfg-examples").addEventListener("click", async (e) => {
    const id = e.target.closest("[data-example]")?.dataset.example; if (!id) return;
    form.dataset.logoState = "computing";
    const request = ++exampleRequest;
    try {
      const mod = await logoModule(); await mod.loadExample(id);
      const r = await fetch(`/media/logo-modus/beispiele/${id}.svg`); if (!r.ok || request !== exampleRequest) return;
      const f = new File([await r.blob()], `${id}.svg`, { type: "image/svg+xml" });
      if (request !== exampleRequest) return;
      detailAuto.setAttribute("aria-pressed", "true"); takeFile(f, id);
    } catch { $("#cfg-logo-status").textContent = message('showConfigurator.weCouldnTReadThisFile'); }
  });
  /** Regler wie im Prototyp: Liniendichte (Automatisch oder von Hand), Budget-Flexibilität, Was zeigen. Gelten auch für das
   * nächste Logo. */
  // Runde 27, vierte Runde (Marc): unten drei Risikostufen, oben fünf Stufen mehr Detail für komplexe Wappen
  const DENSITIES = [0.07, 0.1, 0.12, 0.15, 0.24, 0.33, 0.42, 0.51, 0.6, 0.69, 0.78, 0.87, 0.96, 1.05, 1.3, 1.6, 2, 2.5, 3], RISKY = 2;
  const densityOf = (v) => DENSITIES[v];
  const logoOptions = () => ({ flex: "auto", part: "auto", ...(detailAuto.getAttribute("aria-pressed") === "true" ? {} : { density: densityOf(+detail.value) }) });
  function setLogoOptions() {
    if (!session) return;
    session.setOptions({ density: undefined, ...logoOptions() });
    logoVer++; showCloud(); update(true, LOGO_SEGMENT, { cloud: true });
  }
  // die untersten drei Stufen sind der Risikobereich (rot auf der Spur); der kurze Hinweis steht nur, solange der Griff dort ist
  const drawRisk = () => { $("#cfg-density-risk").hidden = detailAuto.getAttribute("aria-pressed") === "true" || +detail.value > RISKY; };
  detail.addEventListener("input", () => { detailAuto.setAttribute("aria-pressed", "false"); drawRisk(); });
  detail.addEventListener("change", () => { detailAuto.setAttribute("aria-pressed", "false"); drawRisk(); setLogoOptions(); });
  detailAuto.addEventListener("click", () => { const on = detailAuto.getAttribute("aria-pressed") !== "true"; detailAuto.setAttribute("aria-pressed", String(on)); drawRisk(); setLogoOptions(); });

  // on phones the stage sticks on top and the price bar at the bottom: a focused field is scrolled between them
  // (scroll-margin in the CSS does it in Chromium; WebKit ignores it when focusing)
  const bar = $(".cfg-bar");
  form.addEventListener("focusin", (e) => {
    if (innerWidth > 1000) return;
    // after the browser's own focus scroll (WebKit scrolls a little later than the focus event)
    setTimeout(() => {
      const r = e.target.getBoundingClientRect(), top = stage.getBoundingClientRect().bottom + 12, bottom = (bar?.getBoundingClientRect().top ?? innerHeight) - 12;
      if (r.bottom > bottom) scrollBy({ top: r.bottom - bottom }); else if (r.top < top) scrollBy({ top: r.top - top });
    }, 120);
  });

  // eingebettet (Preisseite): die Preisleiste auf dem Handy erscheint nur, solange der Konfigurator im Bild ist
  const section = form.closest(".cfg");
  new IntersectionObserver(([entry]) => section.classList.toggle("is-near", entry.isIntersecting), { rootMargin: "0px 0px -20% 0px" }).observe(section);

  setPlay(false);
  update(false, linkedMotif >= 0 ? linkedMotif : undefined);
}
