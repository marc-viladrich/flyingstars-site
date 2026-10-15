// One origin for Astro, canonical URLs and crawler discovery. Preview uses the editor flag.
export function robotsText(site, editor = false) {
  if (editor) return 'User-agent: *\nDisallow: /\n';
  return `User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml', site).href}\n`;
}
