// Skriptzeit des Schwarms über 8 s Stillstand an einer Stelle (Chromium, 1440 px): node tools/himmel/perf.mjs <url> <selector>
import { chromium } from '@playwright/test';
const [url, sel] = process.argv.slice(2);
const browser = await chromium.launch(); const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(url, { waitUntil: 'load' }); await page.waitForTimeout(800);
const target = await page.evaluate((s) => document.querySelector(s).getBoundingClientRect().top + scrollY - 120, sel);
let y = 0; while (y < target) { y = Math.min(target, y + 420); await page.evaluate((v) => scrollTo(0, v), y); await page.waitForTimeout(90); }
await page.waitForTimeout(4500);
const cdp = await page.context().newCDPSession(page); await cdp.send('Performance.enable');
const get = async () => Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map((m) => [m.name, m.value]));
const a = await get(); await page.waitForTimeout(8000); const b = await get();
console.log(JSON.stringify({ url, scriptMsPerS: +(((b.ScriptDuration - a.ScriptDuration) * 1000) / 8).toFixed(1), taskMsPerS: +(((b.TaskDuration - a.TaskDuration) * 1000) / 8).toFixed(1), heapMB: +(b.JSHeapUsedSize / 1e6).toFixed(1) }));
await browser.close();
