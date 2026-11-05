import postcss from 'postcss';

// Known first-viewport primitives, including their interactive/reduced-motion states.
// Owner CSS (hero/frame) is provided separately; all rules retain original cascade order.
const earlyClass = /\.(?:nav(?:-drop|-sentinel)?|logo|menu-btn|menu-close|mobile-menu|motion-btn|language-switch|glide-list|glide-mark|skip|sr-only|mono|kicker|lead|grad|ico|btn|hover-line|actions|video-player|fact-list|dot-cv|dot-pending|table-wrap)(?![\w-])/;
// Exclude lower-page owners, but never mistake a class inside :not() for the owner.
const laterOwner = /(?:^|[> +~])\.(?:footer|logo-marquee|member|ruler|metro|todo-note)(?![\w-])/;
const elementPrimitive = /^(?:\*|html\b|body\b|img\b|video\b|a(?:\b|:)|h[1-6]\b|p\b|button:focus|summary:focus|input:focus|select:focus|textarea:focus|:is\(h[4-6])/;
function isEarlySelector(selector) {
  if (laterOwner.test(selector)) return false;
  // The next section's padding keeps its unstyled children outside the first viewport.
  return selector === '.section' || selector === '[data-dot-img]' || earlyClass.test(selector) ||
    (elementPrimitive.test(selector) && !selector.includes('.')) ||
    /^(?:html|body)\b/.test(selector) || /^\[hidden\]/.test(selector);
}
const variables = value => [...value.matchAll(/var\(\s*(--[\w-]+)/g)].map(m => m[1]);

/** Derive a bounded critical subset from already processed CSS, never a second stylesheet source. */
export function criticalShell(css, ownerCss = []) {
  const root = postcss.parse(css), definitions = new Map();
  root.walkRules(':root', rule => rule.walkDecls(decl => {
    const values = definitions.get(decl.prop) ?? [];
    values.push(decl.value); definitions.set(decl.prop, values);
  }));
  root.walkRules(rule => {
    if (rule.selector === ':root' || rule.parent.type === 'atrule' && /keyframes$/.test(rule.parent.name)) return;
    const selectors = postcss.list.comma(rule.selector).filter(isEarlySelector);
    if (!selectors.length) rule.remove(); else rule.selector = selectors.join(',');
  });
  const needed = new Set(ownerCss.flatMap(variables));
  root.walkDecls(decl => {
    if (decl.parent.type === 'rule' && decl.parent.selector === ':root' && decl.prop.startsWith('--')) return;
    variables(decl.value).forEach(name => needed.add(name));
  });
  // Transitively include aliases/fallbacks. Keep all definitions of a selected token in cascade order.
  for (const name of needed) for (const value of definitions.get(name) ?? []) variables(value).forEach(dep => needed.add(dep));
  root.walkRules(':root', rule => rule.walkDecls(decl => { if (decl.prop.startsWith('--') && !needed.has(decl.prop)) decl.remove(); }));
  // Prune from the leaves so emptied token rules cannot leave empty media/support wrappers.
  function prune(node) {
    node.nodes?.slice().forEach(prune);
    if (node !== root && node.nodes && !node.nodes.length) node.remove();
  }
  prune(root);
  const result = root.toString();
  if (Buffer.byteLength(result) > 16 * 1024) throw Error(`Critical shell exceeds 16 KiB (${Buffer.byteLength(result)} B); reduce its scope, not the budget.`);
  return result;
}
