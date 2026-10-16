import {promises as fs} from 'node:fs';
import path from 'node:path';
// Explicit content-format migrations, run on a working tree (the person or CI commits the result). Each plans
// every file it writes or deletes first (dry run); applying is idempotent: a second plan after applying is empty.
// A site's extensions bring the migrations of the formats they own ({id, description, plan({root, site})}).
export const migrationsOf=site=>(site.extensions?.collect?.('migrations')??[]).flat();

export async function planMigrations({root,site}){
 const out=[];
 for(const migration of migrationsOf(site)){const changes=await migration.plan({root,site});if(changes.length)out.push({id:migration.id,description:migration.description,changes});}
 return out;
}

export async function applyMigrations({root,plans}){
 for(const {changes} of plans)for(const {file,after} of changes){
  const target=path.join(root,file);
  if(after===null){await fs.rm(target,{force:true});await removeEmpty(path.dirname(target),root);}
  else{await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,after);}
 }
}
async function removeEmpty(dir,root){
 while(dir.startsWith(path.join(root,'src/content'))&&dir!==path.join(root,'src/content')&&!(await fs.readdir(dir).catch(()=>['x'])).length){await fs.rmdir(dir);dir=path.dirname(dir);}
}
