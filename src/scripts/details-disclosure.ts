// WebKit unterstützt ::details-content, lässt beim Schließen aber die Höhe des nativen
// Details-Inhalts sofort wegfallen. Dort bleibt das Element bis zum Ende der Animation offen.
if (!CSS.supports('interpolate-size', 'allow-keywords')) {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let timing: KeyframeAnimationOptions | undefined;
  const options = () => {
    if (timing) return timing;
    const root = getComputedStyle(document.documentElement);
    const duration = root.getPropertyValue('--dur-disclose').trim();
    return (timing = {
      duration: parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000),
      easing: root.getPropertyValue('--ease-glide').trim(),
    });
  };
  const running = new Map<HTMLDetailsElement, Animation>();
  const still = () => reduced.matches || document.documentElement.classList.contains('motion-paused');
  const finishWhenPaused = () => { if (still()) for (const animation of running.values()) animation.finish(); };
  reduced.addEventListener('change', finishWhenPaused);
  document.addEventListener('flyingstars:motion-change', finishWhenPaused);

  for (const details of document.querySelectorAll<HTMLDetailsElement>('details[data-disclosure]')) {
    const summary = details.querySelector(':scope > summary');
    const panel = details.querySelector<HTMLElement>(':scope > [data-disclosure-panel]');
    const content = panel?.querySelector<HTMLElement>('[data-disclosure-content]');
    if (!summary || !panel || !content) continue;
    summary.addEventListener('click', (event) => {
      if (still()) return;
      event.preventDefault();
      const previous = running.get(details);
      const closing = details.open && !details.hasAttribute('data-closing');
      const from = details.open ? panel.getBoundingClientRect().height : 0;
      const opacity = previous ? getComputedStyle(panel).opacity : (details.open ? 1 : 0);
      const timing = options();
      previous?.cancel();
      details.open = true;
      const to = closing ? 0 : content.getBoundingClientRect().height;

      details.toggleAttribute('data-closing', closing);
      panel.style.overflow = 'clip';
      const animation = panel.animate([
        { height: `${from}px`, opacity },
        { height: `${to}px`, opacity: closing ? 0 : 1 },
      ], timing);
      running.set(details, animation);
      animation.onfinish = () => {
        if (running.get(details) !== animation) return;
        running.delete(details);
        details.open = !closing;
        details.removeAttribute('data-closing');
        panel.style.overflow = '';
      };
    });
  }
}
