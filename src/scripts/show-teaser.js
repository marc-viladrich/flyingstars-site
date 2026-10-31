// Startseiten-Teaser des Show-Konfigurators (sechzehnte Fassung, Marc 31.10.2026: „mit einer minimal interaktiven
// Version des Konfigurators schon einen Vorgeschmack geben, warum dieser Konfigurator überhaupt interessant ist“).
// Dieselbe Engine (show-field.js) und dieselben Motive wie der Konfigurator, aber nur zwei Bedienungen: Anlass und
// Drohnenzahl. Mehr Drohnen schalten Motive frei (Freischalt-Leiter, content/show-configurator.js); die Meldung ist
// dieselbe wie im Konfigurator, die Bühne fliegt durch die lebendige Wolke zum neuen Motiv. Paket und Preis folgen der
// Drohnenzahl. Der Knopf „Show selbst zusammenstellen“ übergibt Anlass, Drohnenzahl und das Motiv auf der Bühne.
// Geladen wird dieses Modul erst, wenn der Block in die Nähe des Viewports kommt (ConfiguratorTeaser.astro). Außerhalb
// des Viewports, bei globaler Pause (html.motion-paused) und bei reduzierter Bewegung zeichnet die Engine nicht weiter
// und zeigt das Motiv in Ruhe.
import { OCCASIONS, unlockAt } from "../content/show-configurator.js";
import { SHOW_PACKAGES, packageForDrones, snapDrones, configuratorPrice } from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildSequence, preloadScenes } from "./show-scenes.js";
import { freshMotifs, unlockNote, canPlay } from "./show-tempo.js";

const eur = (v) => `ab ${v.toLocaleString("de-DE")} €`;

/** Startet den Teaser in root (ein Element mit data-cft-root). Gibt eine Funktion zum Aufräumen zurück. */
export function initTeaser(root) {
  if (root.dataset.cftReady) return () => {};
  root.dataset.cftReady = "true";
  const q = (name) => root.querySelector(`[data-cft="${name}"]`);
  const slider = q("drones"), count = q("count"), pkgOut = q("pkg"), priceOut = q("price"), scene = q("scene"), list = q("motifs"), cta = q("cta"), toast = q("toast");
  const href = cta.getAttribute("href").split(/[?#]/)[0];
  let occasion = OCCASIONS.find((o) => o.id === root.querySelector("[name$=-occasion]:checked")?.value) ?? OCCASIONS[0];
  let drones = snapDrones(Number(slider.value)), segment = 0, job = 0, first = true, unlockTo = null, building = 0, fresh = [];
  const field = createField(q("field"), { onBeat: (k, beat) => { segment = beat.segment ?? 0; scene.textContent = beat.caption ?? ""; link(); } });
  const pkgName = () => packageForDrones(drones);
  const size = () => Math.min(1, Math.sqrt(drones / SHOW_PACKAGES.ODYSSEY.base));
  const cache = new Map();
  const sequence = () => {
    const key = `${occasion.id}|${pkgName()}|${drones}`;
    if (cache.size > 30) cache.clear();
    if (!cache.has(key)) cache.set(key, buildSequence(occasion.motifs, pkgName(), drones, SHOW_PACKAGES[pkgName()].color, occasion.id).catch((e) => { cache.delete(key); throw e; }));
    return cache.get(key);
  };

  /** Anfrage-Link in den vollen Konfigurator: Anlass, Drohnenzahl und das Motiv, das gerade auf der Bühne steht. */
  function link() {
    const m = occasion.motifs[segment];
    const params = new URLSearchParams({ anlass: occasion.id, drohnen: String(drones), ...(m ? { motiv: m.id } : {}) });
    cta.href = `${href}?${params}#konfigurator`;
  }

  /** Motive des Anlasses: die gespielten hell, die gesperrten leise mit ihrer Schwelle („ab 250“). */
  function drawMotifs() {
    const p = pkgName();
    list.replaceChildren(...occasion.motifs.map((m) => {
      const li = document.createElement("li"), on = canPlay(m, p, drones), at = on ? null : unlockAt(m, drones);
      li.className = on ? "is-on" : "";
      li.textContent = m.label;
      if (at) { const s = document.createElement("small"); s.textContent = ` ab ${at}`; li.append(s); }
      return li;
    }));
  }

  function showToast(note) {
    clearTimeout(showToast.timer);
    const cut = note.indexOf(": "), lead = document.createElement("span"), names = document.createElement("b");
    lead.textContent = cut < 0 ? "" : note.slice(0, cut + 2); names.textContent = cut < 0 ? note : note.slice(cut + 2);
    toast.replaceChildren(lead, names);
    toast.classList.remove("is-on"); void toast.offsetWidth; toast.classList.add("is-on");
    showToast.timer = setTimeout(() => { toast.classList.remove("is-on"); showToast.timer = setTimeout(() => { toast.textContent = ""; }, 700); }, 3400);
  }

  async function render(keep, { cloud = false } = {}) {
    let to = keep ? segment : null;
    if (unlockTo !== null) { to = unlockTo; cloud = true; unlockTo = null; fresh = []; } // ein Motiv, das beim Ziehen freigeschaltet wurde
    const id = ++job;
    try {
      const built = await sequence();
      if (id !== job) return;
      const land = (test) => built.beats.findIndex((b) => test(b.segment ?? 0) && !b.interlude);
      let k = to === null ? -1 : land((s) => s === to);
      if (k < 0 && to !== null) k = land((s) => s > to);
      if (k < 0) k = 0;
      field.show(built, drones, size(), { instant: first, at: k, cloud });
      first = false;
      q("error").hidden = true;
    } catch {
      if (id === job) q("error").hidden = false;
    }
  }

  function update(keep, { delay = 0, cloud = false } = {}) {
    const p = pkgName();
    root.style.setProperty("--pkg", `rgb(${SHOW_PACKAGES[p].color.join(",")})`);
    if (Number(slider.value) !== drones) slider.value = String(drones);
    slider.setAttribute("aria-valuetext", `${drones} Drohnen, ${p}`);
    count.textContent = String(drones); pkgOut.textContent = p; priceOut.textContent = eur(configuratorPrice(drones));
    drawMotifs(); link();
    clearTimeout(building);
    if (delay) building = setTimeout(() => render(keep, { cloud }), delay); else render(keep, { cloud });
  }

  /** Neue Drohnenzahl: neu freigeschaltete Motive melden und zum ersten fliegen (nur, wenn es mehr Drohnen werden).
   * Während man zieht, sammelt die Meldung alle neuen Motive, bis die Bühne zum ersten davon geflogen ist. */
  function setDrones(n, opts) {
    const before = { pkg: pkgName(), drones };
    drones = snapDrones(n);
    const after = { pkg: pkgName(), drones }, now = after.drones > before.drones ? freshMotifs(occasion.motifs, before, after) : [];
    fresh = occasion.motifs.filter((m) => (fresh.includes(m) || now.includes(m)) && canPlay(m, after.pkg, after.drones));
    if (now.length) showToast(unlockNote(fresh));
    unlockTo = fresh.length ? occasion.motifs.indexOf(fresh[0]) : null;
    update(true, opts);
  }

  const onInput = () => { first = false; setDrones(Number(slider.value), { delay: 180 }); };
  const onChange = () => setDrones(Number(slider.value));
  slider.addEventListener("input", onInput);
  slider.addEventListener("change", onChange);
  const radios = [...root.querySelectorAll("[name$=-occasion]")];
  const onOccasion = (e) => { first = false; occasion = OCCASIONS.find((o) => o.id === e.target.value) ?? occasion; fresh = []; unlockTo = null; segment = 0; update(false, { cloud: true }); };
  radios.forEach((r) => r.addEventListener("change", onOccasion));
  root.addEventListener("pointerdown", preloadScenes, { once: true });
  root.addEventListener("focusin", preloadScenes, { once: true });

  update(false);
  return () => {
    slider.removeEventListener("input", onInput); slider.removeEventListener("change", onChange);
    radios.forEach((r) => r.removeEventListener("change", onOccasion));
  };
}
