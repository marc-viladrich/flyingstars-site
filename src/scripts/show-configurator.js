// Live preview on the pricing page (13th version, 30 October 2026; the model is unchanged since v9): the occasion picks
// a sequence of motifs that plays like a little show, three package buttons pick the package and with it the price.
// Switching the package turns the motif on stage into its version for that package (2D picture with gentle motion →
// 3D object that moves on its own → a short story in acts) and plays on from there. ‹ › step through the pictures,
// ↻ starts the show again.
//
// Two layers: the controls (price, inquiry, deep links, package links on the cards) work at once and without the
// drone engine; the engine (show-field.js, show-scenes.js) loads when the stage comes close to the viewport. States on
// the section (data-state): idle → loading → running | paused, or error (still picture, the controls keep working).
import { OCCASIONS, STEPS } from "../content/show-configurator.js";
import { SHOW_PACKAGES, priceFor } from "../content/show-packages";
import { PACKAGE_DETAILS } from "../content/package-details";

// the visitor's own text joins the show as its finale (round 11); one version per package like every motif
const CAPTIONS = { SPARK: "Euer Text am Himmel", HORIZON: "Licht schreibt euren Text", ODYSSEY: "Euer Text" };
const STYLE_LABEL = { script: "Schreibschrift", print: "Druckschrift", initials: "Initialen" };
const eur = (v) => `ab ${v.toLocaleString("de-DE")} €`;

export function mountPreview(root = document.querySelector("[data-preview]")) {
  const form = root?.querySelector("#cfg");
  if (!form || root.dataset.mounted) return;
  root.dataset.mounted = "true";
  const $ = (s) => root.querySelector(s);
  const reduceQuery = matchMedia("(prefers-reduced-motion: reduce)");
  const stage = $(".cfg-stage");
  let field = null, scenes = null, engine = null, pending = null;
  let current = null, first = true, segment = 0, job = 0;
  let occasion = OCCASIONS[0], text = "", style = "script";

  const setState = (state) => { root.dataset.state = state; };
  const resting = () => reduceQuery.matches || document.documentElement.classList.contains("motion-paused");
  // running or paused once a picture stands; "Abspielen" only where the visitor paused (not the system setting)
  const syncMotion = () => {
    if (root.dataset.state === "running" || root.dataset.state === "paused") setState(resting() ? "paused" : "running");
    $("#cfg-play").hidden = !(document.documentElement.classList.contains("motion-paused") && !reduceQuery.matches);
  };
  document.addEventListener("flyingstars:motion-change", syncMotion);
  reduceQuery.addEventListener("change", syncMotion);
  $("#cfg-play").addEventListener("click", () => { document.querySelector("[data-motion-toggle]")?.click(); field?.replay(); });

  const onBeat = (_k, beat, beats) => {
    $("#cfg-scene").textContent = beat.caption;
    $("#cfg-acts").hidden = beats < 2;
    segment = beat.segment ?? 0;
  };
  /** Loads the drone engine once; the first picture then stands already, like a show that is already in the sky. */
  const load = () => (engine ||= (async () => {
    setState("loading");
    const [f, s] = await Promise.all([import("./show-field.js"), import("./show-scenes.js")]);
    scenes = s;
    field = f.createField($("#cfg-field"), { onBeat });
    await render(...(pending ?? [false, 0]));
  })().catch(() => { setState("error"); $("#cfg-error").hidden = false; }));

  // the pictures loop: after the last one comes the first again, and back the other way
  const count = () => current?.beats.length ?? 1;
  // manual steps skip the small interludes between SPARK motifs: one click, one picture
  const stepTo = (dir) => { if (!field) return; let k = field.beat(); do k = (k + dir + count()) % count(); while (current?.beats[k]?.interlude && k !== field.beat()); field.goto(k); };
  $("#cfg-prev").addEventListener("click", () => stepTo(-1));
  $("#cfg-next").addEventListener("click", () => stepTo(1));
  $("#cfg-replay").addEventListener("click", () => field?.replay());

  const textMotif = () => ({ id: "text", label: "Euer Text", tiers: Object.fromEntries(Object.entries(CAPTIONS).map(([k, caption]) => [k, { build: `text${k}`, caption, value: text, style, occasion: occasion.id }])) });
  const motifs = () => (text ? [...occasion.motifs, textMotif()] : occasion.motifs);
  const step = () => STEPS[+form.querySelector("[name=pkg]:checked").value];
  const pkg = () => SHOW_PACKAGES[step().pkg];
  // same spacing between drones: the picture's area grows with the drone count, its width with the square root
  const size = () => Math.sqrt(pkg().base / SHOW_PACKAGES.ODYSSEY.base);
  const cache = new Map();
  const sequence = () => {
    const key = `${occasion.id}|${step().pkg}|${text}|${style}`;
    if (cache.size > 40) cache.clear();
    if (!cache.has(key)) cache.set(key, scenes.buildSequence(motifs(), step().pkg, pkg().base, pkg().color, occasion.id).catch((error) => { cache.delete(key); throw error; }));
    return cache.get(key);
  };

  /** keep: stay on the motif on stage (package switch); otherwise start the occasion's show from its first motif. */
  async function render(keep, to) {
    if (!field) { pending = [keep, to]; return; }
    const id = ++job, at = to ?? (keep ? segment : 0);
    try {
      const built = await sequence();
      if (id !== job) return;
      $("#cfg-error").hidden = true;
      current = built;
      // the motif on stage; if this package does not have it, the next motif that it has (round the loop)
      const land = (test) => built.beats.findIndex((b) => test(b) && !b.interlude);
      const k = [land((b) => b.segment === at), land((b) => b.segment > at), land(() => true)].find((q) => q >= 0) ?? 0;
      field.show(built, pkg().base, size(), { instant: first, at: k });
      first = false;
      setState(resting() ? "paused" : "running");
      syncMotion();
    } catch {
      if (id === job) { setState("error"); $("#cfg-error").hidden = false; }
    }
  }

  function update(keep, to) {
    const s = step(), p = pkg(), price = priceFor(s.pkg, p.base), details = PACKAGE_DETAILS[s.pkg];
    root.style.setProperty("--pkg", `rgb(${p.color.join(",")})`);
    for (const [sel, txt] of [["#cfg-pkg", s.pkg], ["#cfg-bar-pkg", s.pkg], ["#cfg-new", s.pkg], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = `${p.base} Drohnen · netto zzgl. Anfahrt`;
    $("#cfg-includes").textContent = `Enthalten: ${details.sky}.`;
    const summary = [
      `Anlass: ${occasion.label}`,
      `Beispielmotive: ${occasion.motifs.filter((m) => m.tiers[s.pkg]).map((m) => m.label).join(", ")}`,
      ...(text ? [`Eigener Text: „${text}“ (${STYLE_LABEL[style]})`] : []),
      `Paket: ${s.pkg}, ${s.label} (${eur(price)} netto zzgl. Anfahrt, Einstiegspreis)`,
    ].join("\n");
    // the contact form (src/scripts/contact.ts) reads paket, drohnen, anlass and show
    const inquiry = `/kontakt/?${new URLSearchParams({ paket: s.pkg, drohnen: String(p.base), anlass: occasion.anlass, quelle: "preise-vorschau", show: summary })}`;
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;
    render(keep, to);
  }

  // only the untouched first view appears already formed; a choice made before it loaded plays normally
  for (const type of ["input", "click"]) form.addEventListener(type, () => { if (field) first = false; }, { capture: true });
  form.addEventListener("submit", (e) => e.preventDefault());
  form.querySelectorAll("[name=pkg]").forEach((r) => r.addEventListener("change", () => update(true)));
  form.querySelectorAll("[name=occasion]").forEach((r) => r.addEventListener("change", () => {
    occasion = OCCASIONS.find((o) => o.id === r.value);
    r.closest("label").scrollIntoView({ block: "nearest", inline: "nearest" }); // the tab row scrolls on phones
    update(false);
  }));
  for (const type of ["pointerdown", "focusin"]) form.addEventListener(type, () => load().then(() => scenes?.preloadScenes()), { once: true });

  // deep links (?anlass=hochzeit&paket=ODYSSEY&motiv=lotus): open the preview on a motif, e.g. to send it on
  const params = new URLSearchParams(location.search);
  const linked = OCCASIONS.find((o) => o.id === params.get("anlass"));
  if (linked) form.querySelector(`[name=occasion][value="${linked.id}"]`).checked = true;
  occasion = OCCASIONS.find((o) => o.id === form.querySelector("[name=occasion]:checked")?.value) ?? OCCASIONS[0];
  const linkedPkg = STEPS.findIndex((x) => x.pkg === params.get("paket")?.toUpperCase());
  if (linkedPkg >= 0) form.querySelector(`[name=pkg][value="${linkedPkg}"]`).checked = true;
  const linkedMotif = occasion.motifs.findIndex((m) => m.id === params.get("motiv"));
  if (linkedMotif >= 0) first = false; // a linked motif plays from its first act

  // typing shows the text right away: the stage jumps to the finale with the visitor's text
  let typing = 0;
  const textInput = $("#cfg-text"), styles = $("#cfg-styles");
  const showText = () => { text = textInput.value.trim(); styles.hidden = !text; update(true, text ? occasion.motifs.length : Math.min(segment, occasion.motifs.length - 1)); };
  textInput.addEventListener("input", () => { clearTimeout(typing); typing = setTimeout(showText, 450); });
  textInput.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(typing); showText(); } });
  form.querySelectorAll("[name=textstyle]").forEach((r) => r.addEventListener("change", () => { style = r.value; update(true, occasion.motifs.length); }));
  update(false, Math.max(0, linkedMotif));

  // calm before visibility: the engine loads shortly before the stage scrolls into view (or at once for a direct link)
  if (location.hash === `#${root.id}` || linked || linkedPkg >= 0) load();
  else new IntersectionObserver((entries, io) => { if (entries.some((e) => e.isIntersecting)) { io.disconnect(); load(); } }, { rootMargin: "320px 0px" }).observe(stage);

  // "In der Vorschau ansehen" on a package card: choose the package here, bring the stage into view, focus the choice
  document.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[data-preview-pkg]");
    if (!link || event.defaultPrevented || event.button || event.metaKey || event.ctrlKey || event.shiftKey) return;
    const k = STEPS.findIndex((x) => x.pkg === link.dataset.previewPkg), radio = form.querySelector(`[name=pkg][value="${k}"]`);
    if (!radio) return;
    event.preventDefault();
    if (field) first = false;
    if (!radio.checked) { radio.checked = true; radio.dispatchEvent(new Event("change", { bubbles: true })); }
    load();
    const frame = $(".pv-frame").getBoundingClientRect(), nav = document.querySelector("header.nav")?.offsetHeight ?? 0;
    const room = innerHeight - nav, top = scrollY + frame.top - nav - Math.max(12, (room - frame.height) / 2);
    scrollTo({ top: Math.max(0, top), behavior: reduceQuery.matches ? "instant" : "smooth" });
    radio.focus({ preventScroll: true });
  });

  // phones: package, price and "Anfragen" stay in reach while the stage is in view and the bar below it is not
  const bar = root.querySelector(".cfg-bar"), seen = { section: false, cta: false };
  const toggleBar = () => { bar.dataset.show = String(seen.section && !seen.cta); };
  // the bar's own inquiry button counts as seen only when it is fully in view
  const watch = new IntersectionObserver((entries) => {
    for (const e of entries) { if (e.target === root) seen.section = e.isIntersecting; else seen.cta = e.intersectionRatio > 0.98; }
    toggleBar();
  }, { threshold: [0, 1] });
  watch.observe(root); watch.observe($("#cfg-cta"));
}
