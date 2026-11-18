// Gleitende Hover-Fläche im Icon-Raster (.ig, Marc 18.11.2026: „the same type of snapping that we have in the header
// navigation dropdowns – very smooth and satisfying“). Eine Fläche je Raster (.ig::before in global.css) gleitet per
// transform von Zelle zu Zelle; dieselben Kurven wie die gleitende Box der Navigation. Zeilen dürfen verschieden hoch
// sein, deshalb kommt die Lage aus den Zellmaßen (JS) statt aus CSS-Indizes; so läuft es in Safari 18 ohne Anchor
// Positioning genauso wie in Chromium. Erster Eintritt: die Fläche erscheint an Ort und Stelle (kein Flug aus der Ecke),
// danach gleitet sie; beim Verlassen blendet sie an ihrer Stelle aus. Maus/Stift und Tastaturfokus, kein Touch.
const cellOf = (grid: HTMLElement, target: EventTarget | null) => {
  const cell = target instanceof Element ? target.closest<HTMLElement>('.ic') : null;
  return cell?.parentElement === grid ? cell : null;
};

function glide(grid: HTMLElement) {
  let active: HTMLElement | null = null;
  let base = { w: 0, h: 0 };
  const set = (name: string, value: string) => grid.style.setProperty(name, value);
  const place = (cell: HTMLElement) => {
    const snap = !grid.classList.contains('ig-on');
    if (cell === active && !snap) return;
    active = cell;
    if (snap || !base.w) {
      base = { w: cell.offsetWidth, h: cell.offsetHeight };
      set('--ig-w0', `${base.w}px`); set('--ig-h0', `${base.h}px`);
    }
    set('--ig-x', `${cell.offsetLeft}px`); set('--ig-y', `${cell.offsetTop}px`);
    set('--ig-sx', String(cell.offsetWidth / base.w)); set('--ig-sy', String(cell.offsetHeight / base.h));
    if (snap) {
      grid.classList.add('ig-snap', 'ig-on');
      requestAnimationFrame(() => requestAnimationFrame(() => grid.classList.remove('ig-snap')));
    }
  };
  const hide = () => grid.classList.remove('ig-on');
  const keyboard = () => grid.contains(document.activeElement) && document.activeElement!.matches(':focus-visible');
  grid.addEventListener('pointerover', (e) => { if (e.pointerType !== 'touch') { const c = cellOf(grid, e.target); if (c) place(c); } });
  grid.addEventListener('pointerleave', (e) => { if (e.pointerType !== 'touch' && !keyboard()) hide(); });
  grid.addEventListener('focusin', (e) => { const c = cellOf(grid, e.target); if (c && (e.target as Element).matches(':focus-visible')) place(c); });
  grid.addEventListener('focusout', (e) => { if (!grid.contains(e.relatedTarget as Node)) hide(); });
  // Breite oder Umbruch geändert: Fläche ohne Flug an die neue Lage der aktiven Zelle
  new ResizeObserver(() => { if (active && grid.classList.contains('ig-on')) { grid.classList.remove('ig-on'); place(active); } }).observe(grid);
}

export function initGridGlide() {
  document.querySelectorAll<HTMLElement>('.ig:not([data-glide])').forEach((grid) => { grid.dataset.glide = ''; glide(grid); });
}
