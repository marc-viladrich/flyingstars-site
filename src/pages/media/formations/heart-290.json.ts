import formations from '../../../scripts/pricing-formations.js';
import { selectFormationStep } from '../../../lib/formation-data.mjs';
export const prerender = true;
export function GET() {
  return new Response(JSON.stringify(selectFormationStep(formations, 290)), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
}
