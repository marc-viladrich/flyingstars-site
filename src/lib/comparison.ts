/** Dieselbe Zelle für Tabellen und mobile Tafeln. Redaktionelle Wertungen behalten ihre Texte. */
export type ComparisonValue = string | boolean | null | { label: string; text?: string; tone: 'y' | 'n' | 'p' };
export function comparisonTone(value: ComparisonValue): 'yes' | 'no' | 'partial' | 'value' {
  if (value === true) return 'yes';
  if (value === false || value === null) return 'no';
  if (typeof value === 'object') return { y: 'yes', n: 'no', p: 'partial' }[value.tone] as 'yes' | 'no' | 'partial';
  return 'value';
}
export const comparisonIcon = (tone: string) => ({ yes: 'check', no: 'x', partial: 'circle-help' }[tone]);
