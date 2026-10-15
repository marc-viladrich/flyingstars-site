#!/usr/bin/env node
// Translate missing or changed texts into EN/NL and commit them as unreviewed translations.
// Usage: node relaunch/translate-missing.mjs --locale en [--records record/id] [--provider mymemory]
//        [--all] [--max-chars 3000] [--budget-chars 30000] [--dry-run]
// The same core runs behind the editor's "Fehlende Texte übersetzen" action. In CI it would run after a push.
import path from "node:path";
import { randomUUID } from "node:crypto";
import { NativeStore } from "./native-store.mjs";
import { createTranslationCore, executeBatched, loadMemory, saveMemory } from "./translation-core.mjs";
import { translationProvider } from "./translation-providers.mjs";

import {resolveRuntimeOptions} from './runtime-options.mjs';
import {createFlyingStarsAdapter} from './flyingstars-adapter.mjs';
const args = Object.fromEntries(process.argv.slice(2).map((a, i, all) => (a.startsWith("--") ? [a.slice(2), all[i + 1]?.startsWith("--") || all[i + 1] === undefined ? true : all[i + 1]] : null)).filter(Boolean));
const locale = args.locale || "en";

if (args.all && args.records) throw Error("--all und --records schließen sich aus.");
const runtime=resolveRuntimeOptions({values:{siteRoot:typeof args.source==='string'?args.source:args['site-root'],stateDir:args['state-dir'],translationProvider:args.provider}});
const site=await createFlyingStarsAdapter(runtime.siteRoot);
const languages=site.extensions.require('languages');
if(!Object.hasOwn(languages.locales,locale))throw Error('Sprachziel muss '+Object.keys(languages.locales).join(' oder ')+' sein.');
const {plan,mergeIntoTranslations}=createTranslationCore(site);
const store = await new NativeStore(runtime.siteRoot,{runtime,site}).init();
const state = await store.state();
const memoryFile = typeof args['memory-file']==='string'?path.resolve(args['memory-file']):path.join(runtime.stateDir, "translation-memory.json");
const memory = await loadMemory(memoryFile);
const ids = typeof args.records === "string" ? args.records.split(",") : undefined;
// --all explicitly selects all owners; the historical no-filter invocation remains compatible.
const planned = plan({ records: state.records, locale, memory, ids });
console.log(JSON.stringify({ locale, fields: planned.jobs.length, freshFields: planned.freshFields, segmentsToSend: planned.toSend.length, charsToSend: planned.chars, charsFromMemory: planned.cachedChars, fieldChars: planned.fieldChars }, null, 1));
if (args["dry-run"] || !planned.jobs.length) process.exit(0);
const provider = translationProvider(runtime.translation.provider,{...runtime.translation,key:runtime.translation.provider==='deepl'?runtime.translation.deeplKey:runtime.translation.key});
if (!provider) throw Error("Kein Übersetzungsanbieter konfiguriert (EDITOR_TRANSLATION_PROVIDER).");
const { values, billed, failedSegments, skippedFields, errors, batches, budgetExhausted, remainingSegments } = await executeBatched(planned, provider, { memory, maxChars: Number(args["max-chars"] || 3000), budgetChars: Number(args["budget-chars"] || 30000), onBatch: () => saveMemory(memoryFile,memory) });
await saveMemory(memoryFile, memory);
if (args.print) {
  // Show the result without committing anything (spot checks).
  for (const [owner, { entries }] of values) for (const entry of entries) console.log(owner, entry.path.join("."), "→", entry.text);
  console.log(JSON.stringify({ provider: provider.id, billedCharacters: billed, failedSegments, skippedFields, errors }));
  process.exit(0);
}
const merged = mergeIntoTranslations({ records: state.records, locale, values });
// NativeStore accepts at most 50 records in one atomic request. Persist larger locales in groups.
let saved=state;
for(let offset=0;offset<merged.length;offset+=50) {
 const batch=merged.slice(offset,offset+50);
 saved=await store.save({
  expectedHead:saved.head,requestId:randomUUID(),
  changes:batch.filter(m=>!m.create).map(m=>({id:m.id,expectedRevision:m.expectedRevision,patches:[{path:[],value:m.data}]})),
  creates:batch.filter(m=>m.create).map(m=>({id:m.id,data:m.data})),deletes:[],
 });
}
console.log(JSON.stringify({provider:provider.id,billedCharacters:billed,batches,budgetExhausted,remainingSegments,failedSegments,skippedFields,errors,translationRecords:merged.map(m=>m.id),head:saved.head},null,1));
