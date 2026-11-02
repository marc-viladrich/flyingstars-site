export const robotsText=(origin,editor=false)=>editor?'User-agent: *\nDisallow: /\n':`User-agent: *\nAllow: /\nSitemap: ${new URL('/sitemap-index.xml',origin)}\n`;
