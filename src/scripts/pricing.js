import { HEART_CAPACITIES } from './pricing-heart-capacities';
import { SHOW_PACKAGES, PACKAGE_NAMES, priceFor, recommendPackage } from '../content/show-packages';

// FlyingStars pricing page: drone-count calculator + live swarm (one dot per drone)
(() => {
  "use strict";
  const motionQuery = matchMedia("(prefers-reduced-motion: reduce)");
  let reduce = motionQuery.matches;

  // Prototype net prices, excluding travel, from the supplied FlyingStars reference.
  // Shared with the server-rendered package cards through show-packages.ts.
  const PKG = SHOW_PACKAGES, NAMES = PACKAGE_NAMES, recommend = recommendPackage;
  const eur = (v) => v.toLocaleString("de-DE") + " €";

  const $ = (s) => document.querySelector(s);
  const range = $("#drones"), countEl = $("#count"), totalEl = $("#total"), noteEl = $("#calc-note"), readEl = $("#calc-read"), cta = $("#calc-cta");
  const tierBtns = [...document.querySelectorAll("[data-tier]")];
  const cards = Object.fromEntries(NAMES.map((k) => [k, document.querySelector(`[data-card="${k}"]`)]));

  if (!range) return;
  let n = +range.value, pkg = recommend(n), locked = false;

  // Inquiry links carry package, drone count and the sky text into the contact form.
  const inquiryHref = (k, count) => `/?${new URLSearchParams({ paket: k, drohnen: String(count), ...(text.value ? { text: text.value } : {}) })}#anfrage`;
  function update(fromSlider, computeText = true) {
    const need = textMin();
    if (+range.value < need) { range.value = need; fromSlider = true; } // under 10 drones per character the text gets hard to read; the package follows the new count
    n = +range.value;
    if (fromSlider) {
      const ok = PKG[pkg] && n <= PKG[pkg].max && n >= (pkg === "ODYSSEY" ? 300 : pkg === "HORIZON" ? 160 : 0);
      if (!locked || !ok) { pkg = recommend(n); locked = false; }
    }
    const p = PKG[pkg], price = priceFor(pkg, n);
    const nTxt = n.toLocaleString("de-DE");
    countEl.innerHTML = `${nTxt}<small>Drohnen</small>`;
    totalEl.innerHTML = `<b>ab ${eur(price)}</b><span class="mono">netto zzgl. Anfahrt</span>`;
    const pic = text.shown && text.shown.n === n ? { size: text.shown.size, d: text.shown.d } : swarm.info(n), sz = pic ? pic.size : null;
    const sizeTxt = sz ? `ca. ${Math.round(sz[0])} × ${Math.round(sz[1])} m${sz[2] >= 1 ? `, ${Math.round(sz[2])} m tief` : ""}` : "";
    readEl.innerHTML = `<span>Paket <b>${pkg}</b></span><span>Dauer <b>${p.dur}</b></span><span>Motive <b>${pkg === "SPARK" ? "aus dem Katalog + 4 eigene" : pkg === "HORIZON" ? "individuell, 2D + einfaches 3D" : "komplexes 3D + Storytelling"}</b></span>${sz ? `<span title="Größe des ganzen Motivs am Himmel, Drohnen im Abstand von ${String(pic.d).replace(".", ",")} m">Motivgröße <b>${sizeTxt}</b></span>` : ""}`;
    let note = "";
    if (pkg === "HORIZON" && n < 200) note = "HORIZON enthält bereits 200 Drohnen – zum selben Preis.";
    else if (pkg === "ODYSSEY" && n < 300) note = "ODYSSEY startet mit 300 Drohnen.";
    else if (n > 600) note = "Über 600 Drohnen ist das ein Richtpreis – die Flotte planen wir gemeinsam und bestätigen sie im Angebot.";
    else if (pkg === "SPARK" && n === 150) note = "Mehr als 150 Drohnen? Dann lohnt sich HORIZON mit individuellen Animationen.";
    if (need > 100 && n === need) note = `Unter 10 Drohnen pro Zeichen wird es schlecht lesbar – für deinen Text mindestens ${need.toLocaleString("de-DE")} Drohnen.`;
    if (text.value && text.shown && text.shown.n === n && text.shown.used < n) note = `Dein Text braucht höchstens ${text.shown.used.toLocaleString("de-DE")} Drohnen (80 m hoch) – die übrigen ${(n - text.shown.used).toLocaleString("de-DE")} zeigen wir als Reserve darunter; im Angebot ergänzen wir sie gern um Motive.`;
    noteEl.textContent = note;
    cta.textContent = `Mit ${nTxt} Drohnen anfragen`;
    cta.href = inquiryHref(pkg, n);
    const share = (n - +range.min) / (+range.max - +range.min); // the coloured part ends under the thumb centre
    range.style.setProperty("--fill", `calc(13px + ${share.toFixed(4)} * (100% - 26px))`);
    const col = `rgb(${p.color.join(",")})`;
    document.documentElement.style.setProperty("--pkg", col);
    range.setAttribute("aria-valuetext", `${n} Drohnen, ${pkg}, ab ${eur(price)}`);
    tierBtns.forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.tier === pkg)));
    // live prices on the package cards
    NAMES.forEach((k) => {
      const c = cards[k]; if (!c) return;
      const v = priceFor(k, n), box = c.querySelector("[data-live]");
      c.classList.toggle("is-rec", k === pkg);
      c.querySelector("a.btn").href = inquiryHref(k, Math.max(PKG[k].base, Math.min(n, PKG[k].max)));
      c.querySelector(".badge").textContent = k === pkg ? "Passt zu deiner Auswahl" : k === "HORIZON" ? "Bestseller" : k === "SPARK" ? "Einstieg" : "300+ Drohnen";
      if (v === null) box.innerHTML = `<span class="na">Nur bis 150 Drohnen</span><span class="mono">darüber: HORIZON</span>`;
      else {
        const label = n < PKG[k].base ? `inkl. ${PKG[k].base} Drohnen` : `für ${n.toLocaleString("de-DE")} Drohnen`;
        box.innerHTML = `<b>ab ${eur(v)}</b><span class="mono">${label} · ${PKG[k].dur}</span>`;
      }
    });
    if (text.value) { if (computeText) showText(p.color); } else { ++text.job; clearTimeout(text.timer); text.shown = null; swarm.setTarget(Math.max(n, 1), p.color); }
    renderTextRead();
  }

  // ---------- the customer's own text (Flo 25.09.2026) ----------
  // Drawn with the Formations-Werkzeug (FS Einstrich font, drone on every corner and end, equal spacing, exact count),
  // with the drones chosen on the slider. Under 10 drones per character it gets hard to read: the slider holds that
  // minimum. From 30 per character the letters switch to outline – only when the outline comes out clean, else they stay
  // single line ("im Zweifel weglassen"). Long texts wrap onto 2–3 lines like the FS designers do. Max 80 m high.
  const textIn = $("#showtext"), textRead = $("#text-read");
  const text = { value: "", shown: null, job: 0, timer: 0, cache: new Map(), engine: null, unknown: [] };
  const chars = (t) => Array.from(t.replace(/\s+/g, "")).length;
  function textMin() { return text.value ? Math.max(+range.min, Math.ceil((10 * chars(text.value)) / 10) * 10) : +range.min; }
  function wrap(t) { // balanced lines at word breaks: 1 line up to 14 characters, 2 up to 30, else 3
    const w = t.trim().split(/\s+/).filter(Boolean), s = w.join(" ");
    const lines = s.length <= 14 || w.length < 2 ? 1 : s.length <= 30 || w.length < 3 ? 2 : 3;
    if (lines === 1) return [s];
    let best = null;
    const len = (a, b) => w.slice(a, b).join(" ").length;
    for (let i = 1; i < w.length; i++) {
      if (lines === 2) { const m = Math.max(len(0, i), len(i, w.length)); if (!best || m < best.m) best = { m, l: [w.slice(0, i).join(" "), w.slice(i).join(" ")] }; continue; }
      for (let j = i + 1; j < w.length; j++) { const m = Math.max(len(0, i), len(i, j), len(j, w.length)); if (!best || m < best.m) best = { m, l: [w.slice(0, i).join(" "), w.slice(i, j).join(" "), w.slice(j).join(" ")] }; }
    }
    return best.l;
  }
  function engine() { // the text engine is loaded only when someone types (≈ 43 KB gzip)
    if (text.engine) return text.engine;
    text.engine = import('./pricing-text-engine.js').then((module) => { text.FK = module.FK; return module; });
    return text.engine;
  }
  function draw(lines, count, style) { // one formation in metres, or null when it does not come out
    // letters spaced by their closest drones, not their boxes, so W A and E H look alike (Flo 25.09.2026: "ungleichmäßig");
    // gap = at least 2 (outline 2.5) spacings or a quarter of the letter height, word gap about 2.5 times that
    const gaps = style === "outline" ? { optical: true, letterGapD: 2.5, letterGapCap: 0.25, wordGapD: 6, wordGapCap: 0.65 } : { optical: true, letterGapD: 2.0, letterGapCap: 0.25, wordGapD: 5, wordGapCap: 0.6 };
    const FK = text.FK, lay = FK.text.build(lines.join("\n"), count, Object.assign({ style, caps: true }, gaps), { spacing: 2.0 });
    if (!lay.elements.length) return null;
    const g = FK.graph.build(lay.elements, { targetN: count }), st = Object.assign({}, FK.plan.DEFAULTS, { targetN: count, spacing: 2.0 });
    let c = FK.plan.evaluate(g, count, st, false);
    if (!c.feasible && c.parity) c = FK.plan.evaluate(g, count, Object.assign({}, st, { symmetry: false }), false);
    if (!c.feasible) return null;
    return { pts: c._layout.drones.map((d) => [d.p[0] * c.s, d.p[1] * c.s, 0]), status: c.status, low: !!c.lowDensity, d: c.d_m, unknown: lay.unknown || [] };
  }
  function compute(value, count) {
    const lines = wrap(value), perChar = count / Math.max(1, chars(value)), key = lines.join("/") + "|" + count;
    if (text.cache.has(key)) return text.cache.get(key);
    let r = perChar >= 30 ? draw(lines, count, "outline") : null, style = "Umriss";
    if (!r || r.low || r.status === "ungleich" || r.status === "rot") { r = draw(lines, count, "stroke"); style = "Einstrich"; }
    if (!r) return null;
    // at most 80 m high at 2 m spacing: a text that would be higher keeps the drones that fit, the rest wait dimmed in a
    // grid below (like the FS spare drones under a figure) – the offer adds motifs for them
    const box = (P) => { const xs = P.map((q) => q[0]), ys = P.map((q) => q[1]); return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) }; };
    let b = box(r.pts), used = count;
    const drawStyle = style === "Umriss" ? "outline" : "stroke";
    for (let it = 0; b.y1 - b.y0 > 80 && it < 5; it++) {
      used = Math.max(10 * chars(value), Math.floor((used * 80) / (b.y1 - b.y0) * 0.97));
      const r2 = draw(lines, used, drawStyle);
      if (!r2) break;
      r = r2; b = box(r.pts);
    }
    const cxm = (b.x0 + b.x1) / 2, cym = (b.y0 + b.y1) / 2, w = b.x1 - b.x0, hgt = b.y1 - b.y0;
    const pts = r.pts.map((q) => [q[0] - cxm, q[1] - cym, 0]), spare = [];
    const nSpare = count - pts.length;
    if (nSpare > 0) {
      const pitch = 3, cols = Math.max(1, Math.min(nSpare, Math.floor(w / pitch) + 1)), top = -hgt / 2 - Math.max(9, 0.15 * hgt);
      for (let k = 0; k < nSpare; k++) { const row = Math.floor(k / cols), inRow = Math.min(cols, nSpare - row * cols), col = k - row * cols; spare.push([(col - (inRow - 1) / 2) * pitch, top - row * pitch, 0]); }
    }
    const out = { n: count, used: pts.length, lines, style, perChar, unknown: r.unknown, d: r.d, size: [w, hgt, 0], pts, spare };
    if (text.cache.size > 60) text.cache.clear();
    text.cache.set(key, out);
    return out;
  }
  function showText(col) {
    const job = ++text.job, value = text.value, count = n;
    clearTimeout(text.timer);
    text.timer = setTimeout(() => engine().then(() => {
      if (job !== text.job) return;
      const r = compute(value, count);
      if (job !== text.job) return;
      if (!r) { text.shown = null; swarm.setTarget(Math.max(count, 1), col); renderTextRead("Dieser Text lässt sich so nicht darstellen – bitte kürzen."); return; }
      text.shown = r; swarm.setText(r, col);
      update(false, false); // readout only: do not schedule the same formation again
    }, () => renderTextRead("Die Schrift konnte nicht geladen werden.")), 220);
  }
  function renderTextRead(msg) {
    if (!textRead) return;
    if (msg) { textRead.textContent = msg; return; }
    if (!text.value) { textRead.textContent = "Wir zeigen ihn mit deiner Drohnenzahl in unserer Show-Schrift."; return; }
    const cN = chars(text.value), r = text.shown && text.shown.n === n ? text.shown : null;
    textRead.textContent = `${cN} ${cN === 1 ? "Zeichen" : "Zeichen"} · ${(n / cN).toLocaleString("de-DE", { maximumFractionDigits: 0 })} Drohnen pro Zeichen${r ? " · " + r.style + "-Schrift" + (r.lines.length > 1 ? " · " + r.lines.length + " Zeilen" : "") : ""}${r && r.unknown.length ? " · nicht darstellbar: " + r.unknown.join(" ") : ""}`;
  }
  if (textIn) textIn.addEventListener("input", () => {
    text.value = textIn.value.toUpperCase().replace(/\s+/g, " ").trim();
    update(false);
  });

  // ---------- swarm: one heart that grows with the drone count ----------
  const swarm = (() => {
    const cv = $("#swarm"), ctx = cv.getContext("2d");
    // The pictures come from the Formations-Werkzeug (tools/build-hearts.js -> herz-formationen.js): the FS heart with a
    // drone on tip and dent, equal spacing, one spacing per picture (2D 2,0 m, 3D 3,0 m), exact drone count, never
    // closer than 1,0 m, at most 80 m high. 100–140 outline · 150 double heart · 160–290 3D heart (honeycomb half-shell)
    // · 300+ the 3D heart grows, small hearts beside it grow too and only now and then one more joins.
    // Every heart owns a fixed range of drones (slot): when it grows, its drones stay and new ones join.
    let DATA = null;
    const CAP = HEART_CAPACITIES, OFF = CAP.map((_, i) => CAP.slice(0, i).reduce((a, b) => a + b, 0));
    const MAX = CAP.reduce((a, b) => a + b, 0);
    let seed = 5; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const stepFor = (m) => { const k = Math.max(100, Math.min(1000, Math.round(m / 10) * 10)); return DATA && DATA.steps[k] ? [k, DATA.steps[k]] : null; };
    const picture = (m) => { // metres, per heart: its slot and its drones in a fixed order
      const st = stepFor(m); if (!st) return null;
      const sc = st[1].scale || 1, hearts = [];
      for (const [key, x, y, turn, dz, slot] of st[1].refs) {
        const Q = DATA.parts[key], a = (turn * Math.PI) / 180, c = Math.cos(a), sn = Math.sin(a), pts = [];
        for (let i = 0; i < Q.length; i += 3) pts.push([((Q[i] * c - Q[i + 1] * sn + x) / 10) * sc, ((Q[i] * sn + Q[i + 1] * c + y) / 10) * sc, ((Q[i + 2] + dz) / 10) * sc]);
        hearts.push({ slot: slot || 0, pts, pivot: [(x / 10) * sc, (y / 10) * sc] });
      }
      return { n: st[0], step: st[1], hearts };
    };
    const info = (m) => { const st = stepFor(m); return st ? st[1] : null; };

    const P = Array.from({ length: MAX }, () => { const a = rnd() * 6.283, r = 1.3 + rnd() * 0.6; return { x: Math.cos(a) * r, y: (rnd() - 0.5) * 1.4, z: Math.sin(a) * r * 0.6, vx: 0, vy: 0, vz: 0, tx: 0, ty: 0, tz: 0, al: 0, ta: 0, ph: rnd() * 6.28, delay: 0 }; });
    let shape = "", color = [219, 100, 232], cur = [219, 100, 232], count = 0, yaw = 0, tilt = 0, sprite = null, spriteKey = "";
    let unit = 0.03, unitShown = 0, sizeM = null, pulseAmp = 0, dText = 0, spareN = 0; // display units per metre (the picture fills about ±1), eased for the scale bar; dText = spacing of a shown text, spareN = its reserve drones
    let W = 0, H = 0, DPR = 1, cx = 0, cy = 0, S = 0, visible = true, mouse = null;

    // drones dodge the mouse pointer and fly back into formation
    const host = cv.parentElement;
    host.addEventListener("pointermove", (e) => { if (e.pointerType === "touch") return; const r = cv.getBoundingClientRect(); mouse = [(e.clientX - r.left) * DPR, (e.clientY - r.top) * DPR]; });
    host.addEventListener("pointerleave", () => { mouse = null; });

    function resize() {
      DPR = Math.min(2, devicePixelRatio || 1);
      const r = cv.getBoundingClientRect(); W = r.width; H = r.height;
      cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
      const wide = W >= 1100;
      // desktop: swarm sits behind the hero on the right; mobile: the canvas is its own block above the calculator
      cx = (wide ? W * 0.73 : W * 0.5) * DPR; cy = H * 0.5 * DPR;
      S = (wide ? Math.min(H * 0.33, W * 0.2) : Math.min(W * 0.34, H * 0.4)) * DPR;
      draw(0, 0);
    }
    function makeSprite(c) {
      const key = c.map((v) => v | 0).join(",");
      if (key === spriteKey) return;
      spriteKey = key;
      const s = document.createElement("canvas"), R = 32; s.width = s.height = R * 2;
      const g = s.getContext("2d"), gr = g.createRadialGradient(R, R, 0, R, R, R);
      gr.addColorStop(0, `rgba(${key},0.22)`); gr.addColorStop(0.35, `rgba(${key},0.07)`); gr.addColorStop(1, `rgba(${key},0)`);
      g.fillStyle = gr; g.fillRect(0, 0, R * 2, R * 2);
      sprite = s;
    }
    function setTarget(m, col) {
      const pic = picture(m);
      if (!pic) return;
      const sh = pic.step.stage === "umriss" || pic.step.stage === "doppel" ? "flat" : pic.step.stage, changedShape = sh !== shape;
      shape = sh; color = col; sizeM = pic.step.size;
      unit = 1 / Math.max(sizeM[0] / 2, sizeM[1] / 2 / 0.86, 1); // the whole picture spans about ±1 display units
      let zs = 0; count = 0;
      for (const h of pic.hearts) for (const q of h.pts) { zs += q[2]; count++; }
      const zc = zs / Math.max(1, count), on = new Uint8Array(MAX); // turn about the middle of the depth
      for (const h of pic.hearts) h.pts.forEach((q, j) => {
        const i = OFF[h.slot] + j, p = P[i];
        if (i >= MAX || j >= CAP[h.slot]) return;
        on[i] = 1; p.tx = q[0] * unit; p.ty = q[1] * unit; p.tz = (q[2] - zc) * unit;
        p.hs = h.slot; p.hx = h.pivot[0] * unit; p.hy = h.pivot[1] * unit; // the heart it belongs to (for beat and wiggle)
        if (!p.ta || changedShape) p.delay = changedShape ? rnd() * 0.5 : rnd() * 0.15;
        p.ta = 1;
      });
      for (let i = 0; i < MAX; i++) {
        const p = P[i];
        if (!on[i] && p.ta) { const a = rnd() * 6.283, r = 1.4 + rnd() * 0.5; p.tx = Math.cos(a) * r; p.ty = (rnd() - 0.5) * 1.3; p.tz = Math.sin(a) * r * 0.5; p.ta = 0; }
      }
      if (reduce || !unitShown) unitShown = unit;
      if (held()) { for (const p of P) { p.x = p.tx; p.y = p.ty; p.z = p.tz; p.al = p.ta; } cur = col.slice(); draw(0, 0); }
    }
    // dimension lines: width below and height beside the whole picture, in metres (Flo: "mit Höhe und Breite des
    // gesamten Motivs"); eased with the picture so they grow and shrink with it
    function dims(dt) {
      if (!sizeM) return;
      unitShown += (unit - unitShown) * Math.min(1, dt ? dt * 3 : 1);
      const k = unitShown * S, w = sizeM[0] * k, h = sizeM[1] * k * (shape === "flat" || shape === "text" ? 1 : Math.cos(0.14));
      const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2, t = 5 * DPR;
      const above = shape === "text" && spareN > 0; // a reserve stands below the text: the width line goes above it
      const ye = above ? y0 - 4 * DPR : y1 + 4 * DPR, yb = above ? Math.max(20 * DPR, y0 - 22 * DPR) : Math.min(cv.height - 20 * DPR, y1 + 22 * DPR), xr = Math.min(cv.width - 34 * DPR, x1 + 22 * DPR);
      ctx.save();
      ctx.strokeStyle = "rgba(246,241,232,0.42)"; ctx.lineWidth = 1 * DPR;
      ctx.setLineDash([2 * DPR, 3 * DPR]);
      ctx.beginPath(); ctx.moveTo(x0, ye); ctx.lineTo(x0, yb); ctx.moveTo(x1, ye); ctx.lineTo(x1, yb); ctx.moveTo(x1 + 4 * DPR, y0); ctx.lineTo(xr, y0); ctx.moveTo(x1 + 4 * DPR, y1); ctx.lineTo(xr, y1); ctx.stroke();
      ctx.setLineDash([]); ctx.strokeStyle = "rgba(246,241,232,0.6)";
      ctx.beginPath(); ctx.moveTo(x0, yb); ctx.lineTo(x1, yb); ctx.moveTo(x0, yb - t); ctx.lineTo(x0, yb + t); ctx.moveTo(x1, yb - t); ctx.lineTo(x1, yb + t);
      ctx.moveTo(xr, y0); ctx.lineTo(xr, y1); ctx.moveTo(xr - t, y0); ctx.lineTo(xr + t, y0); ctx.moveTo(xr - t, y1); ctx.lineTo(xr + t, y1); ctx.stroke();
      ctx.font = `500 ${11 * DPR}px "JetBrains Mono", ui-monospace, monospace`; ctx.fillStyle = "rgba(246,241,232,0.8)";
      const label = (txt, x, y, rot) => { ctx.save(); ctx.translate(x, y); if (rot) ctx.rotate(-Math.PI / 2); const tw = ctx.measureText(txt).width; ctx.fillStyle = "rgba(15,13,12,0.85)"; ctx.fillRect(-tw / 2 - 5 * DPR, -8 * DPR, tw + 10 * DPR, 16 * DPR); ctx.fillStyle = "rgba(246,241,232,0.85)"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.fillText(txt, 0, 0); ctx.restore(); };
      label(`${Math.round(sizeM[0])} m`, cx, yb);
      label(`${Math.round(sizeM[1])} m`, xr, cy, true);
      ctx.restore();
    }
    function draw(dt, t) {
      for (let a = 0; a < 3; a++) cur[a] += (color[a] - cur[a]) * Math.min(1, dt * 3);
      makeSprite(cur);
      // the flat heart faces the audience; the 3D hearts swing gently so the depth shows
      // wide pictures (300+) turn less, far hearts would sweep a lot (Flo: "ab 400 Drohnen wirkt es unsauber")
      const still = shape === "flat" || shape === "text", swing = still ? 0 : Math.sin(t * 0.25) * (shape === "vielfalt" ? 0.1 : 0.26);
      yaw += (swing - yaw) * Math.min(1, dt * 2.2); tilt += ((still ? 0 : 0.14) - tilt) * Math.min(1, dt * 2.2);
      const cyw = Math.cos(yaw), syw = Math.sin(yaw), ct = Math.cos(tilt), st = Math.sin(tilt);
      // heartbeat: a single heart beats ±4 % around its real size in 3.2 s (show 8 pulsed its heart 1.205 ↔ 1.335), so the
      // dimension lines show the mean size. With small hearts around (they rock ±4°) the main heart stands still
      // (Flo: "sonst wird es zu wild"); the beat fades in and out over about a second
      pulseAmp += ((shape === "vielfalt" || shape === "text" ? 0 : 0.04) - pulseAmp) * Math.min(1, dt * 1.5);
      const beat = 1 - pulseAmp * Math.cos((2 * Math.PI * t) / 3.2);
      const rock = CAP.map((_, k) => (k ? 0.07 * Math.sin((2 * Math.PI * t) / (2.3 + 0.37 * k) + k * 1.7) : 0));
      ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.clearRect(0, 0, cv.width, cv.height);
      const list = [], k = 7, c = 2 * Math.sqrt(k) * 0.8;
      for (let i = 0; i < MAX; i++) {
        const p = P[i];
        if (dt) {
          if (p.delay > 0) p.delay -= dt;
          else {
            const dx = p.tx - p.x, dy = p.ty - p.y, dz = p.tz - p.z, flow = Math.min(1, Math.hypot(dx, dy, dz) * 1.5) * 0.8;
            p.vx += (k * dx - c * p.vx + Math.sin(t * 0.9 + p.ph + p.y * 3) * flow) * dt;
            p.vy += (k * dy - c * p.vy + Math.cos(t * 0.8 + p.ph + p.x * 3) * flow) * dt;
            p.vz += (k * dz - c * p.vz + Math.sin(t * 0.7 + p.ph * 2) * flow * 0.6) * dt;
          }
          p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
          p.al += (p.ta - p.al) * Math.min(1, dt * (p.ta > p.al ? 2.4 : 3.2));
        }
        if (p.al < 0.02) continue;
        // drones hold still in formation (no idle wobble per drone); whole hearts move: the (main) heart beats, the
        // small hearts around it rock a little, each in its own rhythm (Flo 25.09.2026)
        let wx = p.x, wy = p.y, wz = p.z;
        if (p.ta && !reduce) {
          const dx = wx - p.hx, dy = wy - p.hy;
          if (!p.hs) { wx = p.hx + dx * beat; wy = p.hy + dy * beat; wz *= beat; }
          else { const a = rock[p.hs] || 0, c = Math.cos(a), sn = Math.sin(a); wx = p.hx + dx * c - dy * sn; wy = p.hy + dx * sn + dy * c; }
        }
        let X = wx * cyw + wz * syw, Z = -wx * syw + wz * cyw;
        const Y = wy * ct - Z * st; Z = wy * st + Z * ct;
        const pr = 3.4 / (3.4 - Z), sx = cx + X * S * pr, sy = cy - Y * S * pr;
        if (mouse && dt) {
          const mx = sx - mouse[0], my = sy - mouse[1], md = Math.hypot(mx, my), R = 120 * DPR;
          if (md < R && md > 0.1) { // push away on screen, turned back into the rotated formation
            const f = (1 - md / R) ** 2 * 6 * dt, ux = (mx / md) * f, uy = (-my / md) * f;
            p.vx += ux * cyw + uy * st * syw; p.vy += uy * ct; p.vz += ux * syw - uy * st * cyw;
          }
        }
        list.push([sx, sy, Z, pr, p.al * (0.35 + 0.65 * (Z + 1) / 2)]);
      }
      list.sort((u, v) => u[2] - v[2]);
      // dot size follows the spacing on screen, so many drones stay crisp dots instead of melting together
      const spacingPx = (shape === "text" ? dText || 2 : sizeM ? (info(Math.round(count / 10) * 10) || { d: 2 }).d : 2) * unit * S;
      const core = Math.max(1 * DPR, Math.min(4 * DPR, 0.16 * spacingPx));
      // halos add up where drones stand close (many drones on a small screen) – dim them by density
      const haloK = Math.min(1, Math.sqrt((0.007 * (S / DPR) ** 2) / Math.max(1, count)));
      ctx.globalCompositeOperation = "lighter";
      for (const [sx, sy, , pr, a] of list) { const R = (core * pr) * 5 + 3 * DPR; ctx.globalAlpha = a * haloK; ctx.drawImage(sprite, sx - R, sy - R, R * 2, R * 2); }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = "source-over";
      const R0 = Math.min(255, cur[0] + 25) | 0, G0 = Math.min(255, cur[1] + 25) | 0, B0 = Math.min(255, cur[2] + 25) | 0;
      for (const [sx, sy, , pr, a] of list) { ctx.fillStyle = `rgba(${R0},${G0},${B0},${a.toFixed(3)})`; ctx.beginPath(); ctx.arc(sx, sy, core * pr, 0, 7); ctx.fill(); }
      dims(dt);
    }
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(cv);
    let frame = 0, last = 0, animationPaused = false, pageActive = true;
    // Local pause, global pause and reduced motion all show the finished picture instead of a frozen or empty frame.
    function held() { return reduce || animationPaused || document.documentElement.classList.contains("motion-paused"); }
    const motionButton = $("#swarm-motion");
    function stopAnimation() { if (frame) cancelAnimationFrame(frame); frame = 0; last = 0; }
    function loop(now) {
      frame = 0;
      if (!visible || document.hidden || reduce || animationPaused || document.documentElement.classList.contains("motion-paused") || !pageActive) return;
      const t = now / 1000, dt = Math.min(0.05, last ? t - last : 0.016); last = t;
      draw(dt, t); frame = requestAnimationFrame(loop);
    }
    function syncAnimation() {
      if (sizeM && visible && !document.hidden && !reduce && !animationPaused && !document.documentElement.classList.contains("motion-paused") && pageActive) {
        if (!frame) frame = requestAnimationFrame(loop);
      } else stopAnimation();
    }
    function settle() {
      for (const p of P) { p.x = p.tx; p.y = p.ty; p.z = p.tz; p.al = p.ta; }
      cur = color.slice(); yaw = 0; tilt = 0; draw(0, 0);
    }
    function updateMotionButton() {
      motionButton.textContent = reduce ? "Animation reduziert" : animationPaused ? "Animation fortsetzen" : "Animation pausieren";
      motionButton.disabled = reduce;
      motionButton.setAttribute("aria-pressed", String(animationPaused || reduce));
    }
    const intersectionObserver = new IntersectionObserver((entries) => { visible = entries[0].isIntersecting; syncAnimation(); });
    intersectionObserver.observe(cv);
    document.addEventListener("visibilitychange", syncAnimation);
    document.addEventListener("flyingstars:motion-change", () => { if (held()) settle(); syncAnimation(); });
    window.addEventListener("pagehide", () => { pageActive = false; stopAnimation(); clearTimeout(text.timer); ++text.job; });
    window.addEventListener("pageshow", () => { pageActive = true; syncAnimation(); });
    motionQuery.addEventListener("change", () => { reduce = motionQuery.matches; if (reduce) settle(); updateMotionButton(); syncAnimation(); });
    motionButton.addEventListener("click", () => { animationPaused = !animationPaused; if (animationPaused) settle(); updateMotionButton(); syncAnimation(); });
    updateMotionButton(); syncAnimation();
    // a text picture (from the page's text engine): flat, no swing and no beat, drones 0..n-1
    function setText(r, col) {
      const changed = shape !== "text";
      const all = r.pts.concat(r.spare || []), low = all.length ? Math.min(...all.map((q) => q[1])) : 0;
      shape = "text"; color = col; sizeM = r.size; count = all.length; dText = r.d; spareN = (r.spare || []).length;
      unit = 1 / Math.max(sizeM[0] / 2, Math.max(sizeM[1] / 2, -low) / 0.86, 1); // the reserve below must fit too
      for (let i = 0; i < MAX; i++) {
        const p = P[i];
        if (i < count) { const q = all[i]; p.tx = q[0] * unit; p.ty = q[1] * unit; p.tz = 0; p.hs = 0; p.hx = 0; p.hy = 0; if (!p.ta || changed) p.delay = changed ? rnd() * 0.5 : rnd() * 0.15; p.ta = i < r.pts.length ? 1 : 0.28; }
        else if (p.ta) { const a = rnd() * 6.283, rr = 1.4 + rnd() * 0.5; p.tx = Math.cos(a) * rr; p.ty = (rnd() - 0.5) * 1.3; p.tz = Math.sin(a) * rr * 0.5; p.ta = 0; }
      }
      if (reduce || !unitShown) unitShown = unit;
      if (held()) { for (const p of P) { p.x = p.tx; p.y = p.ty; p.z = p.tz; p.al = p.ta; } cur = col.slice(); draw(0, 0); }
      syncAnimation();
    }
    return { setTarget, setText, resize, info, loadHearts(data) {
      DATA = data;
      if (!text.value) setTarget(n, PKG[pkg].color);
      syncAnimation();
    } };
  })();

  range.addEventListener("input", () => update(true));
  tierBtns.forEach((b) => b.addEventListener("click", () => {
    const k = b.dataset.tier, p = PKG[k];
    pkg = k; locked = true;
    if (+range.value < p.base) range.value = p.base;
    if (+range.value > p.max) range.value = p.max;
    update(false);
  }));
  swarm.resize();
  update(true);
  // Geometry is a separate chunk. Prices and package selection are ready immediately.
  import('./pricing-formations.js').then(({ default: data }) => {
    swarm.loadHearts(data);
    update(false, false);
  }, () => {
    noteEl.textContent = "Die Herzvisualisierung konnte nicht geladen werden. Der Preisrechner funktioniert weiterhin.";
  });
})();
