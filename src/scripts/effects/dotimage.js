// Bilder mit Interaktion (Anlass-Karten, Referenzen, Team): Beim Hovern wird das ganze Bild zu Lichtpunkten,
// beim Verlassen wieder zum Foto, jederzeit umkehrbar.
// Ablauf wie eine Show am Nachthimmel: Eine organische Welle aus Lichtpunkten läuft direkt über das Foto und
// zeichnet es neu, danach glüht es ruhig weiter. Alles stetig: kein Effekt schaltet hart ein.
// Günstig: Die Lichter werden einmal (im Leerlauf) in sechs Bänder plus eine Schein-Ebene vorgerendert;
// pro Frame kopiert der Browser nur diese sieben fertigen Ebenen übereinander, statt tausende Punkte zu zeichnen.
// Erscheinen beim Scrollen übernimmt der Vorhang-Reveal aus dem Prototyp (CSS, .pre).
// Bewusst ohne Import aus swarm.js: das Modul läuft auf jeder Seite mit Bildkarten und soll klein bleiben (ca. 2 KB gzip),
// der Schwarm samt Formationsplaner kommt nur auf Seiten mit Formationen dazu.
const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const motionPaused = () => document.documentElement.classList.contains('motion-paused');
function hash(a, b = 0) {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = (h ^ (h >>> 13)) * 1274126177 | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
const still = () => reduceMotion() || motionPaused();

const BANDS = 6;
const ease = u => u * u * (3 - 2 * u);
const clamp01 = u => Math.min(1, Math.max(0, u));

function buildLayers(img, W, H, step) {
  const cols = Math.max(1, Math.floor(W / step)), rows = Math.max(1, Math.floor(H / step));
  // Bild im Seitenverhältnis des Rahmens (object-fit: cover) abtasten. img ist hier immer eine eigene Kopie ohne srcset
  // (source() unten): naturalWidth sind dann echte Bildpixel, also derselbe Maßstab, in dem drawImage ausschneidet.
  const s = Math.max(cols / img.naturalWidth, rows / img.naturalHeight);
  const sw = cols / s, sh = rows / s, sx = (img.naturalWidth - sw) / 2, sy = (img.naturalHeight - sh) / 2;
  // 4× feiner abtasten und je Zelle das hellste Pixel nehmen: Drohnen und Stadtlichter bleiben Lichter
  const F = 4, t = document.createElement('canvas'); t.width = cols * F; t.height = rows * F;
  const tg = t.getContext('2d', { willReadFrequently: true });
  tg.drawImage(img, sx, sy, sw, sh, 0, 0, cols * F, rows * F);
  const px = tg.getImageData(0, 0, cols * F, rows * F).data, TW = cols * F;
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const bands = Array.from({ length: BANDS }, mk), ctx = bands.map(c => c.getContext('2d'));
  const halo = mk(), hg = halo.getContext('2d'); hg.globalCompositeOperation = 'lighter';
  const ox = (W - cols * step) / 2 + step / 2, oy = (H - rows * step) / 2 + step / 2;
  const L = new Float32Array(cols * rows), K = new Int32Array(cols * rows);
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    let best = -1, k = 0, sum = 0;
    for (let v = 0; v < F; v++) for (let u = 0; u < F; u++) {
      const q = ((y * F + v) * TW + x * F + u) * 4, l = 0.299 * px[q] + 0.587 * px[q + 1] + 0.114 * px[q + 2];
      sum += l; if (l > best) { best = l; k = q; }
    }
    L[y * cols + x] = (0.65 * best + 0.35 * sum / (F * F)) / 255; K[y * cols + x] = k;
  }
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    const lum = L[y * cols + x], k = K[y * cols + x], r = px[k], g = px[k + 1], b = px[k + 2];
    // Band: schräge Welle von links unten nach rechts oben, mit Rauschen, damit die Kante organisch wirkt
    const sweep = 0.62 * (x / cols) + 0.38 * (1 - y / rows) + (hash(x, y) - 0.5) * 0.28;
    const c = ctx[Math.min(BANDS - 1, Math.max(0, Math.floor(sweep * BANDS)))];
    // jede Zelle bringt ihr Stück Nachthimmel mit: die Welle läuft direkt über das Foto, ohne vorheriges Abdunkeln
    c.globalCompositeOperation = 'source-over'; c.fillStyle = '#0a0908';
    c.fillRect(ox + x * step - step / 2, oy + y * step - step / 2, step + 0.5, step + 0.5);
    if (lum < 0.06) continue; // dunkle Stellen bleiben Nachthimmel
    const rad = step * (0.16 + 0.34 * Math.sqrt(lum)), lift = v => Math.min(255, Math.round(v * 0.9 + 40 * lum + 10));
    c.globalCompositeOperation = 'lighter';
    c.fillStyle = `rgba(${lift(r)},${lift(g)},${lift(b)},${0.25 + 0.75 * lum})`;
    c.beginPath(); c.arc(ox + x * step, oy + y * step, rad, 0, 6.2832); c.fill();
    // weicher Hof nur um echte Lichtspitzen (heller als die Umgebung), sonst überstrahlt ein heller Hintergrund alles
    let m = 0, c2 = 0;
    for (let v = -2; v <= 2; v++) for (let u = -2; u <= 2; u++) { const yy = y + v, xx = x + u; if (yy >= 0 && yy < rows && xx >= 0 && xx < cols) { m += L[yy * cols + xx]; c2++; } }
    if (lum > 0.5 && lum - m / c2 > 0.15) {
      const cx = ox + x * step, cy = oy + y * step, R = step * 2.2, gr = hg.createRadialGradient(cx, cy, 0, cx, cy, R);
      gr.addColorStop(0, `rgba(${lift(r)},${lift(g)},${lift(b)},${0.22 * lum})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      hg.fillStyle = gr; hg.fillRect(cx - R, cy - R, R * 2, R * 2);
    }
  }
  return { bands, halo };
}

// Bei Bildern mit srcset meldet naturalWidth die Größe geteilt durch die gewählte Pixeldichte (z. B. 331 statt 640 px),
// drawImage schneidet aber in echten Bildpixeln aus. Mit diesen Maßen abgetastet landete ein vergrößerter Ausschnitt
// oben links auf der Karte, je nach Fensterbreite stärker (Marc, 31.10.2026). Deshalb tasten wir eine Kopie der
// gerade geladenen Datei ab, deren Maße echte Pixel sind.
function source(img) {
  const url = img.currentSrc || img.src;
  if (img.__dotSrc?.url === url) return img.__dotSrc;
  const copy = new Image(); copy.decoding = 'async'; copy.src = url;
  const entry = img.__dotSrc = { url, copy, ok: false };
  const done = () => { entry.ok = copy.naturalWidth > 0; };
  if (copy.complete) done(); else copy.addEventListener('load', done, { once: true });
  return entry;
}

const IN = 0.7, OUT = 0.45; // Sekunden für Welle hin und zurück (Marc, 31.10.2026: „gerne ein ganzes Stück schneller“)

export function dotImage(wrap, { step = 8 } = {}) {
  const img = wrap.querySelector('img');
  if (!img) return;
  // Maus: Lichtpunkte beim Hovern. Touch: Lichtpunkte als Reveal beim Scrollen (Marc, 31.10.2026: der Effekt soll auf
  // dem Handy nicht verloren gehen und ersetzt dort den Vorhang)
  const touch = !matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (touch && (still() || !document.documentElement.classList.contains('reveal'))) return;
  if (wrap.dataset.dotReady) return; // schon eingerichtet (Seite und Probe rufen beide auf)
  wrap.dataset.dotReady = '1';
  const cv = document.createElement('canvas'); cv.className = 'dot-cv'; cv.setAttribute('aria-hidden', 'true');
  img.after(cv); // direkt über dem Foto, unter Abdunklung, Text und Zählern
  const g = cv.getContext('2d');
  // weiche Lichtpunkte brauchen keine Retina-Auflösung: 1× halbiert die Pixelarbeit je Frame
  let base, layers = null, p = 0, target = 0, raf = 0, last = 0, W = 0, H = 0, T = 0, amp = 0, slow = 0, calm = false;
  let built = '';
  const size = () => { W = wrap.clientWidth; H = wrap.clientHeight; cv.width = W; cv.height = H; layers = null; if (p > 0 && ready()) draw(); };
  const ready = () => {
    if (!img.complete || !img.naturalWidth || !W) return null;
    const src = source(img);
    if (!src.ok) { src.copy.addEventListener('load', () => { src.ok = true; if (target) go(target); }, { once: true }); return null; }
    if (!layers || built !== src.url) { layers = buildLayers(src.copy, W, H, step); built = src.url; }
    return layers;
  };

  function draw() {
    g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cv.width, cv.height);
    // Foto bleibt stehen, bis die Welle es ganz überdeckt hat (sonst blitzen Ränder zwischen den Zellen)
    // Grunddeckkraft aus dem CSS übernehmen (z. B. abgedunkelte Teaser); ohne Effekt bleibt das CSS allein zuständig
    if (base === undefined) base = parseFloat(getComputedStyle(img).opacity) || 1;
    const k = 1 - ease(clamp01((p - 0.9) / 0.1));
    img.style.opacity = k >= 1 ? '' : String(base * k);
    if (p <= 0.001) return;
    // die Lichter zeichnen das Bild Band für Band neu, direkt über dem Foto; danach ruhiges Glühen (amp gleitet von 0 hoch)
    for (let i = 0; i < BANDS; i++) {
      const k = ease(clamp01((p - (i / BANDS) * 0.7) / 0.3));
      if (k <= 0) continue;
      const glow = 1 - amp * (0.5 + 0.5 * Math.sin(T * (0.9 + i * 0.37) + i * 1.7));
      g.globalAlpha = k * glow; g.drawImage(layers.bands[i], 0, 0);
    }
    g.globalCompositeOperation = 'lighter';
    g.globalAlpha = ease(clamp01((p - 0.6) / 0.4)) * (0.6 + amp * 2 * (0.5 + 0.5 * Math.sin(T * 0.7)));
    g.drawImage(layers.halo, 0, 0);
    g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
  }
  const tick = now => {
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 0.016; last = now; T = now / 1000;
    p = clamp01(p + Math.sign(target - p) * dt / (target ? IN : OUT));
    // Glüh-Stärke gleitet: erst wenn das Bild fertig gezeichnet ist, weich hoch; beim Verlassen weich runter
    const want = target === 1 && p === 1 && !calm ? 0.2 : 0;
    amp += (want - amp) * Math.min(1, dt * 1.2);
    draw();
    // Sicherung für Geräte ohne Grafikbeschleunigung: dauerhaft langsame Frames → Bild bleibt ruhig stehen
    slow = slow * 0.9 + (dt > 0.034 ? 0.1 : 0); if (slow > 0.35) calm = true;
    const busy = p !== target || amp > 0.002 || (target === 1 && !calm && !still());
    if (busy) raf = requestAnimationFrame(tick); else { raf = 0; last = 0; }
  };
  const go = t => {
    target = t;
    if (reduceMotion() || motionPaused()) return;
    if (!ready()) return;
    if (!raf) raf = requestAnimationFrame(tick);
  };
  // Reveal auf Touch-Geräten: Bilder, die beim Laden schon im Bild sind, bleiben einfach Foto. Alle anderen sind bis
  // zum Erscheinen verborgen (.dot-pending); beim Hereinscrollen zeichnet eine Lichtpunkt-Welle das Bild, das kurz
  // glüht und dann zum Foto wird. Sicherung: Kommt das Bild nicht rechtzeitig, erscheint nach 2,5 s einfach das Foto.
  // Ebenen im Leerlauf vorbereiten, sobald das Bild in der Nähe ist: der erste Hover bzw. Reveal startet ohne Wartezeit
  function prepare() {
    const idle = window.requestIdleCallback || (f => setTimeout(f, 200));
    new IntersectionObserver((es, o) => {
      if (!es[0].isIntersecting) return; o.disconnect();
      if (img.loading === 'lazy') img.loading = 'eager';
      const prep = () => idle(() => { source(img); idle(() => ready()); });
      if (img.complete) prep(); else img.addEventListener('load', prep, { once: true });
    }, { rootMargin: '600px' }).observe(wrap);
  }
  function reveal() {
    if (wrap.getBoundingClientRect().top < innerHeight) return;
    wrap.classList.add('dot-pending');
    let started = false;
    const show = () => wrap.classList.remove('dot-pending');
    const run = () => {
      if (started) return; started = true;
      const fallback = setTimeout(show, 2500);
      const begin = () => {
        if (!ready()) return setTimeout(begin, 120);
        clearTimeout(fallback);
        go(1);
        const wait = () => { if (p < 1) return requestAnimationFrame(wait); show(); setTimeout(() => go(0), 450); };
        requestAnimationFrame(wait);
      };
      begin();
    };
    new IntersectionObserver((es, o) => { if (!es[0].isIntersecting) return; o.disconnect(); run(); }, { rootMargin: '0px 0px -8% 0px' }).observe(wrap);
  }
  if (touch) { new ResizeObserver(size).observe(wrap); prepare(); reveal(); return; }
  // Auslöser ist die ganze Karte, nicht nur das Foto (Marc, 31.10.2026): Karten tragen data-dot-host
  const host = wrap.closest('[data-dot-host]') || wrap;
  host.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') go(1); });
  host.addEventListener('pointerleave', () => go(0));
  host.addEventListener('focusin', () => { if (host.matches(':focus-visible, :has(:focus-visible)')) go(1); });
  host.addEventListener('focusout', e => { if (!host.contains(e.relatedTarget)) go(0); });
  // nicht sofort messen: ein erzwungenes Layout beim Start ließ CSS-Reveals (Team, Vorhang) erst ein- und dann wieder
  // ausblenden; der ResizeObserver meldet die Größe ohnehin nach dem ersten Layout
  new ResizeObserver(size).observe(wrap);
  prepare();
}
