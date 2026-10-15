import {extensions} from './site-adapter.mjs';
export const inlineText=tree=>extensions.inlineCodec.fromDOM(tree);
export const inlineSupported=tree=>extensions.inlineCodec.supportsDOM(tree);
export const inlineHtml=text=>extensions.inlineCodec.html(text);
export const inlinePlain=text=>extensions.inlineCodec.plainText(text);
