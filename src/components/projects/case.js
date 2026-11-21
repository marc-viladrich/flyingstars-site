import { localeFromPath, localeFormat } from '../../i18n/routing.mjs';
const formatLocale = localeFormat(localeFromPath(location.pathname));
import { t } from '../../i18n/ui.mjs';
import { mountFormation } from '../../scripts/formation-play.js';
// FlyingStars project pages: count-up numbers, scrollytelling, the real formation to play with, film reel
// Adapted from the client-supplied reference; no third-party runtime requests.
(() => {
  "use strict";
  const onView = (el, fn, opts = { threshold: 0.35 }) => { const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { fn(); io.disconnect(); } }), opts); io.observe(el); };

  // Big numbers count up as they come into view. The final value stays the element's text (screen readers, copying,
  // printing, full-page captures); the running number is decoration laid over it (aria-hidden, case.css .count-run). It is
  // drawn as generated content (::before from data-value), so a text selection only ever contains the final value.
  // Reduced motion or the page's global pause: the final value, at once, also mid-count.
  const still = () => matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("motion-paused");
  const counters = new Set();
  document.querySelectorAll("[data-count]").forEach((el) => {
    const to = +el.dataset.count, fmt = (v) => Math.round(v).toLocaleString(formatLocale);
    if (!(to > 0)) return;
    let run = null, frame = 0;
    const finish = () => { cancelAnimationFrame(frame); run?.remove(); run = null; el.classList.remove("is-counting"); counters.delete(finish); };
    onView(el, () => {
      if (still()) return;
      let final = el.querySelector(":scope > .count-final");
      if (!final) { final = document.createElement("span"); final.className = "count-final"; final.append(...el.childNodes); el.append(final); }
      run = document.createElement("span"); run.className = "count-run"; run.setAttribute("aria-hidden", "true"); run.dataset.value = fmt(0);
      el.append(run); el.classList.add("is-counting"); counters.add(finish);
      const t0 = performance.now(), dur = 1400 + Math.min(1200, to);
      const tick = (now) => {
        const u = Math.min(1, (now - t0) / dur);
        if (u >= 1 || still()) { finish(); return; }
        run.dataset.value = fmt(to * (1 - (1 - u) ** 3));
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    }, { threshold: 0 });
  });
  document.addEventListener("flyingstars:motion-change", () => { if (still()) [...counters].forEach((finish) => finish()); });

  // scrollytelling: the step in the middle of the screen picks the picture on the left
  const steps = [...document.querySelectorAll(".c-story [data-story-step]")], scenes = [...document.querySelectorAll(".c-story [data-scene]")], progress = document.querySelector(".c-story [data-progress]");
  if (steps.length) {
    const show = (i) => {
      steps.forEach((s, k) => s.classList.toggle("on", k === i));
      scenes.forEach((s, k) => s.classList.toggle("on", k === i));
      if (progress) progress.textContent = `${String(i + 1).padStart(2, "0")} / ${String(steps.length).padStart(2, "0")}`;
    };
    const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) show(steps.indexOf(e.target)); }), { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach((s) => io.observe(s));
    show(0);
  }

  // film reel: drag to scroll (Pfeile: SliderNav.astro)
  document.querySelectorAll(".c-reel").forEach((reel) => {
    const track = reel.querySelector(".c-track");
    let down = null;
    track.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; down = { x: e.clientX, left: track.scrollLeft }; track.classList.add("drag"); track.setPointerCapture(e.pointerId); });
    track.addEventListener("pointermove", (e) => { if (down) track.scrollLeft = down.left - (e.clientX - down.x); });
    const up = () => { down = null; track.classList.remove("drag"); };
    track.addEventListener("pointerup", up); track.addEventListener("pointercancel", up);
    // am Ende keine Ausblendung mehr am rechten Rand (wie beim Anlässe-Karussell)
    const edge = () => track.classList.toggle("at-end", track.scrollLeft + track.clientWidth >= track.scrollWidth - 4);
    track.addEventListener("scroll", edge, { passive: true }); edge();
  });

  // the formation: real drone positions read from the footage, or taken from the show file (then with real depth as
  // 7th value) – they take off when the section comes into view
  const cv = document.querySelector("canvas[data-formation]");
  if (cv) mountFormation(cv, { tally: document.querySelector("[data-tally]"), replay: document.querySelector("[data-replay]"), pause: document.querySelector("[data-formation-pause]"), copy: cv.parentElement.querySelector(".c-play-copy") });
})();
