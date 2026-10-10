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
  // manual steps skip the small interludes between SPARK motifs: one click, one picture
  const stepTo = (dir) => { let k = field.beat(); do k = (k + dir + count()) % count(); while (current?.beats[k]?.interlude && k !== field.beat()); field.goto(k); };
  $("#cfg-prev").addEventListener("click", () => stepTo(-1));
  $("#cfg-next").addEventListener("click", () => stepTo(1));
  const eur = (v) => `ab ${v.toLocaleString("de-DE")} €`;
  let occasion = OCCASIONS[0], job = 0, text = "", style = "script";
  // the visitor's own text joins the show as its finale (round 11); one version per package like every motif
  const CAPTIONS = { SPARK: "Euer Text am Himmel", HORIZON: "Licht schreibt euren Text", ODYSSEY: "Euer Text" };
  const textMotif = () => ({ id: "text", label: "Euer Text", tiers: Object.fromEntries(Object.entries(CAPTIONS).map(([k, caption]) => [k, { build: `text${k}`, caption, value: text, style, occasion: occasion.id }])) });
  const motifs = () => (text ? [...occasion.motifs, textMotif()] : occasion.motifs);
  const STYLE_LABEL = { script: "Schreibschrift", print: "Druckschrift", initials: "Initialen" };

  const step = () => STEPS[+form.querySelector("[name=pkg]:checked").value];
  const pkg = () => SHOW_PACKAGES[step().pkg];
  // same spacing between drones: the picture's area grows with the drone count, its width with the square root
  const size = () => Math.sqrt(pkg().base / SHOW_PACKAGES.ODYSSEY.base);
  const cache = new Map();
  const sequence = () => {
    const key = `${occasion.id}|${step().pkg}|${text}|${style}`;
    if (cache.size > 40) cache.clear();
    if (!cache.has(key)) cache.set(key, buildSequence(motifs(), step().pkg, pkg().base, pkg().color).catch((error) => { cache.delete(key); throw error; }));
    return cache.get(key);
  };

  /** keep: stay on the motif on stage (package switch); otherwise start the occasion's show from its first motif. */
  async function render(keep, to) {
    const id = ++job, at = to ?? (keep ? segment : 0);
    $("#cfg-new").textContent = step().pkg;
    try {
      const built = await sequence();
      if (id !== job) return;
      current = built;
      // the first picture of the page stands already, like a show that is already in the sky
      field.show(built, pkg().base, size(), { instant: first, at: Math.max(0, built.beats.findIndex((b) => b.segment === at && !b.interlude)) });
      first = false;
    } catch {
      if (id === job) $("#cfg-scene").textContent = `${motifs()[at]?.tiers[step().pkg].caption ?? ""} (Vorschau gerade nicht verfügbar)`;
    }
  }

  function update(keep, to) {
    const s = step(), p = pkg(), price = priceFor(s.pkg, p.base);
    document.documentElement.style.setProperty("--pkg", `rgb(${p.color.join(",")})`);
    for (const [sel, txt] of [["#cfg-pkg", s.pkg], ["#cfg-bar-pkg", s.pkg], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)], ["#cfg-count", `${p.base} Drohnen`]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = `${p.base} Drohnen · ${p.dur} · netto zzgl. Anfahrt`;
    $("#cfg-includes").textContent = `Enthalten: ${s.includes}.`;
    const summary = [`Anlass: ${occasion.label}`, `Beispielmotive: ${occasion.motifs.map((m) => m.label).join(", ")}`, ...(text ? [`Eigener Text: „${text}“ (${STYLE_LABEL[style]})`] : []), `Aufwand: ${s.label} (${s.pkg}, ${eur(price)} netto, Einstiegspreis laut Konfigurator)`].join("\n");
    const inquiry = `/?${new URLSearchParams({ paket: s.pkg, drohnen: String(p.base), anlass: occasion.anlass, show: summary })}#anfrage`;
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;
    render(keep, to);
  }

  // only the untouched first view of the page appears already formed; a choice made before it loaded plays normally
  for (const type of ["input", "click"]) form.addEventListener(type, () => { first = false; }, { capture: true });
  form.addEventListener("submit", (e) => e.preventDefault());
  form.querySelectorAll("[name=pkg]").forEach((r) => r.addEventListener("change", () => update(true)));
  form.querySelectorAll("[name=occasion]").forEach((r) => r.addEventListener("change", () => { occasion = OCCASIONS.find((o) => o.id === r.value); update(false); }));
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, preloadScenes, { once: true });
  // deep links (?anlass=hochzeit&paket=ODYSSEY&motiv=lotus): open the configurator on a motif, e.g. to send it on
  const params = new URLSearchParams(location.search), linked = OCCASIONS.find((o) => o.id === params.get("anlass"));
  if (linked) { occasion = linked; form.querySelector(`[name=occasion][value="${linked.id}"]`).checked = true; }
  const linkedPkg = STEPS.findIndex((x) => x.pkg === params.get("paket")?.toUpperCase());
  if (linkedPkg >= 0) form.querySelector(`[name=pkg][value="${linkedPkg}"]`).checked = true;
  const linkedMotif = occasion.motifs.findIndex((m) => m.id === params.get("motiv"));
  if (linkedMotif >= 0) first = false; // a linked motif plays from its first act

  // typing shows the text right away: the stage jumps to the finale with the visitor's text
  let typing = 0;
  const textInput = $("#cfg-text"), styles = $("#cfg-styles");
  const showText = () => { text = textInput.value.trim(); styles.hidden = !text; $("#cfg-text-note").hidden = !text; update(true, text ? occasion.motifs.length : Math.min(segment, occasion.motifs.length - 1)); };
  textInput.addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(showText, 450); });
  textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(typing); showText(); } });
  form.querySelectorAll("[name=textstyle]").forEach((r) => r.addEventListener("change", () => { style = r.value; update(true, occasion.motifs.length); }));
  update(false, Math.max(0, linkedMotif));
}
