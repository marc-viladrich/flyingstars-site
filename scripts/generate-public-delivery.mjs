import {writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {deliveryRedirects,htaccessText} from './lib/public-delivery.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
await writeFile(new URL('../public/.htaccess',import.meta.url),htaccessText(await deliveryRedirects(root)));
console.log('public/.htaccess generated from the legacy inventory and current project routes.');
