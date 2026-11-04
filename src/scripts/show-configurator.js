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
import { composeShow, canPlay, possibleFrom, minDronesOf, freshMotifs, unlockNote, LOGO_SEGMENT, TOUR_SEGMENT, TOUR_STYLES } from "./show-tempo.js";
import { formation, liftColor } from "./formation/index.js";

const form = document.querySelector("#cfg");
if (form) {
  const $ = (s) => document.querySelector(s);
  let current = null, first = true, segment = 0;
  const track = $("#cfg-track"), marks = $("#cfg-marks"), play = $("#cfg-play"), stage = $(".cfg-stage"), tip = $("#cfg-tip"), player = $("#cfg-player"), locks = $("#cfg-locks");
  let drawn = null, scrubbing = false, lastTick = 0, tipAt = null;
  const field = createField($("#cfg-field"), {
    onBeat: (k, beat) => {
      $("#cfg-scene").textContent = beat.caption;
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

  // Gesperrte Motive (sechzehnte Fassung): je Motiv, das bei dieser Drohnenzahl noch nicht spielt, ein ungeleuchteter
  // Lichtpunkt rechts neben der Spur, nach Schwelle geordnet. Zeigen oder Fokus nennt Motiv und Schwelle, ein Klick
  // stellt die Schwelle ein (die Meldung erscheint, die Bühne fliegt durch die Wolke dorthin).
  function drawLocks() {
    const list = occasion.motifs.map((m) => [m, unlockAt(m, drones)]).filter(([, at]) => at !== null).sort((a, b) => a[1] - b[1]);
    const key = `${occasion.id}:` + list.map(([m, at]) => `${m.id}@${at}`).join(",");
    if (locks.dataset.key === key) return;
    locks.dataset.key = key;
    locks.hidden = !list.length;
    locks.replaceChildren(...list.map(([m, at]) => {
      const b = document.createElement("button");
      b.type = "button"; b.className = "cfg-lock"; b.dataset.motif = m.id; b.dataset.at = String(at);
      b.setAttribute("aria-label", message('showConfigurator.valueFromValueDronesSetDroneCountToValue', { v0: m.label, v1: at, v2: at }));
      b.innerHTML = '<i aria-hidden="true"></i><i aria-hidden="true"></i><i aria-hidden="true"></i>';
      const show = () => { setTip(m.label, at); const r = b.getBoundingClientRect(); placeTip((r.left + r.right) / 2); tip.classList.add("is-on", "is-locked"); tipAt = null; };
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
  form.closest(".cfg").querySelectorAll("[data-rate]").forEach((b) => b.addEventListener("click", () => {
    field.setRate(Number(b.dataset.rate));
    b.parentElement.querySelectorAll("[data-rate]").forEach((o) => o.setAttribute("aria-pressed", String(o === b)));
  }));

  // ---------- Auswahl: Anlass, Paket, Drohnenzahl, Text, Logo ----------
  const eur = (v) => startingPrice(v,locale);
  // Anlässe mit dem Monat des Besuchs ordnen (der Build kennt nur seinen eigenen) und den ersten wählen
  const occSelect = $("#cfg-occasion"), ordered = bySeason(OCCASIONS);
  occSelect.replaceChildren(...ordered.map((o) => occSelect.querySelector(`option[value="${o.id}"]`)).filter(Boolean));
  occSelect.value = ordered[0].id;
  let occasion = ordered[0], job = 0, text = "", style = "script", tour = false;
  let logo = null, logoId = 0, logoURL = null;
  const slider = $("#cfg-drones");
  let drones = Number(slider.value);
  // the visitor's own text joins the show as its finale (round 11); one version per package like every motif
  const CAPTIONS = { SPARK: message('showConfigurator.yourTextInTheSky'), HORIZON: message('showConfigurator.lightWritesYourText'), ODYSSEY: message('showconfigurator.yourText') };
  const textMotif = (s) => ({ id: `text-${s}`, label: message('showconfigurator.yourText'), tiers: Object.fromEntries(Object.entries(CAPTIONS).map(([k, caption]) => [k, { build: `text${k}`, caption, value: text, style: s, occasion: occasion.id }])) });
  const motifs = () => (text ? [...occasion.motifs, textMotif(style)] : occasion.motifs);
  const STYLE_LABEL = { script: message('showconfigurator.handwriting'), print: message('showconfigurator.printLettering'), initials: message('showconfigurator.initials') };
  const isText = (seg) => seg === occasion.motifs.length || seg >= TOUR_SEGMENT;
  /** The text style the stage shows is marked in the picker (Text-Durchlauf), without changing the chosen one. */
  const showStyle = (s) => { const r = form.querySelector(`[name=textstyle][value="${s}"]`); if (r && !r.checked) r.checked = true; };

  const pkgName = () => packageForDrones(drones);
  const step = () => STEPS.find((s) => s.pkg === pkgName());
  const pkg = () => SHOW_PACKAGES[pkgName()];
  // same spacing between drones: the picture's area grows with the drone count up to ODYSSEY's 300, above that the
  // picture keeps the stage's size and gets denser
  const size = () => Math.min(1, Math.sqrt(drones / SHOW_PACKAGES.ODYSSEY.base));
  const cache = new Map();
  const memo = (key, make) => {
    if (cache.size > 60) cache.clear();
    if (!cache.has(key)) cache.set(key, make().catch((error) => { cache.delete(key); throw error; }));
    return cache.get(key);
  };
  /** Points of the uploaded logo for n drones, colours as in the logo (dark ones lifted so they light). */
  const logoPoints = async (source, n) => {
    const pts = await formation(source, n);
    if (!pts.length) throw new Error("leer");
    const tint = pkg().color;
    return pts.map((p) => [p.x, -p.y, 0, ...(p.c ? liftColor(p.c) : tint)]);
  };
  const logoFailed = (id) => {
    if (id !== logoId) return;
    $("#cfg-logo-status").textContent = message('showConfigurator.weCouldnTConvertThisFileAnSvgOrA');
    dropLogo();
  };
  const sequence = () => {
    const p = pkgName(), base = `${occasion.id}|${p}|${drones}`, id = logoId, src = logo, withTour = tour && text;
    const main = memo(`main|${base}|${text}|${style}`, () => buildSequence(motifs(), p, drones, pkg().color, occasion.id));
    const tourSeq = withTour ? memo(`tour|${base}|${text}`, () => buildSequence(TOUR_STYLES.map(textMotif), p, drones, pkg().color, occasion.id)) : null;
    const logoPts = src ? memo(`logo|${id}|${drones}|${p}`, () => logoPoints(src, drones)).catch(() => { logoFailed(id); return null; }) : null;
    return memo(`show|${base}|${text}|${style}|${withTour}|${src ? id : 0}`, async () => composeShow({
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
      field.show(built, drones, size(), { instant: first, at: k, cloud });
      first = false;
      drawTrack(field.timeline());
      if (document.activeElement === track) showTip(field.beat());
    } catch {
      if (id === job) $("#cfg-error").hidden = false;
    }
  }

  let building = 0;
  function update(keep, to, { delay = 0, cloud = false } = {}) {
    const s = step(), p = pkg(), price = configuratorPrice(drones);
    document.documentElement.style.setProperty("--pkg", `rgb(${p.color.join(",")})`);
    const radio = form.querySelector(`[name=pkg][value="${STEPS.indexOf(s)}"]`);
    if (!radio.checked) radio.checked = true;
    if (Number(slider.value) !== drones) slider.value = String(drones);
    slider.setAttribute("aria-valuetext", message('showConfigurator.valueDronesValue', { v0: drones, v1: s.pkg }));
    for (const [sel, txt] of [["#cfg-pkg", s.pkg], ["#cfg-bar-pkg", s.pkg], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)], ["#cfg-dronecount", String(drones)]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = message('showConfigurator.valueExcludingVatAndTravel', { v0: message('packageDetails.showtimeLine',durationValues()) }); // Drohnenzahl steht am Regler (Runde 9), Showzeit für alle Pakete gleich (Runde 18)
    const summary = [
      message('showConfigurator.occasionValue', { v0: occasion.label }),
      message('configurator.motifs', { list: occasion.motifs.filter((m) => canPlay(m, s.pkg, drones)).map((m) => m.label).join(', ') }),
      ...(text ? [message('showConfigurator.customTextValueValue', { v0: text, v1: STYLE_LABEL[style] })] : []),
      ...(logo ? [message('showConfigurator.customLogoTriedInThePreview')] : []),
      message('showConfigurator.complexityValueValueValueDronesValueExcludingVatConfiguratorPrice', { v0: s.label, v1: s.pkg, v2: drones, v3: eur(price) }),
    ].join("\n");
    const inquiry = inquiryHref({paket:s.pkg,drohnen:drones,anlass:occasion.anlass,show:summary},locale,'/#anfrage');
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;
    drawLocks();
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
    const before = { pkg: pkgName(), drones };
    drones = snapDrones(n);
    // only more drones unlock: going down to a smaller package can bring back its simpler versions, that is no news
    const after = { pkg: pkgName(), drones }, now = after.drones > before.drones ? freshMotifs(occasion.motifs, before, after) : [];
    fresh = occasion.motifs.filter((m) => (fresh.includes(m) || now.includes(m)) && canPlay(m, after.pkg, after.drones));
    if (now.length) showToast(unlockNote(fresh));
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
  occSelect.addEventListener("change", () => {
    const next = OCCASIONS.find((o) => o.id === occSelect.value);
    if (!next || next === occasion) return;
    occasion = next; tour = false; fresh = []; unlockTo = null;
    update(false, undefined, { cloud: true });
  });
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, preloadScenes, { once: true });
  // deep links (?anlass=hochzeit&paket=ODYSSEY&drohnen=400&motiv=lotus): open the configurator on a motif, e.g. to send it on
  const params = new URLSearchParams(location.search), linked = OCCASIONS.find((o) => o.id === params.get("anlass"));
  if (linked) { occasion = linked; occSelect.value = linked.id; }
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
  const textInput = $("#cfg-text"), styles = $("#cfg-styles");
  const showText = () => {
    const next = textInput.value.trim();
    if (next === text) return;
    const was = segment;
    text = next; styles.hidden = !text; tour = Boolean(text);
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
    logo = null; logoId++;
    if (logoURL) URL.revokeObjectURL(logoURL);
    logoURL = null; off.hidden = true; upload.classList.remove("has-logo"); file.value = "";
  }
  /** Reads the file in the browser only: SVG as text, pictures as a blob URL. Nothing leaves the page. */
  function takeFile(f) {
    if (!f) return;
    const status = $("#cfg-logo-status");
    if (!/^image\/(svg\+xml|png|jpeg|webp)$/.test(f.type)) { status.textContent = message('showConfigurator.pleaseChooseAnSvgPngOrJpg'); return; }
    status.textContent = "";
    const use = (source) => {
      dropLogo(); logo = source; logoId++;
      if (source.kind === "image") logoURL = source.src;
      off.hidden = false; upload.classList.add("has-logo");
      first = false; fresh = []; unlockTo = null; tour = false; // the logo comes now; the text run-through is over
      update(true, LOGO_SEGMENT, { cloud: true });
    };
    if (f.type === "image/svg+xml") f.text().then((markup) => use({ kind: "svg", markup }), () => { status.textContent = message('showConfigurator.weCouldnTReadThisFile'); });
    else use({ kind: "image", src: URL.createObjectURL(f) });
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
  upload.addEventListener("pointerenter", () => { invited = true; stage.classList.add("is-target"); }); // the invitation is no longer needed
  upload.addEventListener("pointerleave", () => { stage.classList.remove("is-target", "is-done"); });
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
