/** Reserve the scrollstory's final layout before its optional canvas engine loads. */
export function prepareEcoScrolly(element) {
  const facts = [...element.querySelectorAll('.fact')];
  element.style.setProperty('--steps', String(facts.length));
  if (!element.classList.contains('is-scrolly')) facts[0]?.classList.add('on');
  element.classList.add('is-scrolly');
}

export function resetEcoScrolly(element) {
  element.classList.remove('is-scrolly');
  element.style.removeProperty('--steps');
}
