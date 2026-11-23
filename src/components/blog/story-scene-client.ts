// Bedienung der Blog-Szene (StoryScene.astro). Lädt erst nahe der Szene oder bei Fokus/Zeiger (23.11.: vorher sofort auf jeder
// Artikelseite, 4,4 kB gzip); bis dahin steht das im Build gerenderte Bild.
export function mountStoryScene(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>('[data-stage]')!;
  const svg = stage.querySelector('svg')!;
  const camG = stage.querySelector<SVGGElement>('[data-cam]')!;
  const pieces = [...stage.querySelectorAll<SVGGElement>('.pc')]; // Annotationen sind reine Beschriftung, ohne Hover-Effekt (Marc, Prototyp 2)
  const notes = [...stage.querySelectorAll<HTMLElement>('.sn')];
  const marks = [...root.querySelectorAll<HTMLElement>('.ss-text > [data-step]')];
  const dots = [...root.querySelectorAll<HTMLButtonElement>('[data-goto]')];
  const grps = [...root.querySelectorAll<HTMLElement>('[data-grp]')];
  const now = root.querySelector<HTMLElement>('[data-now]'), num = root.querySelector<HTMLElement>('[data-num]');
  const frames = JSON.parse(stage.dataset.frames!) as [number, number, number, number][];
  const nums = (v?: string) => (v ? v.split(' ').map(Number) : []);
  const [wx = 1, wy = 0] = nums(stage.dataset.wind);
  const sweep = nums(stage.dataset.sweep);
  // Bewegung je Schritt aus der Szene (story.motion): Abspielkopf, Wind und Böen, Eigenbewegung, Drohnen ohne Farbe, Explosion
  const SWEEP = new Set(nums(stage.dataset.mSweep)), WIND = new Set(nums(stage.dataset.mWind)), ALIVE = new Set(nums(stage.dataset.mAlive)), PLAIN = new Set(nums(stage.dataset.mPlain));
  const OFF = new Set(nums(stage.dataset.mOff)), WARM = new Set(nums(stage.dataset.mWarm));
  const [beatSteps = '', beatAt = ''] = (stage.dataset.mBeat ?? '').split(' ');
  const BEAT = new Set(beatSteps ? beatSteps.split(',').map(Number) : []), [bx = 0, by = 0] = beatAt ? beatAt.split(',').map(Number) : [];
  const SIGNAL = new Set(nums(stage.dataset.mSignal)), SHOW = new Set(nums(stage.dataset.mShow));
  const LOOP = new Set([...SWEEP, ...WIND, ...ALIVE, ...BEAT]);
  const dronesG = stage.querySelector<SVGGElement>('.ss-drones')!;
  const ASSEMBLE = stage.dataset.mAssemble === undefined ? -1 : Number(stage.dataset.mAssemble);
  const P = pieces.map((el) => ({
    el, steps: nums(el.dataset.steps), dim: nums(el.dataset.dim),
    shift: el.dataset.shift ? (JSON.parse(el.dataset.shift) as Record<string, number>) : {},
    hide: nums(el.dataset.hide), after: nums(el.dataset.after), asm: el.dataset.asm === undefined ? null : Number(el.dataset.asm),
    asmOnly: el.dataset.asmonly !== undefined, inner: el.dataset.inner !== undefined, late: el.dataset.late !== undefined,
  }));
  const D = [...stage.querySelectorAll<SVGGElement>('.sd')].map((el, i) => ({
    el, sw: el.querySelector<SVGGElement>('.sw')!, w: Number(el.dataset.w), ph: i * 1.7, g: 0.7 + ((i * 7919) % 13) / 20,
    via: el.dataset.via ? (JSON.parse(el.dataset.via) as Record<string, [number, number]>) : {},
    pos: el.dataset.pos!.split(';').map((q) => q.split(',').map(Number)),
    track: el.dataset.track ? el.dataset.track.split(';').map((q) => q.split(',').map(Number)) : null,
    show: el.dataset.show ? [[0, 0], ...el.dataset.show.split(';').map((q) => q.split(',').map(Number))] : null,
    c0: el.style.getPropertyValue('--c'), led: '' as string | null,
  }));
  // Lichtblöcke mit Zeitbereich (Musik und Licht): hell, solange der Abspielkopf darüber steht; Farbe für die Drohnen
  const BARS = [...stage.querySelectorAll<SVGPathElement>('[data-tl]')].map((el) => { const [u0, u1, row] = el.dataset.tl!.split(' ').map(Number); return { el, u0, u1, row, on: false, color: '' }; });
  const ROWS = BARS.length ? Math.max(...BARS.map((b) => b.row)) + 1 : 0;
  const N = notes.map((el) => ({ el, steps: nums(el.dataset.steps), x: Number(el.dataset.x), y: Number(el.dataset.y) }));
  const streams = [...stage.querySelectorAll<SVGPathElement>('.stream')];
  const playhead = stage.querySelector<SVGPathElement>('.playhead');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const held = () => reduce.matches || document.documentElement.classList.contains('motion-paused');

  const T = 3.6; // Länge einer Böe in Sekunden

  // ---------- Kamera ----------
  let W = 1000, H = 470, step = -1, exploded = true, pinned = false, visible = false, frame = 0, t0 = 0, hop = 0;
  let swept = false, ps = -1, last = 0; // Musik und Licht (sweepTo)
  let showAt = 0; // Live-Show: Zeitpunkt, ab dem die Formen wechseln (nach dem Aufstieg)
  let loopGround = false; // Live-Show: Drohnen gerade am Boden (Schleife setzt is-signal)
  const focus = nums(stage.dataset.focus);
  const camOf = (s: number) => {
    const [x, y, w, h] = frames[s], k = Math.min(W / w, H / h);
    let ty = H / 2 - (y + h / 2) * k;
    // Zusammenbau: die zusammengesetzte Drohne in die Bühnenmitte (auf Höhe des Texts), so weit die zerlegte samt
    // Beschriftungen mit etwas Rand auf der Bühne bleibt
    if (focus.length && s === focus[0]) {
      const [, cy, y0, y1] = focus, m = Math.max(20, H * 0.06), lo = m - y0 * k, hi = H - m - y1 * k; // Ober-, Unterkante
      if (lo <= hi) ty = Math.min(Math.max(H / 2 - cy * k, Math.min(ty, lo)), Math.max(ty, hi));
    }
    return { k, tx: W / 2 - (x + w / 2) * k, ty };
  };
  const place = () => {
    const c = camOf(Math.max(0, step));
    camG.style.setProperty('--cx', String(c.tx)); camG.style.setProperty('--cy', String(c.ty)); camG.style.setProperty('--ck', String(c.k));
    N.forEach((n) => { n.el.style.setProperty('--x', `${((n.x * c.k + c.tx) / W) * 100}%`); n.el.style.setProperty('--y', `${((n.y * c.k + c.ty) / H) * 100}%`); });
  };
  const measure = () => { const r = stage.getBoundingClientRect(); W = Math.max(1, r.width); H = Math.max(1, r.height); svg.setAttribute('viewBox', `0 0 ${W} ${H}`); };

  // ---------- Schritt ----------
  const pose = (p: (typeof P)[number], s: number) => {
    const together = s === ASSEMBLE && !exploded;
    // Gehäuse und Beine nur zusammengesetzt; die Innenteile liegen dann unsichtbar im Gehäuse
    if (p.asmOnly && together) return { ty: 0, s1: 1, s2: 1, o: 1 };
    if (p.inner && together) return { ty: p.asm ?? 0, s1: 1, s2: 1, o: 0 };
    if (p.steps.includes(s) && !p.asmOnly) {
      const dy = together && p.asm !== null ? p.asm : p.shift[s] ?? 0;
      return { ty: dy, s1: 1, s2: 1, o: p.dim.includes(s) ? 0.32 : together && p.asm === 0 ? 0 : 1 };
    }
    const h = s > Math.max(...p.steps) && p.after.length ? p.after : p.hide.length ? p.hide : [0.04, 0.04, 0];
    return { ty: h[2] ?? 0, s1: h[0], s2: h[1], o: 0 };
  };
  const paint = (prev: number) => {
    P.forEach((p) => {
      const on = p.steps.includes(step), was = p.steps.includes(prev);
      p.el.style.transitionDelay = on && !was ? (p.late && !held() ? 'var(--ss-late)' : 'var(--ss-enter)') : '0s'; // was kommt, wartet, bis das Gehende kleiner ist
      const { ty, s1, s2, o } = pose(p, step);
      p.el.style.setProperty('--ty', String(ty)); p.el.style.setProperty('--s1', String(s1)); p.el.style.setProperty('--s2', String(s2)); p.el.style.opacity = String(o);
      p.el.classList.toggle('on', o > 0); // sichtbare Teile tragen .on (Funkwellen, Flugbahnen zeichnen sich nur dann)
    });
    N.forEach((n) => n.el.classList.toggle('on', n.steps.includes(step) && (step !== ASSEMBLE || exploded)));
    fitLater();
  };
  // Runde 20 (Marc, 22.11.): Die Drohne bleibt zusammengesetzt, damit man sie als Drohne erkennt. Sie zerfällt in ihre Teile,
  // solange die Maus über der Bühne steht; auf Touch-Bildschirmen und mit der Tastatur über den Knopf (oder Tippen auf die Bühne)
  const btn = stage.querySelector<HTMLButtonElement>('[data-explode]');
  const btnLabel = btn?.querySelector<HTMLElement>('[data-explode-label]');
  const explode = (on: boolean) => {
    if (step !== ASSEMBLE || on === exploded) return;
    exploded = on; paint(step);
    if (btn && btnLabel) { btn.setAttribute('aria-pressed', String(on)); btnLabel.textContent = (on ? btn.dataset.close : btn.dataset.open) ?? ''; }
  };
  const set = (s: number) => {
    if (s === step) return;
    const prev = step; step = s;
    stage.dataset.step = String(s);
    // Zusammengesetzt beim Eintritt in den Schritt, zerlegt nur auf Wunsch (explode)
    exploded = s !== ASSEMBLE; pinned = false;
    if (btn) { btn.hidden = s !== ASSEMBLE; btn.setAttribute('aria-pressed', 'false'); if (btnLabel) btnLabel.textContent = btn.dataset.open ?? ''; }
    marks.forEach((m) => m.classList.toggle('is-now', Number(m.dataset.step) === s));
    stage.classList.toggle('is-plain', PLAIN.has(s));
    dronesG.classList.remove('is-plain', 'is-off', 'is-warm'); // Standbild-Klassen aus dem HTML
    stage.classList.toggle('is-off', OFF.has(s)); stage.classList.toggle('is-warm', WARM.has(s));
    paint(prev);
    // Vorwärts in einen Schritt mit Zwischenhalt: erst alle zugleich zum Zwischenhalt (Abheben, Sinken), dann weiter
    clearTimeout(hop);
    stage.classList.remove('is-via', 'is-signal', 'is-rise');
    stage.classList.toggle('is-show', SHOW.has(s)); delete stage.dataset.pulse; loopGround = false;
    const at = (el: SVGGElement, x: number, y: number) => { el.style.setProperty('--dx', String(x)); el.style.setProperty('--dy', String(y)); };
    const fly = () => D.forEach((d) => { const [x, y, a] = d.pos[step]; at(d.el, x, y); d.el.style.opacity = String(a); });
    // Funk (story.motion.signal): am Boden ohne Farbe, Signallinien laufen; danach steigen alle zugleich und leuchten auf
    if (prev === s - 1 && prev >= 0 && D[0]?.via[s] && !held()) {
      const radio = SIGNAL.has(s);
      stage.classList.add('is-via'); stage.classList.toggle('is-signal', radio);
      D.forEach((d) => { const v = d.via[s]; at(d.el, v[0], v[1]); d.el.style.opacity = '1'; });
      hop = window.setTimeout(() => { stage.classList.remove('is-via', 'is-signal'); stage.classList.toggle('is-rise', radio); fly(); }, radio ? 1700 : 950);
      showAt = performance.now() + (radio ? 1700 : 950) + 2200; // erst Aufstieg und Ankunft im Stern
    } else { fly(); showAt = performance.now() + 1800; }
    place();
    dots.forEach((d) => { const n = Number(d.dataset.goto); if (n === s) d.setAttribute('aria-current', 'step'); else d.removeAttribute('aria-current'); d.classList.toggle('done', n < s); });
    const cur = dots.find((d) => Number(d.dataset.goto) === s);
    grps.forEach((g) => g.classList.toggle('on', !!cur && g.contains(cur)));
    if (cur && now) now.textContent = cur.dataset.title ?? '';
    if (cur && num) num.textContent = String(cur.dataset.n).padStart(2, '0');
    run();
  };

  // ---------- Auslöser: die Texteinheit, deren Anfang die Leselinie überschritten hat. Querformat (Szene rechts daneben):
  // Leselinie auf halber Höhe der Szene, am hohen Monitor mindestens 40 % der Fensterhöhe (sonst läge sie im oberen
  // Viertel); hochkant (Szene oben): ein Drittel in den Bereich unter der Bühne ----------
  const fig = root.querySelector<HTMLElement>('.ss-fig')!;
  const side = matchMedia('(min-aspect-ratio: 5/4) and (min-width: 60em)');
  const topOf = () => parseFloat(getComputedStyle(fig).top) || 0;
  const lineY = () => { if (side.matches) return Math.max(topOf() + fig.offsetHeight * 0.5, innerHeight * 0.4); const b = stage.getBoundingClientRect().bottom; return b + (innerHeight - b) * 0.32; };
  const pick = () => {
    fig.classList.toggle('is-stuck', fig.getBoundingClientRect().top <= topOf() + 1);
    const line = lineY();
    let s = Number(marks[0]?.dataset.step ?? 0);
    for (const m of marks) if (m.getBoundingClientRect().top < line) s = Number(m.dataset.step);
    set(s);
  };
  let ticking = false;
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(() => { ticking = false; pick(); }); } }, { passive: true });

  // ---------- Annotationen, die über den Bildschirm ragen würden, stehen auf der anderen Seite ----------
  const listW = () => Math.max(0, ...notes.filter((n) => n.classList.contains('sn-list')).map((n) => n.querySelector('.sn-pill')!.getBoundingClientRect().width));
  const fit = () => notes.forEach((n) => {
    n.classList.remove('sn-flip');
    // Prüfliste: alle Zeilen gemeinsam, nach dem Platz rechts vom Anker (unsichtbare zählen sonst zur Seitenbreite)
    if (n.classList.contains('sn-list')) { if (n.getBoundingClientRect().left + listW() > document.documentElement.clientWidth - 8) n.classList.add('sn-flip'); return; }
    const r = n.querySelector('.sn-pill')!.getBoundingClientRect();
    if (r.right > document.documentElement.clientWidth - 8 || r.left < 8) n.classList.add('sn-flip');
  });
  let fitLater = () => {};
  const relayout = () => { stage.classList.add('is-reset'); measure(); place(); void stage.getBoundingClientRect(); stage.classList.remove('is-reset'); requestAnimationFrame(fit); };

  // Anfangszustand ohne Übergang (im HTML steht der Endzustand für Suche, Vorschau und ohne JavaScript)
  stage.classList.add('is-reset');
  measure(); pick(); if (step < 0) set(0);
  void stage.getBoundingClientRect();
  stage.classList.remove('is-reset');
  fitLater = () => requestAnimationFrame(() => setTimeout(fit, 30));
  fit();
  if ('ResizeObserver' in window) new ResizeObserver(relayout).observe(stage); else addEventListener('resize', relayout);
  dots.forEach((d) => d.addEventListener('click', () => {
    const m = marks.find((el) => el.dataset.step === d.dataset.goto);
    if (!m) return;
    // zwei Spalten: Anfang der Einheit bündig mit der Szene; eine Spalte: knapp über die Leselinie
    const at = side.matches ? topOf() : lineY() - 24;
    scrollTo({ top: scrollY + m.getBoundingClientRect().top - at, behavior: held() ? 'auto' : 'smooth' });
  }));
  // Drohne zerlegen: Maus über der Bühne (zurück beim Verlassen, außer per Knopf festgehalten), Tippen auf die Bühne, Knopf
  const canHover = matchMedia('(hover: hover) and (pointer: fine)');
  if (btn) {
    stage.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') explode(true); });
    stage.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse' && !pinned) explode(false); });
    stage.addEventListener('click', (e) => {
      if (step !== ASSEMBLE) return;
      const viaBtn = btn.contains(e.target as Node);
      if (!viaBtn && canHover.matches) return; // mit Maus macht das schon der Hover
      pinned = !exploded; explode(!exploded);
    });
  }

  // ---------- Schleifen: Abspielkopf (Software), Wind und Böen (Simulation), leise Eigenbewegung des Sterns ----------
  // Musik und Licht: der Abspielkopf ist der Taktgeber. Unten werden die Lichtblöcke unter ihm hell, oben folgen die Drohnen
  // ihm entlang ihrer Bahn (vorwärts bildet sich der Stern, rückwärts löst er sich auf) und tragen die Farbe des Blocks
  // ihrer Spur; ohne Schleife (reduzierte Bewegung, Pause) steht der Endzustand: alle Blöcke hell, der Stern fertig.
  function unsweep() {
    if (!swept) return;
    swept = false; ps = -1;
    stage.classList.remove('is-sweeping');
    BARS.forEach((b) => { b.on = false; b.el.classList.remove('lit'); });
    D.forEach((d) => { if (!d.track) return; d.led = ''; d.el.style.setProperty('--c', d.c0); d.el.classList.remove('is-dim'); d.sw.style.removeProperty('--wx'); d.sw.style.removeProperty('--wy'); });
  }
  function sweepTo(u: number, ms: number) {
    if (!swept) { swept = true; stage.classList.add('is-sweeping'); BARS.forEach((b) => { if (!b.color) b.color = getComputedStyle(b.el).fill; }); }
    BARS.forEach((b) => { const on = u >= b.u0 - 0.015 && u <= b.u1 + 0.015; if (on !== b.on) { b.on = on; b.el.classList.toggle('lit', on); } });
    const lit = Array.from({ length: ROWS }, (_, r) => BARS.find((b) => b.row === r && b.on));
    // Sternbildung folgt dem Kopf, weich nachgeführt (kein Sprung beim Richtungswechsel)
    const goal = Math.min(1, Math.max(0, (u - 0.06) / 0.82)), target = goal * goal * (3 - 2 * goal);
    const dt = last ? Math.min(0.1, (ms - last) / 1000) : 0; last = ms;
    ps = ps < 0 ? target : ps + (target - ps) * (1 - Math.exp(-dt * 4));
    D.forEach((d, i) => {
      if (!d.track) return;
      const b = lit[Math.floor((i * ROWS) / D.length)], key = b ? b.color : null; // Drohnen nach x sortiert: je Spur ein zusammenhängender Teil des Sterns
      if (key !== d.led) { d.led = key; if (b) d.el.style.setProperty('--c', b.color); d.el.classList.toggle('is-dim', !b); }
      const f = ps * (d.track.length - 1), j = Math.min(d.track.length - 2, Math.floor(f)), r = f - j, a = d.track[j], c = d.track[j + 1];
      d.sw.style.setProperty('--wx', (a[0] + (c[0] - a[0]) * r).toFixed(2)); d.sw.style.setProperty('--wy', (a[1] + (c[1] - a[1]) * r).toFixed(2));
    });
  }
  // Live-Show als geschlossene Schleife (Marc, Runde 20): Stern → Herz → Kreis → Stern, dann landen alle im Startraster,
  // die Station funkt, alle steigen wieder in den Stern, und von vorn. Formen: 0 Stern (Lage des Schritts), 1 Herz,
  // 2 Kreis (drone.show), 3 Startraster (drone.via). Vor jedem Formwechsel sendet die Station Signale zu den Drohnen in
  // der nächsten Form (data-pulse); am Boden laufen die Signallinien zum Startraster (is-signal, Drohnen ohne Farbe).
  const HOLD = 2, MOVE = 1.4, PULSE = 0.9, LAND = 2.2, GROUND = 1.6, RISE = 2.2;
  type Seg = { a: number; b: number; dur: number; next?: number; ground?: boolean; rise?: boolean };
  const SEGS: Seg[] = [
    { a: 0, b: 0, dur: HOLD, next: 1 }, { a: 0, b: 1, dur: MOVE, next: 1 }, { a: 1, b: 1, dur: HOLD, next: 2 }, { a: 1, b: 2, dur: MOVE, next: 2 },
    { a: 2, b: 2, dur: HOLD, next: 0 }, { a: 2, b: 0, dur: MOVE, next: 0 }, { a: 0, b: 0, dur: HOLD }, { a: 0, b: 3, dur: LAND },
    { a: 3, b: 3, dur: GROUND, ground: true }, { a: 3, b: 0, dur: RISE, rise: true, next: 0 },
  ];
  const CYCLE = SEGS.reduce((t, g) => t + g.dur, 0);
  const smooth = (q: number) => q * q * (3 - 2 * q);
  /** Lage in der Schleife: Abschnitt, weicher Fortschritt, Anteil in der Luft (Eigenbewegung) und Signal */
  function showPhase(ms: number) {
    const ts = (ms - showAt) / 1000;
    if (ts <= 0) return null;
    let r = ts % CYCLE, k = 0;
    while (r > SEGS[k].dur) r -= SEGS[k++].dur;
    const g = SEGS[k], q = r / g.dur, e = g.a === g.b ? 0 : smooth(q);
    const air = g.ground ? 0 : g.b === 3 ? 1 - e : g.rise ? e : 1;
    // Signal: im letzten Stück vor einem Wechsel und in dessen erster Hälfte; beim Aufstieg in der ersten Hälfte
    const pulse = g.next === undefined ? '' : g.a === g.b ? (r > g.dur - PULSE ? String(g.next) : '') : q < 0.5 ? String(g.next) : '';
    return { g, e, air, pulse };
  }
  const formOf = (d: (typeof D)[number], f: number): [number, number] => {
    if (f === 3) { const v = d.via[6] ?? d.via[step], p = d.pos[step]; return v ? [v[0] - p[0], v[1] - p[1]] : [0, 0]; }
    const o = d.show?.[f]; return o ? [o[0], o[1]] : [0, 0];
  };
  function showOffset(d: (typeof D)[number], ph: ReturnType<typeof showPhase>): [number, number] {
    if (!ph || !d.show) return [0, 0];
    const a = formOf(d, ph.g.a), b = formOf(d, ph.g.b);
    return [a[0] + (b[0] - a[0]) * ph.e, a[1] + (b[1] - a[1]) * ph.e];
  }
  function pulseAt(ph: ReturnType<typeof showPhase>) {
    const next = ph?.pulse ?? '';
    if (next) { if (stage.dataset.pulse !== next) stage.dataset.pulse = next; } else if (stage.dataset.pulse !== undefined) delete stage.dataset.pulse;
    const ground = !!ph?.g.ground;
    if (ground !== loopGround) { loopGround = ground; stage.classList.toggle('is-signal', ground); }
  }
  function still() {
    unsweep(); last = 0; delete stage.dataset.pulse;
    if (loopGround) { loopGround = false; stage.classList.remove('is-signal'); }
    D.forEach((d) => { d.sw.style.removeProperty('--wx'); d.sw.style.removeProperty('--wy'); });
    streams.forEach((p) => { p.style.strokeDasharray = ''; p.style.strokeDashoffset = ''; });
    if (playhead) { playhead.style.removeProperty('--hx'); playhead.style.removeProperty('--hy'); }
  }
  function loop(ms: number) {
    frame = 0;
    if (!visible || held() || document.hidden || !LOOP.has(step)) { still(); return; }
    if (!t0) t0 = ms;
    const t = (ms - t0) / 1000;
    if (SWEEP.has(step) && playhead && sweep.length === 4) {
      const u = (Math.sin(t * 0.55 - Math.PI / 2) + 1) / 2;
      playhead.style.setProperty('--hx', String(sweep[0] + (sweep[2] - sweep[0]) * u)); playhead.style.setProperty('--hy', String(sweep[1] + (sweep[3] - sweep[1]) * u));
      sweepTo(u, ms);
    } else { unsweep(); last = 0; }
    if (WIND.has(step)) streams.forEach((p, i) => {
      // jede Linie zeichnet sich von Luv nach Lee und läuft dann aus; leicht versetzt
      const q = ((t + 0.11 * ((i * 5) % 8)) / T) % 1, head = Math.min(1, q / 0.62), tail = Math.max(0, Math.min(1, (q - 0.34) / 0.62));
      p.style.strokeDasharray = `${Math.max(0.0001, head - tail)} 2`; p.style.strokeDashoffset = String(-tail);
    });
    const ph = SHOW.has(step) ? showPhase(ms) : null;
    if (SHOW.has(step)) pulseAt(ph);
    if (ALIVE.has(step) || BEAT.has(step)) {
      // Herzschlag: zwei weiche Schläge, dann Ruhe (1,8 s); Weg vom Mittelpunkt höchstens 5 %
      const bp = (t % 1.8) / 1.8, bump = (c: number, w: number) => Math.exp(-(((bp - c) / w) ** 2));
      const beat = BEAT.has(step) ? 0.05 * bump(0.12, 0.06) + 0.03 * bump(0.32, 0.07) : 0;
      const gust = WIND.has(step), amp = (gust ? 1 : ALIVE.has(step) ? 0.6 : 0) * (ph ? ph.air : 1), sx = Math.sin(t * 0.45) * 1.4 * amp, sy = Math.sin(t * 0.6 + 1) * 0.9 * amp;
      D.forEach((d) => {
        let x = sx + Math.sin(t * 1.1 + d.ph) * 0.8 * amp, y = sy + Math.cos(t * 0.9 + d.ph * 1.3) * 0.8 * amp;
        if (gust) {
          // Böe: trifft die Drohne, wenn die Windlinie ihre Lage erreicht; sie gibt nach und fängt sich wieder
          let tau = (((t / T) % 1) - d.w * 0.62) * T; if (tau < 0) tau += T;
          const push = 4.2 * d.g * 8.15 * tau * Math.exp(-3 * tau) * Math.cos(tau * 1.6);
          x += wx * push - wy * push * 0.25 * Math.sin(d.ph); y += wy * push + wx * push * 0.25 * Math.sin(d.ph);
        }
        if (beat) { const [px, py] = d.pos[step]; x += (px - bx) * beat; y += (py - by) * beat; }
        if (d.show) { const [ox, oy] = showOffset(d, ph); x += ox; y += oy; }
        d.sw.style.setProperty('--wx', x.toFixed(2)); d.sw.style.setProperty('--wy', y.toFixed(2));
      });
    } else if (!swept) D.forEach((d) => { d.sw.style.removeProperty('--wx'); d.sw.style.removeProperty('--wy'); });
    frame = requestAnimationFrame(loop);
  }
  function run() { if (!frame && visible && !held() && !document.hidden && LOOP.has(step)) frame = requestAnimationFrame(loop); else if (!LOOP.has(step) || held()) still(); }
  new IntersectionObserver((es) => { visible = es[es.length - 1].isIntersecting; run(); }, { threshold: 0.6 }).observe(stage);
  document.addEventListener('flyingstars:motion-change', run);
  document.addEventListener('visibilitychange', run);
}
