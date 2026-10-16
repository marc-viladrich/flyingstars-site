// Content-format migrations: `node editor/migrate.mjs` shows what would change, `--apply` changes the working
// tree. Commit the result; running it again afterwards changes nothing.
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
import {applyMigrations,planMigrations} from './migrations/index.mjs';

const args=process.argv.slice(2),apply=args.includes('--apply'),rootArg=args[args.indexOf('--site-root')+1];
const root=path.resolve(args.includes('--site-root')?rootArg:fileURLToPath(new URL('../',import.meta.url)));
const site=await createFlyingStarsAdapter(root);
const plans=await planMigrations({root,site});
if(!plans.length){console.log('Alle Inhalte sind im aktuellen Format. Nichts zu tun.');process.exit(0);}
for(const {id,description,changes} of plans){
 const moved=changes.filter(change=>change.after===null).length,written=changes.filter(change=>change.after!==null).length;
 console.log(`${id}: ${description}\n  ${written} Dateien schreiben, ${moved} alte Dateien entfernen`);
 if(args.includes('--diff'))for(const change of changes)console.log(`  ${change.after===null?'−':change.before===null?'+':'~'} ${change.file}`);
}
if(!apply){console.log('\nProbelauf. Mit --apply ausführen, mit --diff jede Datei zeigen.');process.exit(0);}
await applyMigrations({root,plans});
const again=await planMigrations({root,site});
console.log(again.length?`\nNach dem Anwenden noch offen: ${again.map(plan=>plan.id).join(', ')}`:'\nAngewendet. Ein zweiter Lauf ist leer.');
process.exitCode=again.length?1:0;
