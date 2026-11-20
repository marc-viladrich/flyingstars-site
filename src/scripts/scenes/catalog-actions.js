// Semantic masks traced against the catalogue point renders, not x<0: tilted bowls cross the centre.
// Indices refer to immutable catalogue variants. Spark points above the rims belong to neither glass.
import { smooth, roll, TAU } from '../show-motion.js';
import { sampleOutline } from '../show-geometry.js';
import { assemble, curves } from './catalog-3d/kit.js';

/** Glatter als smooth: Geschwindigkeit UND Beschleunigung sind an beiden Enden null (ruhiges Anfliegen, sanftes Ankommen). */
const smooth5 = (u) => (u <= 0 ? 0 : u >= 1 ? 1 : u * u * u * (u * (u * 6 - 15) + 10));
/** Mittlere Farbe der Katalogdrohnen (die eigenen Formen behalten den Ton des Katalogbilds). */
const tone = (pts) => [3, 4, 5].map((k) => Math.round(pts.reduce((s, p) => s + (p[k] ?? 255), 0) / Math.max(1, pts.length)));
/** Punkte gleichmäßig auf offenen Polylinien, so ausgedünnt, dass keine zwei näher als g stehen. */
function thinned(dense, g) {
  const out = [], grid = new Map(), cell = (x, y) => `${Math.floor(x / g)},${Math.floor(y / g)}`;
  for (const p of dense) {
    const gx = Math.floor(p[0] / g), gy = Math.floor(p[1] / g); let ok = true;
    for (let dx = -1; dx <= 1 && ok; dx++) for (let dy = -1; dy <= 1 && ok; dy++) for (const q of grid.get(`${gx + dx},${gy + dy}`) ?? []) if (Math.hypot(q[0] - p[0], q[1] - p[1]) < g) { ok = false; break; }
    if (ok) { out.push(p); const k = cell(p[0], p[1]); if (!grid.has(k)) grid.set(k, []); grid.get(k).push(p); }
  }
  return out;
}

// ------------------------------------------------------------------ Handschlag ----------
// Die beiden Hände im fertigen Händedruck (nachgezeichnet am Endbild von Katalogclip 24, m-3a2eec826186dbb9): links die
// Hand, die von links kommt (Arm, dann die Finger schräg nach unten), rechts die Hand von rechts (Arm, Daumen oben, die
// gekrümmten Finger unten). Jede Hand ist ein Stück und bleibt eins.
const HANDS = [
  [[-1,.53],[-.65,.48],[-.30,.47],[-.15,.39],[.02,.25],[.23,.08],[.43,-.11],[.40,-.21],[.30,-.23],[.10,-.08],[.34,-.28],[.29,-.38],[.19,-.38],[-.02,-.22],[.19,-.42],[.11,-.50],[.02,-.48],[-.19,-.30],[-.04,-.49],[-.14,-.55],[-.31,-.46],[-.62,-.23],[-1,-.13]],
  [[1,.53],[.64,.49],[.33,.50],[.10,.47],[-.05,.38],[-.11,.20],[-.06,.09],[.05,.07],[.14,.20],[.25,.18],[.42,.01],[.55,-.08],[.35,-.34],[.08,-.57],[-.12,-.56],[-.31,-.46],[-.37,-.35],[-.28,-.29],[-.13,-.39],[-.26,-.26],[-.19,-.18],[-.04,-.27],[-.16,-.15],[-.07,-.08],[.11,-.20],[.42,-.28],[.68,-.15],[1,.03]],
];
/**
 * n Drohnen auf den beiden Händen (Endbild), je Hand gleichmäßig; Startlage: die Hände so weit auseinander, dass zwischen
 * ihnen deutlich Luft ist (mehr als 3 Linienabstände), die linke etwas tiefer, die rechte etwas höher.
 * fade: Drohnen der rechten Hand, die im fertigen Händedruck auf einer Drohne der linken stünden (Kreuzungen) — sie
 * gehen beim Zugreifen aus, damit das Endbild keinen Klumpen hat.
 */
function handshake(src) {
  const n = src.length, lens = HANDS.map((h) => h.slice(1).reduce((s, p, i) => s + Math.hypot(p[0] - h[i][0], p[1] - h[i][1]), 0));
  const dense = HANDS.map((h) => sampleOutline([{ pts: h, closed: false }], Math.ceil(n * 10 * lens[HANDS.indexOf(h)] / (lens[0] + lens[1]))));
  const both = (g) => dense.map((d) => thinned(d, g));
  let lo = 1e-4, hi = 0.5;
  for (let it = 0; it < 24; it++) { const mid = (lo + hi) / 2; if (both(mid).reduce((s, q) => s + q.length, 0) >= n) lo = mid; else hi = mid; }
  const g = hi, sets = both(g);
  // knapp zu wenige: die fehlenden dorthin, wo auf ihrer Hand am meisten Platz ist
  while (sets[0].length + sets[1].length < n) {
    let best = null;
    sets.forEach((q, h) => dense[h].forEach((c) => { const d = Math.min(...q.map((p) => Math.hypot(p[0] - c[0], p[1] - c[1]))); if (!best || d > best.d) best = { d, c, h }; }));
    sets[best.h].push(best.c);
  }
  while (sets[0].length + sets[1].length > n) sets[sets[0].length > sets[1].length ? 0 : 1].pop();
  const final = [...sets[0], ...sets[1]], hand = [...sets[0].map(() => 0), ...sets[1].map(() => 1)];
  // Abstand der Hände beim Start: so weit, dass zwischen ihnen mindestens 3 g Luft ist
  const gapAt = (d) => { let m = Infinity; for (const p of sets[0]) for (const q of sets[1]) m = Math.min(m, Math.hypot(q[0] + d - p[0] + d, q[1] + 0.12 * d - p[1] + 0.12 * d)); return m; };
  // (Linienabstand = mittlerer Abstand zum nächsten Nachbarn in der eigenen Hand; g ist nur der Mindestabstand)
  const nn = sets.flatMap((q) => q.map((p, i) => Math.min(...q.map((r, k) => (k === i ? Infinity : Math.hypot(r[0] - p[0], r[1] - p[1])))))).sort((x, y) => x - y), sp = nn[nn.length >> 1];
  let d = 0.1; while (gapAt(d) < 3.3 * sp && d < 1) d += 0.02;
  const start = [[-d, -0.12 * d], [d, 0.12 * d]];
  const fade = new Set(sets[1].flatMap((q, i) => (sets[0].some((p) => Math.hypot(p[0] - q[0], p[1] - q[1]) < 0.5 * g) ? [sets[0].length + i] : [])));
  const c = tone(src);
  return { pts: final.map((p, j) => [p[0] + start[hand[j]][0], p[1] + start[hand[j]][1], 0, ...c]), hand, start, meet: g, fade };
}

// ------------------------------------------------------------------ Zahnräder ----------
// Wie die 3D-Fassung (catalog-3d/technik.js: großes Rad oben rechts wie im Katalog, darunter ein mittleres, links ein
// kleines), aber flach und so gesetzt, dass jedes Rad wirklich im Eingriff mit dem vorigen steht: Achsabstand = Summe der
// Teilkreise, gleicher Modul (Teilkreis ∝ Zähnezahl). w: Drehzahl relativ zum großen Rad = −Zähne(vorheriges)/Zähne.
const GEAR_SPEED = -0.32; // rad/s des großen Rads (wie GEAR_W in 3D, im Uhrzeigersinn)
const MODULE = 0.053, TIP = 0.07;
const gearAt = (from, dir, teeth) => { const r = MODULE * teeth, d = from.pitch + r + 0.012; return { c: [from.c[0] + Math.cos(dir) * d, from.c[1] + Math.sin(dir) * d], pitch: r, teeth }; };
const G0 = { c: [0.36, 0.2], pitch: MODULE * 10, teeth: 10 }, G1 = gearAt(G0, Math.atan2(-0.7, -0.65), 7), G2 = gearAt(G1, Math.atan2(0.44, -0.64), 5);
export const GEARS_2D = [G0, G1, G2].reduce((list, g, i) => [...list, { ...g, w: i ? (-list[i - 1].w * list[i - 1].teeth) / g.teeth : 1 }], []);
/** Zahnkontur: Fuß, Flanke, Kopf, Flanke, Fuß (Zahnmitte bei u = 0,35 einer Teilung, wie in 3D). */
function gearOutline({ c, pitch, teeth }, phase, k = 6) {
  const tip = pitch + TIP, root = pitch - TIP, pts = [];
  for (let i = 0; i < teeth; i++) {
    const a = phase + (i / teeth) * TAU, d = TAU / teeth;
    for (const [u, r] of [[0, root], [0.12, root], [0.22, tip], [0.48, tip], [0.58, root]]) pts.push([c[0] + Math.cos(a + u * d) * r, c[1] + Math.sin(a + u * d) * r, 0]);
    for (let m = 1; m < k / 2; m++) { const u = 0.58 + (0.42 * m) / (k / 2); pts.push([c[0] + Math.cos(a + u * d) * root, c[1] + Math.sin(a + u * d) * root, 0]); }
  }
  return { pts, closed: true };
}
/** Phasen: am Berührpunkt steht bei Rad i eine Zahnmitte genau dort, wo Rad i+1 eine Lückenmitte hat (s_i + s_k = ½). */
export function gearPhases(gears = GEARS_2D, phase0 = 0.15) {
  const ph = [phase0];
  for (let k = 1; k < gears.length; k++) {
    const a = gears[k - 1], b = gears[k], th = Math.atan2(b.c[1] - a.c[1], b.c[0] - a.c[0]), da = TAU / a.teeth, db = TAU / b.teeth;
    const si = ((((th - ph[k - 1]) / da - 0.35) % 1) + 1) % 1, sk = 0.5 - si;
    ph.push(th + Math.PI - (sk + 0.35) * db);
  }
  return ph;
}
/** n Drohnen auf zwei Rädern (unter 170) oder drei, je mit Nabenring; gear[j] = Rad der Drohne. */
function gearTrain(src) {
  const n = src.length, k = n < 170 ? 2 : 3, ph = gearPhases();
  const parts = GEARS_2D.slice(0, k).flatMap((g, i) => [
    curves(`g${i}`, [gearOutline(g, ph[i])]),
    curves(`h${i}`, [{ pts: Array.from({ length: 24 }, (_, m) => [g.c[0] + Math.cos((m / 24) * TAU) * g.pitch * 0.26, g.c[1] + Math.sin((m / 24) * TAU) * g.pitch * 0.26, 0]), closed: true }], { w: 0.8 }),
  ]);
  const shape = assemble(parts, n), c = tone(src);
  return { pts: shape.pts.map((p) => [p[0], p[1], 0, ...c]), gear: shape.tags.map((t) => +t.slice(1)) };
}
const LEFT = {
  'm-a819a681c8cee7a2': [0,1,2,4,5,6,8,9,10,11,12,14,15,16,18,19,20,21,24,25,26,27,28,30,33,41,42,45,46,53,54,56,62,63,64,66],
  'm-c0934127db49df2e': [0,7,8,9,10,14,15,18,20,21,22,23,25,29,38,40,43,44,45,47,48,51,53,54,55,56,57,58,59,60,61,63,65,69,73,77,78,79,80,82,83,86,87],
  'm-d4538cee3c87fc1b': [0,1,2,3,4,6,9,11,13,14,15,18,20,21,22,24,26,27,33,35,38,41,49,52,53,54,55,60,62,63,64,65,66,68,69,74,75,77,80,83,85,86,87,88,92,93,94,96,97,99,106],
  'm-de8bd2e761a7d1ed': [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,30,31,32,33,34,35,36,37,38,41,43,44,45,48,55,58,59,60,61,62,63,64,65,66,67,68,70,78,88,90,91,92,93,94,95,96,97,99,101,102,118,119,120,121,122,123,124,125,126,130,133,134,135,142],
};
export function glassGroups(f) {
  const left = new Set(LEFT[f.id]);
  if (!LEFT[f.id]) throw new Error(`Unreviewed glass variant ${f.id}`);
  const sparks = new Set();
  // Explicit sparks also cover the different vertical crop of each source.
  const extra = { 'm-a819a681c8cee7a2':[38,39], 'm-c0934127db49df2e':[16,62], 'm-d4538cee3c87fc1b':[34,42,47,70,73,107], 'm-de8bd2e761a7d1ed':[17,40,46,49,52,54,73,75,85,89] };
  extra[f.id].forEach(j=>sparks.add(j));
  return { left, right: new Set(f.points.flatMap((_,j)=>!left.has(j)&&!sparks.has(j)?[j]:[])), sparks };
}
const progress = (t, start, duration) => smooth((t-start)/duration);
const interpolate = (p,q,u,o) => { for(let k=0;k<3;k++) o[k]=p[k]+(q[k]-p[k])*u; };
/** Dedicated actions share the catalogue's stable point identity and the engine's reduced-motion path. */
export function catalogAction(key,f,pts) {
  if(key==='smiley') {
    const eye=pts.flatMap((p,j)=>p[0]>.12&&p[0]<.55&&p[1]>.02&&p[1]<.36?[j]:[]).sort((a,b)=>pts[a][0]-pts[b][0]);
    // Claude, Runde 28: alle Augendrohnen auf einer kurzen Linie standen dichter als jede andere Stelle des Bildes und
    // lasen sich als Balken. Jede zweite Drohne (in x-Reihenfolge) bildet das geschlossene Lid als flachen Bogen über die
    // Breite des offenen Auges; die anderen bleiben an ihrem Platz und schalten für das Zwinkern das Licht aus.
    const xs=eye.map(j=>pts[j][0]), x0=Math.min(...xs), x1=Math.max(...xs), lid=eye.filter((_,i)=>i%2===0);
    const targets=new Map(lid.map((j,i)=>{const s=i/Math.max(1,lid.length-1); return [j,[x0+(x1-x0)*s,.17+.035*(1-(2*s-1)**2),pts[j][2]]];}));
    const off=new Set(eye.filter((_,i)=>i%2===1));
    return { live:(b,j,t,o)=>{const u=progress(t,.5,.9)*(1-progress(t,1.65,.9)); const q=targets.get(j); if(q) interpolate(b,q,u,o); else if(off.has(j)) o[3]*=1-progress(t,.5,.35)*(1-progress(t,1.75,.35)); }, duration:3 };
  }
  if(key==='handschlag') {
    // Runde 10b (Marc 20.11.: „aktuell morphen die Hände quasi ineinander … so wie die Animation von FlyingStars geplant ist,
    // sieht man die Hände erst getrennt, und dann fliegen sie slowly but surely ineinander“): zwei STARRE Hände. Jede Hand
    // ist eine der beiden Konturen des fertigen Händedrucks (Katalogclip 24, Endbild); sie stehen zuerst getrennt, gleiten
    // dann langsam aufeinander zu, bis die eine Hand in der anderen liegt, und schütteln sich zweimal. Kein Punkt wechselt
    // dabei seinen Platz in der Hand (Wächter: catalog-2d-motion.test.mjs).
    const {pts:out,hand,start,meet,fade}=handshake(pts);
    const T0=.8,T1=4.3,PUMP=4.6;
    const u=(t)=>smooth5((t-T0)/(T1-T0));
    // hidden: Drohnen der hinteren Hand, die im fertigen Händedruck verdeckt sind und deshalb ausgehen (Artefakt-Audit)
    return {pts:out, parts:hand, hidden:fade.size, duration:6.4, live:(b,j,t,o)=>{
      const v=u(t), s=start[hand[j]];
      o[0]=b[0]-s[0]*v; o[1]=b[1]-s[1]*v;
      // zweimal schütteln, beide Hände zusammen (starr)
      o[1]+=.035*Math.sin((t-PUMP)*TAU/.7)*(t>PUMP&&t<PUMP+1.4?Math.sin((t-PUMP)*Math.PI/1.4):0);
      if(fade.has(j)) o[3]*=1-smooth((u(t)-.82)/.18);
    }, meet};
  }
  if(key==='zahnraeder') {
    // Runde 10b (Marc: „die Zahnräder sind ein bisschen awkward … könnten sich ja auch ineinander drehen, so wie bei der
    // 3D-Version“): vorher drehte sich das ganze Katalogbild (ein Rad und zwei angeschnittene Räder) als ein Stück. Jetzt
    // ganze Räder im Eingriff wie in catalog-3d/technik.js: Zahn greift in Lücke, Drehzahl umgekehrt proportional zur
    // Zähnezahl, gegenläufig; jede Drohne fährt starr mit ihrem Rad.
    const {pts:out,gear}=gearTrain(pts);
    return {pts:out, parts:gear, live:(b,j,t,o)=>{const g=GEARS_2D[gear[j]]; roll(o,GEAR_SPEED*g.w*t,g.c[0],g.c[1]);}};
  }
  if(key==='anstossen') {
    // Runde 5 (Marc, 18.11.: „kaputt, schon lange“): Vorher schob sich das rechte Glas ganz auf das linke, das linke erlosch,
    // übrig blieb ein Glas. Jetzt stoßen beide an: Jedes Glas schwenkt um seinen Fuß nach außen, schwingt zurück, bis die
    // Ränder sich berühren (die Ruhelage des Katalogbilds), prallt kaum merklich ab und steht wieder. Im Moment der Berührung
    // springen die Funken über den Rändern nach außen und leuchten auf. Am Ende steht exakt das Katalogbild.
    const {left,right,sparks}=glassGroups(f);
    const foot=(idx)=>{const low=[...idx].sort((a,c)=>pts[a][1]-pts[c][1]).slice(0,6); return [0,1].map(k=>low.reduce((s,j)=>s+pts[j][k],0)/low.length);};
    const pl=foot(left),pr=foot(right),hit=[(pl[0]+pr[0])/2,Math.max(...[...left,...right].map(j=>pts[j][1]))*.92];
    const OPEN=.12,BOUNCE=.022,CLINK=1.95;
    const angle=(t)=>OPEN*(progress(t,.4,.9)-progress(t,CLINK-.6,.6))+BOUNCE*(progress(t,CLINK,.25)-progress(t,CLINK+.25,.5));
    const turn=(o,p,a)=>{const dx=o[0]-p[0],dy=o[1]-p[1],c=Math.cos(a),s=Math.sin(a); o[0]=p[0]+dx*c-dy*s; o[1]=p[1]+dx*s+dy*c;};
    return { duration:4.5, live:(b,j,t,o)=>{
      const a=angle(t);
      if(left.has(j)) turn(o,pl,a); else if(right.has(j)) turn(o,pr,-a);
      else if(sparks.has(j)) {
        const out=.14*progress(t,CLINK,.7)*(1-progress(t,3.1,1.1)), dx=b[0]-hit[0], dy=b[1]-hit[1], d=Math.hypot(dx,dy)||1;
        o[0]+=dx/d*out; o[1]+=dy/d*out;
        // vor dem Anstoßen gedimmt, beim Klirren hell, danach wieder normal
        const base=t<CLINK?1-.65*progress(t,.4,.6):.35+.65*progress(t,2.6,1), flash=Math.max(0,1-Math.abs(t-CLINK-.1)/.5)*1.1;
        o[3]*=base+flash;
      }
    }};
  }
  if(key==='konfetti') {
    const confetti=new Set(f.id.startsWith('bild-')
      ? [...Array.from({length:22},(_,j)=>j),24]
      : [0,26,48,55,64,71,80,84,96,97,105,127,129,132,137,140,147,148]);
    // The blue pull-cord and the white ring below it are pulled away from the barrel together.
    const trigger=new Set(pts.flatMap((p,j)=>!confetti.has(j)&&p[1]<-.42?[j]:[]));
    const muzzle=f.id.startsWith('bild-')?[.05,.16]:[.18,.58];
    const start=pts.map((p,j)=>confetti.has(j)?[muzzle[0]+(p[0]-muzzle[0])*.32,muzzle[1]+(p[1]-muzzle[1])*.12,p[2],...p.slice(3)]:p);
    return {pts:start,duration:5,live:(b,j,t,o)=>{
      if(trigger.has(j)){const u=progress(t,.3,1.2);o[0]-=.08*u;o[1]-=.12*u;}
      if(confetti.has(j)){const u=progress(t,1.6,2.8);interpolate(b,pts[j],u,o);o[3]=progress(t,1.6,.5);}
    }};
  }
  return null;
}
