// Show configurator prototype v9: Anlass picks a sequence of three motifs that plays like a little show, three package
// buttons pick the package. Switching the package turns the motif on stage into its version for that package (2D
// picture with gentle motion → 3D object that moves on its own → a short story in acts) and plays on from there, so
// the same subject shows what the higher package adds. ‹ › step through the pictures, ↻ starts the show again.
import { OCCASIONS, STEPS } from "../content/show-configurator.js";
import { SHOW_PACKAGES, priceFor } from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildSequence, preloadScenes } from "./show-scenes.js";

const form = document.querySelector("#cfg");
if (form) {
  const $ = (s) => document.querySelector(s);
  let current = null, first = true, segment = 0;
  const field = createField($("#cfg-field"), { onBeat: (k, beat, beats) => {
    $("#cfg-scene").textContent = beat.caption;
    $("#cfg-acts").hidden = beats < 2;
    segment = beat.segment ?? 0;
  } });
  $("#cfg-replay").addEventListener("click", () => field.replay());
  // the pictures loop: after the last one comes the first again, and back the other way
  const count = () => current?.beats.length ?? 1;
  $("#cfg-prev").addEventListener("click", () => field.goto((field.beat() - 1 + count()) % count()));
  $("#cfg-next").addEventListener("click", () => field.goto((field.beat() + 1) % count()));
  const eur = (v) => `ab ${v.toLocaleString("de-DE")} €`;
  let occasion = OCCASIONS[0], job = 0;

  const step = () => STEPS[+form.querySelector("[name=pkg]:checked").value];
  const pkg = () => SHOW_PACKAGES[step().pkg];
  // same spacing between drones: the picture's area grows with the drone count, its width with the square root
  const size = () => Math.sqrt(pkg().base / SHOW_PACKAGES.ODYSSEY.base);
  const cache = new Map();
  const sequence = () => {
    const key = `${occasion.id}|${step().pkg}`;
    if (!cache.has(key)) cache.set(key, buildSequence(occasion.motifs, step().pkg, pkg().base, pkg().color).catch((error) => { cache.delete(key); throw error; }));
    return cache.get(key);
  };

  /** keep: stay on the motif on stage (package switch); otherwise start the occasion's show from its first motif. */
  async function render(keep) {
    const id = ++job, at = keep ? segment : 0;
    $("#cfg-new").textContent = step().pkg;
    try {
      const built = await sequence();
      if (id !== job) return;
      current = built;
      // the first picture of the page stands already, like a show that is already in the sky
      field.show(built, pkg().base, size(), { instant: first, at: Math.max(0, built.beats.findIndex((b) => b.segment === at)) });
      first = false;
    } catch {
      if (id === job) $("#cfg-scene").textContent = `${occasion.motifs[at].tiers[step().pkg].caption} (Vorschau gerade nicht verfügbar)`;
    }
  }

  function update(keep) {
    const s = step(), p = pkg(), price = priceFor(s.pkg, p.base);
    document.documentElement.style.setProperty("--pkg", `rgb(${p.color.join(",")})`);
    for (const [sel, txt] of [["#cfg-pkg", s.pkg], ["#cfg-bar-pkg", s.pkg], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)], ["#cfg-count", `${p.base} Drohnen`]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = `${p.base} Drohnen · ${p.dur} · netto zzgl. Anfahrt`;
    $("#cfg-includes").textContent = `Enthalten: ${s.includes}.`;
    const summary = [`Anlass: ${occasion.label}`, `Beispielmotive: ${occasion.motifs.map((m) => m.label).join(", ")}`, `Aufwand: ${s.label} (${s.pkg}, ${eur(price)} netto, Einstiegspreis laut Konfigurator)`].join("\n");
    const inquiry = `/?${new URLSearchParams({ paket: s.pkg, drohnen: String(p.base), anlass: occasion.anlass, show: summary })}#anfrage`;
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;
    render(keep);
  }

  // only the untouched first view of the page appears already formed; a choice made before it loaded plays normally
  for (const type of ["input", "click"]) form.addEventListener(type, () => { first = false; }, { capture: true });
  form.addEventListener("submit", (e) => e.preventDefault());
  form.querySelectorAll("[name=pkg]").forEach((r) => r.addEventListener("change", () => update(true)));
  form.querySelectorAll("[name=occasion]").forEach((r) => r.addEventListener("change", () => { occasion = OCCASIONS.find((o) => o.id === r.value); update(false); }));
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, preloadScenes, { once: true });
  update(false);
}
