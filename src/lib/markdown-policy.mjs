import {marked} from 'marked';
import {localizedHref} from './localized-routes.mjs';
const safeHref = href => {
  if (/[\u0000-\u0020\u007f]/.test(href) || href.startsWith('//')) return false;
  return /^(?:https?:\/\/|\/(?!\/)|#|mailto:|tel:|\.\.?\/)/i.test(href);
};
export function validateMarkdown(text) {
  marked.walkTokens(marked.lexer(text),token => {
    if (token.type === 'html') throw new Error('Markdown darf keinen eingebetteten HTML- oder Skriptcode enthalten.');
    if (['link','image'].includes(token.type) && !safeHref(token.href)) throw new Error('Dieser Markdown-Link ist nicht erlaubt.');
    if (token.type === 'image') {
      const url = new URL(token.href,'https://flyingstars.art');
      if (!(token.href.startsWith('/assets/') || url.protocol === 'https:' && ['flyingstars.art','flyingstars-relaunch.vercel.app',process.env.MEDIA_HOST].includes(url.hostname))) throw new Error('Markdown-Bilder müssen aus dem freigegebenen Medienspeicher kommen.');
    }
  });
  return text;
}
export const markdownHtml = (text,locale='de') => marked.parse(validateMarkdown(text),{walkTokens:token=>{if(token.type==='link')token.href=localizedHref(token.href,locale);}});
