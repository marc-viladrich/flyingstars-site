// Show configurator prototype: every answer updates the package, the reasons and the drone field at once.
import { ADVENTURES, AUDIENCE, COMPLEXITY, MUSIC, MOTIF_RANGE, configure } from "../content/show-configurator";
import { SHOW_PACKAGES } from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildScene, preloadScenes } from "./show-scenes.js";

const form = document.querySelector("#cfg");
if (form) {
  const $ = (s) => document.querySelector(s);
  const tierIn = $("#cfg-tier"), motifIn = $("#cfg-motifs"), audienceIn = $("#cfg-audience"), textIn = $("#cfg-text");
  const storyIn = $("#cfg-story"), filmIn = $("#cfg-film"), play = $("#cfg-play");
  const field = createField($("#cfg-field"));
  const eur = (v) => `ab ${v.toLocaleString("de-DE")} €`;
  let adventure = ADVENTURES[0], result = null, current = null, job = 0, playing = 0;

  const choice = () => ({
    adventure, tier: +tierIn.value, motifs: +motifIn.value, audience: +audienceIn.value,
    music: form.querySelector("[name=music]:checked").value, story: storyIn.checked, film: filmIn.checked,
    text: textIn.value.replace(/\s+/g, " ").trim(),
  });

  function applyPreset() {
    const p = adventure.preset;
    tierIn.value = p.tier; motifIn.value = p.motifs; audienceIn.value = p.audience;
    form.querySelector(`[name=music][value=${p.music}]`).checked = true;
    storyIn.checked = p.story; filmIn.checked = p.film;
    const editable = adventure.scenes.find((s) => s.editable);
    $("#cfg-text-label").firstChild.textContent = `${adventure.textLabel} `;
    textIn.value = ""; textIn.placeholder = editable ? `z. B. ${editable.text}` : "";
  }

  /** The motif to look at after a change: the most complex one, or the one with the visitor's text. */
  const keyScene = (scenes) => scenes.reduce((a, b) => (b.tier > a.tier ? b : a), scenes[0]);

  async function render(scene) {
    const id = ++job;
    current = scene;
    const own = choice().text;
    $("#cfg-scene").textContent = scene.editable && own ? `${scene.label}: ${own.toUpperCase()}` : scene.label;
    const pictures = await buildScene(scene, result.drones, choice().text);
    if (id === job) field.show(pictures, result.drones);
  }

  // coloured part of a slider track ends under the thumb (same as the price calculator)
  const fill = (input) => input.style.setProperty("--fill", `calc(13px + ${((input.value - input.min) / (input.max - input.min)).toFixed(4)} * (100% - 26px))`);

  function update(focus) {
    stopPlay();
    const c = choice();
    result = configure(c);
    const available = adventure.scenes.filter((s) => s.tier <= c.tier).length;
    motifIn.max = String(Math.max(MOTIF_RANGE.min, Math.min(MOTIF_RANGE.max, available)));
    if (+motifIn.value > +motifIn.max) motifIn.value = motifIn.max;
    [tierIn, motifIn, audienceIn].forEach(fill);
    const tier = COMPLEXITY[c.tier];
    $("#cfg-tier-label").textContent = tier.label;
    tierIn.setAttribute("aria-valuetext", `${tier.label}: ${tier.example}`);
    $("#cfg-motifs-label").textContent = String(result.scenes.length);
    motifIn.setAttribute("aria-valuetext", `${result.scenes.length} Motive`);
    const aud = AUDIENCE[c.audience];
    $("#cfg-audience-label").textContent = aud.label;
    audienceIn.setAttribute("aria-valuetext", `${aud.label} Zuschauer*innen, ${aud.hint}`);

    const pkg = SHOW_PACKAGES[result.package];
    document.documentElement.style.setProperty("--pkg", `rgb(${pkg.color.join(",")})`);
    for (const [sel, txt] of [["#cfg-result-pkg", result.package], ["#cfg-bar-pkg", result.package], ["#cfg-result-price", eur(result.total)], ["#cfg-bar-price", eur(result.total)]]) $(sel).textContent = txt;
    // one sentence for the deciding reason; the full list stays behind "Warum dieses Paket?"
    const because = result.reasons.filter((r) => r.decisive && r.because).map((r) => r.because).slice(0, 2);
    $("#cfg-why").textContent = because.length ? `${result.package}, weil ${because.join(" und ")}.` : "Alles steckt im Einstiegspaket.";
    $("#cfg-result-meta").textContent = `${result.drones.toLocaleString("de-DE")} Drohnen · ${pkg.dur} · netto zzgl. Anfahrt${result.film ? " · inkl. Filmaufnahmen" : ""}`;
    $("#cfg-reasons").innerHTML = "";
    for (const r of result.reasons) {
      const li = document.createElement("li"); li.classList.toggle("decisive", Boolean(r.decisive));
      const t = document.createElement("span"); t.textContent = r.text; li.append(t);
      if (r.package) { const p = document.createElement("span"); p.className = "mono"; p.textContent = `ab ${r.package}`; li.append(p); }
      $("#cfg-reasons").append(li);
    }

    // the inquiry carries the show so the team sees what the visitor put together
    const summary = [`Show: ${adventure.label}`, `Motive: ${result.scenes.map((s) => (s.editable && c.text ? c.text.toUpperCase() : s.label)).join(" → ")}`, `Musik: ${MUSIC[c.music].label}`, `Publikum: ${aud.label}`, c.story ? "Erzählte Geschichte" : "", c.film ? "Filmaufnahmen" : ""].filter(Boolean).join("\n");
    const inquiry = `/?${new URLSearchParams({ paket: result.package, drohnen: String(result.drones), anlass: adventure.anlass, show: summary })}#anfrage`;
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;

    const editable = result.scenes.find((s) => s.editable);
    const next = focus === "text" && editable ? editable : focus === "keep" && current && result.scenes.some((s) => s.id === current.id) ? current : keyScene(result.scenes);
    render(next);
  }

  // "Show abspielen": the motifs one after the other, then back to the key motif
  function stopPlay() { clearTimeout(playing); playing = 0; play.textContent = "▶ Show abspielen"; }
  play.addEventListener("click", () => {
    if (playing) { stopPlay(); return; }
    const scenes = result.scenes; let i = 0;
    play.textContent = "■ Anhalten";
    const step = () => {
      if (i >= scenes.length) { stopPlay(); render(keyScene(scenes)); return; }
      const scene = scenes[i++]; render(scene);
      playing = setTimeout(step, scene.kind === "verwandlung" ? 4200 : 2800);
    };
    step();
  });

  form.addEventListener("submit", (e) => e.preventDefault());
  form.querySelectorAll("[name=adventure]").forEach((r) => r.addEventListener("change", () => { adventure = ADVENTURES.find((a) => a.id === r.value); applyPreset(); update(); }));
  tierIn.addEventListener("input", () => update());
  motifIn.addEventListener("input", () => update("keep"));
  audienceIn.addEventListener("input", () => update("keep"));
  form.querySelectorAll("[name=music]").forEach((r) => r.addEventListener("change", () => update("keep")));
  storyIn.addEventListener("change", () => update("keep"));
  filmIn.addEventListener("change", () => update("keep"));
  let typing = 0;
  textIn.addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(() => update("text"), 250); });

  // heart data (≈ 137 KB gzip) and the 3D figure load on the first interaction, not for every visitor
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, preloadScenes, { once: true });

  applyPreset();
  update();
}
