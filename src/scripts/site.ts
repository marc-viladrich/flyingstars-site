// @ts-nocheck
import { REVEAL_MARGIN } from './reveal-point.js';
import { whenNear } from './when-near.mjs';
// Shared FlyingStars presentation; source: customer Vercel prototype.
(() => {
  "use strict";
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  // A pause chosen on one page stays in effect while the visitor moves through the site.
  const stored = (() => { try { return sessionStorage.getItem('flyingstars:motion'); } catch { return null; } })();
  let paused = stored ? stored === 'paused' : reduce;
  const motionButtons = document.querySelectorAll('[data-motion-toggle]'); // Header und Mobile-Menü
  function setMotion() {
    document.documentElement.classList.toggle('motion-paused', paused);
    document.dispatchEvent(new Event('flyingstars:motion-change'));
    motionButtons.forEach((button) => {
      const label = paused ? button.dataset.motionResume : button.dataset.motionPause;
      button.setAttribute('aria-label', label); button.title = label;
      button.setAttribute('aria-pressed', String(paused));
    });
  }
  motionButtons.forEach((button) => button.addEventListener('click', () => {
    paused = !paused;
    try { sessionStorage.setItem('flyingstars:motion', paused ? 'paused' : 'running'); } catch {}
    // Pause: alles, was noch auf seinen Auftritt wartet, sofort zeigen
    if (paused) document.documentElement.classList.remove('reveal');
    setMotion();
  }));
  setMotion();
  const nav = document.querySelector("header.nav");
  const sentinel = document.querySelector(".nav-sentinel");
  if (nav && sentinel) new IntersectionObserver(([entry]) => nav.classList.toggle("scrolled", !entry.isIntersecting)).observe(sentinel);
  // Runde 25 (Marc, 07.11.2026: am Handy „vertically ein bisschen zu eng … Header mit headroom on scroll down raus“): Auf
  // schmalen Bildschirmen weicht die Kopfzeile beim Runterscrollen nach oben aus und kommt beim Hochscrollen zurück.
  // Die Klasse liegt am <html>, damit klebende Elemente (Konfigurator-Bühne) den frei werdenden Platz nutzen können.
  const narrow = matchMedia("(max-width: 62.5em)");
  let lastY = scrollY, ticking = false, gestureAt = -Infinity;
  for (const type of ["touchmove", "wheel", "keydown"]) addEventListener(type, () => { gestureAt = performance.now(); }, { passive: true });
  const root = document.documentElement;
  const onScroll = () => {
    ticking = false;
    const y = scrollY, dy = y - lastY;
    if (!narrow.matches || y < 80 || document.querySelector("dialog[open]")) { root.classList.remove("nav-away"); lastY = y; return; }
    if (Math.abs(dy) < 8) return; // kleine Zitterer (Trägheit, Adressleiste) ändern nichts
    // nur eigenes Scrollen (Wischen, Mausrad, Tasten): Sprünge und weiches Scrollen zu einem Anker (WebKit beim Seitenaufruf
    // mit #konfigurator) lassen Kopfzeile und Preisleiste stehen
    if (performance.now() - gestureAt > 900 || Math.abs(dy) > innerHeight * 0.8) { lastY = y; return; }
    root.classList.toggle("nav-away", dy > 0);
    lastY = y;
  };
  addEventListener("scroll", () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  narrow.addEventListener("change", onScroll);
  // Tastatur: wer per Tab in die Kopfzeile springt, holt sie zurück
  nav?.addEventListener("focusin", () => root.classList.remove("nav-away"));
  const menu = document.getElementById("mobile-menu");
  const opener = document.querySelector("[data-menu-open]");
  if (menu && opener) {
    opener.addEventListener("click", () => {
      if (nav) menu.style.setProperty("--menu-top", getComputedStyle(nav).paddingTop); // Kopfzeile des Menüs = aktuelle Kopfzeile der Seite
      menu.showModal(); opener.setAttribute("aria-expanded", "true"); document.body.style.overflow = "hidden"; });
    menu.querySelector("[data-menu-close]").addEventListener("click", () => menu.close());
    menu.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => menu.close()));
    menu.addEventListener("close", () => { document.body.style.overflow = ""; opener.setAttribute("aria-expanded", "false"); menu.querySelectorAll("details[open]").forEach((d) => { d.open = false; }); opener.focus(); });
  }
  // Klebende Tabellenköpfe ([data-sticky-strip]: Reiter der Vergleiche, Kopf der Aufgaben-Tabelle) decken in der Farbe ihrer
  // Section. Gemessen beim ersten Scrollen, dann sind alle Stylesheets angewandt (WebKit meldete beim Laden noch transparent).
  addEventListener("scroll", () => document.querySelectorAll("[data-sticky-strip]").forEach((head) => {
    for (let el = head.parentElement; el; el = el.parentElement) { const bg = getComputedStyle(el).backgroundColor; if (bg && !/rgba\(.*,\s*0\)$|transparent/.test(bg)) { head.style.setProperty("--strip", bg); break; } }
  }), { once: true, passive: true });
  // Enhancement and font loading can change the height above an incoming hash link.
  // Align it after layout settles so calculator inquiries stay below the fixed nav.
  if (location.hash) window.addEventListener('load', () => {
    document.fonts.ready.then(() => requestAnimationFrame(() => {
      document.getElementById(location.hash.slice(1))?.scrollIntoView({block:'start',behavior:'instant'});
    }));
  }, {once:true});
  // slogan: rotating word (Neu. / Einzigartig. / Anders. / Spektakulär.)
  const word = document.querySelector("[data-rotate]");
  if (word && !reduce) {
    const words = word.dataset.rotate.split("|");
    let i = 0;
    setInterval(() => {
      if (paused || document.hidden) return;
      word.classList.add("out");
      setTimeout(() => { i = (i + 1) % words.length; word.textContent = words[i]; word.classList.remove("out"); }, 500);
    }, 3200);
  }

  // Laufband: die zweite Spur rendert LogoBar.astro (aria-hidden), Pause über .motion-paused in global.css

  // dot figures (brand signature): ring / sphere / torus with n points
  const GA = Math.PI * (3 - Math.sqrt(5));
  const shapes = {
    ring: (n) => Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return [Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0]; }),
    sphere: (n) => Array.from({ length: n }, (_, i) => { const y = 1 - (i / (n - 1)) * 2, r = Math.sqrt(1 - y * y), t = GA * i; return [Math.cos(t) * r * 0.95, y * 0.95, Math.sin(t) * r * 0.95]; }),
    torus: (n) => { const p = [], U = 25, V = Math.round(n / U); for (let i = 0; i < U; i++) for (let j = 0; j < V; j++) { const u = (i / U) * Math.PI * 2, v = (j / V) * Math.PI * 2 + i * 0.13; p.push([(0.68 + 0.28 * Math.cos(v)) * Math.cos(u), 0.28 * Math.sin(v), (0.68 + 0.28 * Math.cos(v)) * Math.sin(u)]); } return p.slice(0, n); },
  };
  const orbs = [...document.querySelectorAll("canvas[data-orb]")].map((c) => ({
    c, x: c.getContext("2d"), kind: c.dataset.orb, pts: shapes[c.dataset.orb](+c.dataset.n), col: c.dataset.color.split(",").map(Number), vis: false,
  }));
  if (orbs.length) {
    const io = new IntersectionObserver((es) => es.forEach((e) => { const o = orbs.find((q) => q.c === e.target); if (o) o.vis = e.isIntersecting; }));
    orbs.forEach((o) => io.observe(o.c));
    const draw = (o, t) => {
      const r = o.c.getBoundingClientRect(), d = Math.min(2, devicePixelRatio || 1), w = Math.round(r.width * d), h = Math.round(r.height * d);
      if (!w || !h) return;
      if (o.c.width !== w || o.c.height !== h) { o.c.width = w; o.c.height = h; }
      const x = o.x; x.clearRect(0, 0, w, h);
      const s = Math.min(w, h) * 0.42, ox = w / 2, oy = h / 2;
      const ay = o.kind === "ring" ? Math.sin(t * 0.5) * 0.7 : t * 0.4, tl = o.kind === "ring" ? 0.3 + Math.sin(t * 0.37) * 0.2 : o.kind === "torus" ? 0.6 : 0.3;
      const ca = Math.cos(ay), sa = Math.sin(ay), ct = Math.cos(tl), st = Math.sin(tl);
      const proj = o.pts.map(([px, py, pz]) => { let X = px * ca + pz * sa, Z = -px * sa + pz * ca; const Y = py * ct - Z * st; Z = py * st + Z * ct; return [X, Y, Z]; }).sort((u, v) => u[2] - v[2]);
      for (const [X, Y, Z] of proj) {
        const dep = (Z + 1) / 2, pr = 3.2 / (3.2 - Z);
        x.fillStyle = `rgba(${o.col[0]},${o.col[1]},${o.col[2]},${(0.2 + 0.72 * dep).toFixed(3)})`;
        x.beginPath(); x.arc(ox + X * s * pr, oy - Y * s * pr, (0.55 + 1.1 * dep) * d, 0, 7); x.fill();
      }
    };
    if (reduce) orbs.forEach((o) => draw(o, 0.8));
    else { const loop = (now) => { orbs.forEach((o) => o.vis && !paused && !document.hidden && draw(o, now / 1000)); requestAnimationFrame(loop); }; requestAnimationFrame(loop); }
  }

  // Reveal beim Scrollen: den Startzustand setzt das Inline-Skript im <head> (html.reveal), vor dem ersten Bild.
  // Hier wird nur noch freigegeben. Kein Layout lesen beim Start, sonst blenden die CSS-Reveals sichtbar aus.
  if (document.documentElement.classList.contains("reveal") && "IntersectionObserver" in window) {
    const show = (el) => {
      el.classList.add("is-in"); el.classList.remove("pre");
      if (el.classList.contains("member")) setTimeout(() => el.classList.add("shown"), 1400); // spätere Hover ohne Auftrittsverzögerung
    };
    const rio = new IntersectionObserver((es) => es.forEach((e) => {
      if (!e.isIntersecting) return;
      rio.unobserve(e.target);
      const own = e.target.__reveal || [e.target];
      own.forEach(show);
    }), { threshold: 0, rootMargin: REVEAL_MARGIN });
    document.querySelectorAll("[data-reveal-group], .member").forEach((el) => rio.observe(el));
    // Vorhänge: beobachtet wird der Rahmen darüber, ein per clip-path verdeckter Rahmen meldet sonst keine Sichtbarkeit
    document.querySelectorAll("[data-curtain]").forEach((el) => {
      const host = el.closest(".member") ? null : el.parentElement;
      if (!host) return; // Porträts im Team öffnen mit ihrer Karte
      (host.__reveal ||= []).push(el); rio.observe(host);
    });
  }

  // Lichtpunkte auf Bildern mit Interaktion: mit Maus beim Hovern, auf Touch-Geräten als Reveal beim Scrollen (statt Vorhang)
  const dotImgs = document.querySelectorAll("[data-dot-img]");
  dotImgs.forEach((el) => whenNear(el, () => import("./effects/dotimage.js").then(({ dotImage }) => dotImage(el, { step: +(el.dataset.step || 8) }))));

})();
