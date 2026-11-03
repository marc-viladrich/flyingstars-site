/** Project one step from the canonical formation dataset, including only its referenced parts. */
export function selectFormationStep(data, count) {
  const step = data.steps[count];
  if (!step) throw new Error(`Formation step missing: ${count}`);
  const keys = [...new Set(step.refs.map(([key]) => key))];
  for (const key of keys) if (!data.parts[key]) throw new Error(`Formation part missing: ${key}`);
  return { parts: Object.fromEntries(keys.map(key => [key, data.parts[key]])), steps: { [count]: step } };
}
