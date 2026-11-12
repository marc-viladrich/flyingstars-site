import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';

export function checkPayload(report, budget) {
  const requests = report.audits['network-requests'].details.items;
  const media = requests.filter(request => request.resourceType === 'Media');
  for (const request of media) assert.equal(new URL(request.url).pathname, budget.approvedMedia.path, 'Nicht freigegebene Media-Ressource');
  const mediaBytes = media.reduce((sum, request) => sum + request.transferSize, 0);
  const nonMediaBytes = report.audits['total-byte-weight'].numericValue - mediaBytes;
  assert.ok(Number.isFinite(nonMediaBytes) && nonMediaBytes >= 0, 'Ungültiger Lighthouse-Payload');
  assert.ok(nonMediaBytes <= budget.nonMediaBytes, `Nicht-Media: ${nonMediaBytes} > ${budget.nonMediaBytes} Bytes`);
  const limit = Math.ceil(budget.approvedMedia.bytes * (1 + budget.approvedMedia.transferBuffer));
  assert.ok(mediaBytes <= limit, `Hero-Video: ${mediaBytes} > ${limit} Bytes`);
  return {nonMediaBytes, mediaBytes};
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const budget = JSON.parse(fs.readFileSync(new URL('../lighthouse-payload-budgets.json', import.meta.url)));
  const files = fs.readdirSync('.lighthouseci').filter(file => /^lhr-.*\.json$/.test(file));
  assert.ok(files.length, 'Keine Lighthouse-Berichte vorhanden');
  for (const file of files) {
    const report = JSON.parse(fs.readFileSync(path.join('.lighthouseci', file)));
    console.log(report.finalUrl, checkPayload(report, budget));
  }
}
