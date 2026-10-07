// Show configurator prototype v3: Anlass picks the example motifs, Aufwand picks the package. The drone field plays
// the example show of that package in a loop; after a step up it starts with what is new in that package.
import { occasions, showFor, STEPS } from "../content/show-configurator.js";
import { SHOW_PACKAGES, priceFor } from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildScene, preloadScenes } from "./show-scenes.js";

const form = document.querySelector("#cfg");
if (form) {
  const $ = (s) => document.querySelector(s);
  const list = occasions(), stepIn = $("#cfg-step"), dots = $("#cfg-dots");
  const field = createField($("#cfg-field"));
  const eur = (v) => `ab ${v.toLocaleString("de-DE")} €`;
  const held = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("motion-paused");
  let occasion = list[0], playlist = [], index = 0, timer = 0, job = 0;

  const step = () => STEPS[+stepIn.value];
  const pkg = () => SHOW_PACKAGES[step().pkg];
  // same spacing between drones: the picture's area grows with the drone count, its width with the square root
  const size = () => Math.sqrt(pkg().base / SHOW_PACKAGES.ODYSSEY.base);
  const cache = new Map();
  const pictures = (scene) => {
    const key = `${occasion.id}|${scene.id}|${pkg().base}`;
    if (!cache.has(key)) cache.set(key, buildScene(scene, pkg().base));
    return cache.get(key);
  };

  async function play(i) {
    clearTimeout(timer);
    const id = ++job, scene = playlist[i];
    index = i;
    $("#cfg-scene").textContent = scene.label;
    const isNew = scene.from === step().pkg && step().pkg !== "SPARK";
    $("#cfg-new").hidden = !isNew; $("#cfg-new").textContent = `Neu in ${step().pkg}`;
    dots.querySelectorAll("button").forEach((b, k) => b.setAttribute("aria-current", String(k === i)));
    const built = await pictures(scene);
    if (id !== job) return;
    field.show(built, pkg().base, size());
    if (held()) return; // paused or reduced motion: stay on this motif, the dots step through by hand
    const phases = built.hold || built.pictures.map(() => 1.7);
    const seconds = phases.slice(0, -1).reduce((a, b) => a + b, 0) + 3;
    // the timer belongs to this playback: a newer selection invalidates it through `job`
    timer = setTimeout(() => { if (id === job) play((i + 1) % playlist.length); }, seconds * 1000);
  }

  function update({ fromStep = false } = {}) {
    const s = step(), p = pkg(), previous = playlist;
    playlist = showFor(occasion, s.pkg);
    stepIn.style.setProperty("--fill", `calc(13px + ${(+stepIn.value / (STEPS.length - 1)).toFixed(4)} * (100% - 26px))`);
    stepIn.setAttribute("aria-valuetext", `${s.label}, ${s.pkg}, ${eur(p.price)}`);
    document.documentElement.style.setProperty("--pkg", `rgb(${p.color.join(",")})`);
    $("#cfg-step-label").textContent = s.label;
    form.querySelectorAll("[data-stop]").forEach((el) => el.classList.toggle("on", +el.dataset.stop === +stepIn.value));
    const price = priceFor(s.pkg, p.base);
    for (const [sel, txt] of [["#cfg-pkg", s.pkg], ["#cfg-bar-pkg", s.pkg], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)], ["#cfg-count", `${p.base} Drohnen`]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = `${p.base} Drohnen · ${p.dur} · netto zzgl. Anfahrt`;
    $("#cfg-includes").textContent = `Enthalten: ${s.includes}.`;

    dots.innerHTML = "";
    playlist.forEach((scene, k) => {
      const li = document.createElement("li"), b = document.createElement("button");
      b.type = "button"; b.setAttribute("aria-label", scene.label); b.title = scene.label;
      if (scene.from === s.pkg && s.pkg !== "SPARK") b.classList.add("new");
      b.addEventListener("click", () => play(k));
      li.append(b); dots.append(li);
    });

    const summary = [`Anlass: ${occasion.label}`, `Aufwand: ${s.label} (${s.pkg}, ${eur(price)} netto, Einstiegspreis laut Konfigurator)`, `Beispielmotive: ${playlist.map((sc) => sc.label).join(" → ")}`].join("\n");
    const inquiry = `/?${new URLSearchParams({ paket: s.pkg, drohnen: String(p.base), anlass: occasion.anlass, show: summary })}#anfrage`;
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;

    // after a step up, start with what the new package adds; otherwise at the start of the show
    const firstNew = playlist.findIndex((sc) => !previous.some((old) => old.id === sc.id));
    play(fromStep && firstNew >= 0 ? firstNew : 0);
  }

  form.addEventListener("submit", (e) => e.preventDefault());
  stepIn.addEventListener("input", () => update({ fromStep: true }));
  form.querySelectorAll("[name=occasion]").forEach((r) => r.addEventListener("change", () => { occasion = list.find((o) => o.id === r.value); playlist = []; update(); }));
  document.addEventListener("flyingstars:motion-change", () => play(index));
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, preloadScenes, { once: true });
  update();
}
