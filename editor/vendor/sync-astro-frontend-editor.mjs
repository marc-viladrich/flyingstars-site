// Copies the product modules the editor and site need until PR 11 installs astro-frontend-editor as a package.
// Usage: node editor/vendor/sync-astro-frontend-editor.mjs <product checkout>
// The copies are byte-identical; PROVENANCE.json records the product commit and a SHA-256 per file.
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const FILES=['package.json','LICENSE','NOTICE','src/markers/index.mjs','src/markers/index.d.mts','src/markers/client.mjs','src/markers/client.d.mts','src/markers/protocol.mjs','src/contract/descriptor.mjs','src/schema/spec.mjs'];
export const VENDOR=fileURLToPath(new URL('./astro-frontend-editor/',import.meta.url));
export const sha256=bytes=>createHash('sha256').update(bytes).digest('hex');

if(process.argv[1]===fileURLToPath(import.meta.url)){
 const product=path.resolve(process.argv[2]||'');
 if(!process.argv[2])throw Error('Pfad zum astro-frontend-editor-Checkout fehlt.');
 if(execFileSync('git',['-C',product,'status','--porcelain'],{encoding:'utf8'}).trim())throw Error('Der Produkt-Checkout hat uncommittete Änderungen.');
 const commit=execFileSync('git',['-C',product,'rev-parse','HEAD'],{encoding:'utf8'}).trim(),files={};
 for(const file of FILES){const bytes=await readFile(path.join(product,file));await mkdir(path.dirname(path.join(VENDOR,file)),{recursive:true});await writeFile(path.join(VENDOR,file),bytes);files[file]=sha256(bytes);}
 await writeFile(path.join(VENDOR,'PROVENANCE.json'),JSON.stringify({package:'astro-frontend-editor',commit,replacedBy:'PR 11: package dependency',files},null,1)+'\n');
 console.log(`${FILES.length} Dateien aus ${commit.slice(0,7)} übernommen.`);
}
