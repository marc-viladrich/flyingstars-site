// One worker protocol for app and adapter. Nonfinal retarget points never leave the worker.
export function converterWorker(convert, post, now = () => performance.now()) {
  let last = null;
  return ({ data: { id, image, opts, retarget } }) => {
    const started = now();
    try {
      if (retarget != null) {
        const q = last?.retarget?.(retarget);
        if (q?.final !== true) { post({ id, final: false }); return; }
        const meta = {
          ...last.meta, n: q.points.length, density: q.density, lineDensity: q.density,
          budget: { max: retarget, wanted: q.wanted ?? q.points.length, over: q.over === true || q.points.length > retarget },
        };
        post({ id, final: true, result: { ...last, points: q.points, spacing: q.spacing || last.spacing, meta }, ms: now() - started });
        return;
      }
      last = convert(image, opts);
      post({ id, result: last, ms: now() - started });
    } catch (error) { post({ id, error: String(error?.message || error) }); }
  };
}
