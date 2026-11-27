/** @param {string} href */
export function youtubeId(href) {
  const url = URL.parse(href.replace(/&amp;/g, '&'));
  if (!url || !['https:', 'http:'].includes(url.protocol)) return;
  const [, first, second] = url.pathname.split('/');
  let id;
  if (url.hostname === 'youtu.be') id = first;
  else if (['youtube.com', 'www.youtube.com', 'm.youtube.com'].includes(url.hostname)) {
    id = first === 'watch' ? url.searchParams.get('v') : ['shorts', 'live', 'embed'].includes(first) ? second : undefined;
  }
  return id && /^[a-z0-9_-]{11}$/i.test(id) ? id : undefined;
}

const linkOrHeading = /<h[2-6]\b[^>]*>|<p>\s*<a\b([^>]*\bhref="([^"]+)"[^>]*)>((?:(?!<\/?a\b|<\/?p\b)[\s\S])+)<\/a>\s*<\/p>/g;
const contact = /^\/(?:en\/|nl\/)?kontakt\/?(?:[?#].*)?$/;

/** @param {string} html @param {(id: string) => boolean} hasThumbnail */
export function renderPostLinks(html, hasThumbnail) {
  /** @type {string | undefined} */
  let headingId;
  let index = 0;
  return html.replace(linkOrHeading, (tag, attributes, href, label) => {
    if (!href) {
      headingId = /\sid="([^"]+)"/.exec(tag)?.[1];
      return tag;
    }
    // Retain linked illustrations and pre-styled HTML links.
    if (/<img\b/i.test(label) || /\bclass=/.test(attributes)) return tag;
    const id = youtubeId(href);
    if (!id || !hasThumbnail(id)) {
      return `<p><a${attributes} class="btn${contact.test(href) ? ' primary' : ''}">${label}</a></p>`;
    }
    const labelId = `post-video-${++index}`;
    const labelledBy = headingId ? ` aria-labelledby="${labelId} ${headingId}"` : '';
    return `<p><a${attributes} class="post-media-link"${labelledBy}>
      <img src="/media/blog/youtube/${id}.webp" width="480" height="270" alt="" loading="lazy" decoding="async">
      <span class="btn" id="${labelId}"><span class="post-media-play" aria-hidden="true"></span>${label}</span>
    </a></p>`;
  });
}

/** @param {string} html */
export function formationPosition(html) {
  const brandedHeading = /<h2\b[^>]*>(?:Drohnenshows von Flying\s?Stars|Droneshows van Flying\s?Stars|Drone shows by Flying\s?Stars|FlyingStars [–—] Experts in Drone Light Shows)<\/h2>/gi;
  return [...html.matchAll(brandedHeading)].at(-1)?.index;
}
