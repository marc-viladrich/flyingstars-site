import {registerCanvas} from './canvas-runtime.mjs';
import {colorVar, rgbOf} from '../lib/color-tokens.mjs';
import {inlinePlain} from '../lib/inline-text.mjs';
// Show configurator prototype v9: Anlass picks a sequence of three motifs that plays like a little show, three package
// buttons pick the package. Switching the package turns the motif on stage into its version for that package (2D
// picture with gentle motion → 3D object that moves on its own → a short story in acts) and plays on from there, so
// the same subject shows what the higher package adds. ‹ › step through the pictures, ↻ starts the show again.
import {makeSteps} from "../content/show-configurator.js";
import {priceFor as calculatePrice} from "../content/show-packages";
import { createField } from "./show-field.js";
import { buildSequence, preloadScenes } from "./show-scenes.js";

import {readRuntime} from '../lib/ui-runtime.mjs';
import {localeFormat} from '../lib/localized-routes.mjs';
registerCanvas("canvas#cfg-field", (canvas, life, saved) => {
  const form = life.scope.querySelector("#cfg");
  const {packages:SHOW_PACKAGES,occasions:OCCASIONS,t,locale,home}=readRuntime('.cfg[data-runtime]');
  const STEPS=makeSteps(SHOW_PACKAGES),fmt=localeFormat(locale),priceFor=(name,n)=>calculatePrice(name,n,SHOW_PACKAGES);
  const $ = (s) => document.querySelector(s);
  let current = null, first = true, segment = 0;
  const field = createField(canvas, { lifecycle: life, onBeat: (k, beat, beats) => {
    $("#cfg-scene").textContent = beat.caption;
    $("#cfg-acts").hidden = beats < 2;
    segment = beat.segment ?? 0;
  } });
  life.listen($("#cfg-replay"), "click", () => field.replay());
  // the pictures loop: after the last one comes the first again, and back the other way
  const count = () => current?.beats.length ?? 1;
  // manual steps skip the small interludes between SPARK motifs: one click, one picture
  const stepTo = (dir) => { let k = field.beat(); do k = (k + dir + count()) % count(); while (current?.beats[k]?.interlude && k !== field.beat()); field.goto(k); };
  life.listen($("#cfg-prev"), "click", () => stepTo(-1));
  life.listen($("#cfg-next"), "click", () => stepTo(1));
  const eur = (v) => t("result.fromPrice",{price:v.toLocaleString(fmt)});
  let occasion = OCCASIONS[0], job = 0, text = "", style = "script";
  // the visitor's own text joins the show as its finale (round 11); one version per package like every motif
  const CAPTIONS = {SPARK:t("preview.captionSpark"),HORIZON:t("preview.captionHorizon"),ODYSSEY:t("preview.captionOdyssey")};
  const textMotif = () => ({ id: "text", label:t("preview.ownText"), tiers: Object.fromEntries(Object.entries(CAPTIONS).map(([k, caption]) => [k, { build: `text${k}`, caption, value: text, style, occasion: occasion.id }])) });
  const motifs = () => (text ? [...occasion.motifs, textMotif()] : occasion.motifs);
  const STYLE_LABEL = {script:t("textStyles.script"),print:t("textStyles.print"),initials:t("textStyles.initials")};

  const step = () => STEPS[+form.querySelector("[name=pkg]:checked").value];
  const pkg = () => SHOW_PACKAGES[step().pkg];
  // same spacing between drones: the picture's area grows with the drone count, its width with the square root
  const size = () => Math.sqrt(pkg().base / SHOW_PACKAGES.ODYSSEY.base);
  const cache = new Map();
  const sequence = () => {
    const key = `${occasion.id}|${step().pkg}|${text}|${style}`;
    if (cache.size > 40) cache.clear();
    if (!cache.has(key)) cache.set(key, buildSequence(motifs(), step().pkg, pkg().base, rgbOf(pkg().color), occasion.id).catch((error) => { cache.delete(key); throw error; }));
    return cache.get(key);
  };

  /** keep: stay on the motif on stage (package switch); otherwise start the occasion's show from its first motif. */
  async function render(keep, to) {
    const id = ++job, at = to ?? (keep ? segment : 0);
    $("#cfg-new").textContent = inlinePlain(pkg().displayName);
    try {
      const built = await sequence();
      if (life.signal.aborted || id !== job) return;
      $("#cfg-error").hidden = true;
      current = built;
      // the first picture of the page stands already, like a show that is already in the sky
      // the motif on stage; if this package does not have it, the next motif that it has (round the loop)
      const land = (test) => built.beats.findIndex((b) => test(b) && !b.interlude);
      const k = [land((b) => b.segment === at), land((b) => b.segment > at), land(() => true)].find((q) => q >= 0) ?? 0;
      field.show(built, pkg().base, size(), { instant: first, at: k });
      first = false;
    } catch {
      if (!life.signal.aborted && id === job) $("#cfg-error").hidden = false;
    }
  }

  function update(keep, to) {
    const s = step(), p = pkg(), price = priceFor(s.pkg, p.base);
    const editorResult=document.querySelector(".cfg-result[data-afe]");if(editorResult){const marker=JSON.parse(editorResult.dataset.afe);marker.address.owner.id=s.pkg.toLowerCase();editorResult.dataset.afe=JSON.stringify(marker);}
    document.documentElement.style.setProperty("--pkg", colorVar(p.color));
    for (const [sel, txt] of [["#cfg-pkg", inlinePlain(p.displayName)], ["#cfg-bar-pkg", inlinePlain(p.displayName)], ["#cfg-price", eur(price)], ["#cfg-bar-price", eur(price)]]) $(sel).textContent = txt;
    $("#cfg-meta").textContent = t("result.meta",{count:p.base.toLocaleString(fmt),duration:p.dur});
    $("#cfg-includes").textContent = t("result.includes",{text:s.includes});
    const summary = [t("summary.occasion",{occasion:occasion.label}),t("summary.motifs",{motifs:occasion.motifs.filter(m=>m.tiers[s.pkg]).map(m=>m.label).join(', ')}),...(text?[t("summary.text",{text,style:STYLE_LABEL[style]})]:[]),t("summary.effort",{effort:s.label,name:inlinePlain(p.displayName),price:eur(price)})].join('\n');
    const inquiry = `${home}?${new URLSearchParams({ paket: s.pkg, drohnen: String(p.base), anlass: occasion.anlass, show: summary })}#anfrage`;
    $("#cfg-cta").href = inquiry; $("#cfg-bar-cta").href = inquiry;
    return render(keep, to);
  }

  // only the untouched first view of the page appears already formed; a choice made before it loaded plays normally
  for (const type of ["input", "click"]) life.listen(form, type, () => { first = false; }, { capture: true });
  life.listen(form, "submit", (e) => e.preventDefault());
  form.querySelectorAll("[name=pkg]").forEach((r) => life.listen(r, "change", () => update(true)));
  form.querySelectorAll("[name=occasion]").forEach((r) => life.listen(r, "change", () => { occasion = OCCASIONS.find((o) => o.id === r.value); update(false); }));
  for (const type of ["pointerdown", "focusin"]) life.listen(form, type, preloadScenes, { once: true });
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
  life.listen(textInput, "input", () => { clearTimeout(typing); typing = setTimeout(showText, 450); });
  life.listen(textInput, "keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); clearTimeout(typing); showText(); } });
  form.querySelectorAll("[name=textstyle]").forEach((r) => life.listen(r, "change", () => { style = r.value; update(true, occasion.motifs.length); }));
  // A private editor rebuild preserves visitor choices; they never become CMS content.
  const controller = {
      snapshot: () => ({ occasion: occasion.id, pkg: step().pkg, text: textInput.value, style, segment, beat: field.beat() }),
      async restore(saved) {
        const targetOccasion = OCCASIONS.find(o => o.id === saved?.occasion);
        const targetPackage = STEPS.findIndex(s => s.pkg === saved?.pkg);
        if (!targetOccasion || targetPackage < 0) return;
        clearTimeout(typing);
        occasion = targetOccasion;
        form.querySelector(`[name=occasion][value="${occasion.id}"]`).checked = true;
        form.querySelector(`[name=pkg][value="${targetPackage}"]`).checked = true;
        textInput.value = typeof saved.text === 'string' ? saved.text.slice(0, 120) : '';
        text = textInput.value.trim();
        style = ['script', 'print', 'initials'].includes(saved.style) ? saved.style : 'script';
        form.querySelector(`[name=textstyle][value="${style}"]`).checked = true;
        styles.hidden = !text; $("#cfg-text-note").hidden = !text;
        first = true;
        await update(true, Number.isInteger(saved.segment) ? saved.segment : 0);
        if (life.signal.aborted) return;
        if (Number.isInteger(saved.beat) && current?.beats[saved.beat]) field.goto(saved.beat);
      }
  };
  if (document.querySelector('.cfg-result[data-afe]')) window.flyingstarsConfigurator = controller;
  life.preserve(() => controller.snapshot());
  life.cleanup(() => { clearTimeout(typing); ++job; });
  if (saved) controller.restore(saved);
  else update(false, Math.max(0, linkedMotif));
}, { scope: ".cfg[data-runtime]" });
