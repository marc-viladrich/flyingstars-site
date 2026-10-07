// Show configurator prototype v5: Anlass offers two motifs, Aufwand picks the package. Moving the slider turns the
// chosen motif into its version for that package (still 2D picture → one 3D object that moves on its own → a short
// story in acts), so the same subject shows what the higher package adds. Every change plays once; HORIZON and
// ODYSSEY keep moving afterwards, the story can be replayed.
import { OCCASIONS, STEPS } from "../content/show-configurator.js";
import { SHOW_PACKAGES, priceFor } from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildScene, preloadScenes } from "./show-scenes.js";

const form = document.querySelector("#cfg");
if (form) {
  const $ = (s) => document.querySelector(s);
  const stepIn = $("#cfg-step"), tabs = $("#cfg-motifs");
  // the caption follows the acts of an ODYSSEY story: "1/3 Amors Pfeil"
  const field = createField($("#cfg-field"), { onBeat: (k, beat) => {
    const beats = current?.beats.length ?? 1;
    $("#cfg-scene").textContent = beats > 1 ? `${k + 1}/${beats} · ${beat.caption}` : beat.caption;
    $("#cfg-replay").hidden = !(beats > 1 && k === beats - 1);
  } });
  let current = null, first = true;
  $("#cfg-replay").addEventListener("click", () => field.replay());
  const eur = (v) => `ab ${v.toLocaleString("de-DE")} €`;
  let occasion = OCCASIONS[0], motifIndex = 0, job = 0;

  const step = () => STEPS[+stepIn.value];
  const pkg = () => SHOW_PACKAGES[step().pkg];
  const motif = () => occasion.motifs[motifIndex];
  // same spacing between drones: the picture's area grows with the drone count, its width with the square root
  const size = () => Math.sqrt(pkg().base / SHOW_PACKAGES.ODYSSEY.base);
  const cache = new Map();
  const pictures = (version) => {
    const key = `${version.build}|${pkg().base}`;
    if (!cache.has(key)) cache.set(key, buildScene(version, pkg().base).catch((error) => { cache.delete(key); throw error; }));
    return cache.get(key);
  };

  async function render() {
    const id = ++job, version = motif().tiers[step().pkg];
    $("#cfg-scene").textContent = version.caption;
    $("#cfg-new").textContent = step().pkg;
    tabs.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-pressed", String(k === motifIndex)));
    try {
      const built = await pictures(version);
      // the first picture of the page stands already, like a show that is already in the sky
      if (id === job) { current = built; field.show(built, pkg().base, size(), { instant: first }); first = false; }
    } catch {
      if (id === job) $("#cfg-scene").textContent = `${version.caption} (Vorschau gerade nicht verfügbar)`;
    }
  }

  function renderTabs() {
    tabs.innerHTML = "";
    occasion.motifs.forEach((m, k) => {
      const b = document.createElement("button");
      b.type = "button"; b.dataset.motif = String(k); b.textContent = m.label; b.setAttribute("aria-pressed", String(k === motifIndex));
      b.addEventListener("click", () => { motifIndex = k; update(); });
      tabs.append(b);
    });
  }

  function update() {
    const s = step(), p = pkg(), price = priceFor(s.pkg, p.base);
    stepIn.style.setProperty("--fill", `calc(13px + ${(+stepIn.value / (STEPS.length - 1)).toFixed(4)} * (100% - 26px))`);
    stepIn.setAttribute("aria-valuetext", `${s.label}, ${s.pkg}, ${eur(price)}`);
    document.documentElement.style.setProperty("--pkg", `rgb(${p.color.join(",")})`);
    $("#cfg-step-label").textContent = s.label;
    form.querySelectorAll("[data-stop]").forEach((el) => el.classList.toggle("on", +el.dataset.stop === +stepIn.value));
    for (const [sel, txt] of [["#cfg-pkg", s.pkg], ["#cfg-bar-pkg", s.pkg], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)], ["#cfg-count", `${p.base} Drohnen`]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = `${p.base} Drohnen · ${p.dur} · netto zzgl. Anfahrt`;
    $("#cfg-includes").textContent = `Enthalten: ${s.includes}.`;
    const summary = [`Anlass: ${occasion.label}`, `Beispielmotiv: ${motif().label} – ${motif().tiers[s.pkg].caption}`, `Aufwand: ${s.label} (${s.pkg}, ${eur(price)} netto, Einstiegspreis laut Konfigurator)`].join("\n");
    const inquiry = `/?${new URLSearchParams({ paket: s.pkg, drohnen: String(p.base), anlass: occasion.anlass, show: summary })}#anfrage`;
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;
    render();
  }

  // only the untouched first view of the page appears already formed; a choice made before it loaded plays normally
  for (const type of ["input", "click"]) form.addEventListener(type, () => { first = false; }, { capture: true });
  form.addEventListener("submit", (e) => e.preventDefault());
  stepIn.addEventListener("input", update);
  form.querySelectorAll("[name=occasion]").forEach((r) => r.addEventListener("change", () => { occasion = OCCASIONS.find((o) => o.id === r.value); motifIndex = 0; renderTabs(); update(); }));
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, preloadScenes, { once: true });
  renderTabs();
  update();
}
