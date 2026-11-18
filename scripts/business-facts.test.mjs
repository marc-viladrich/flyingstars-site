import test from 'node:test';import assert from 'node:assert/strict';
import {BUSINESS_FACTS,businessValue,roundedShowsAllowed} from '../src/content/business-facts.mjs';
import {businessFactsSchema} from '../src/schemas/business-facts.mjs';
import {businessDrift,businessDocuments} from './check-business-drift.mjs';
test('Geschäftsfakten tragen Geltungsbereich und Stand; strukturierte Referenzen folgen Änderungen',()=>{
 assert.ok(businessFactsSchema.safeParse(BUSINESS_FACTS).success);
 assert.equal(businessValue({fact:'responseHours',display:'hours'}),'48 h');
 assert.equal(businessValue({fact:'responseHours',display:'hours'},'de',{responseHours:{value:36}}),'36 h');
 assert.ok(roundedShowsAllowed(150));assert.ok(!roundedShowsAllowed(178));
});
test('Prosa-Driftbericht erfasst alle aktuellen Blätter und meldet zentrale sowie lokale Wertänderungen',()=>{
 const docs=businessDocuments(),result=businessDrift(docs);assert.deepEqual(result.drift,[]);assert.ok(result.checked.length>50);
 // Ohne Fließtext-Verwendung kann nichts abweichen. Diese Menge ist ausdrücklich: die Flughöhe steht seit Moritz' Texten
 // (Runde 4, 15.11.2026) in keinem Text mehr; kehrt sie zurück, prüft der Wächter sie wieder.
 const used=new Set(result.checked.map(d=>d.fact));
 assert.deepEqual(Object.keys(BUSINESS_FACTS).filter(fact=>!used.has(fact)),['maxAltitudeMetres']);
 for(const fact of Object.keys(BUSINESS_FACTS).filter(fact=>used.has(fact))){
  const changed=structuredClone(BUSINESS_FACTS);changed[fact].value++;
  assert.ok(businessDrift(docs,changed).drift.some(d=>d.fact===fact),fact);
 }
 assert.equal(businessDrift([{file:'new.yaml',path:['text'],text:'Wir antworten innerhalb von 49 Stunden.'}]).drift.length,1);
 // Gewicht nach Geltungsbereich: Outdoor-Drohne (rund 300 g) und Indoor-Obergrenze (unter 200 g) sind getrennte Fakten
 const weight=(file,text)=>businessDrift([{file,path:['text'],text}]).drift.map(d=>d.fact);
 assert.deepEqual(weight('src/content/pages/drohnenshow-indoor.yaml','Die Drohnen wiegen unter 200 Gramm.'),[]);
 assert.deepEqual(weight('src/content/pages/nachhaltigkeit.yaml','Unsere Drohnen wiegen rund 300 Gramm.'),[]);
 assert.deepEqual(weight('src/content/pages/nachhaltigkeit.yaml','Unsere Drohnen wiegen 200 Gramm.'),['droneWeightGrams']);
 assert.deepEqual(weight('src/content/pages/drohnenshow-indoor.yaml','Die Drohnen wiegen 300 Gramm.'),['indoorDroneWeightMaxGrams']);
 assert.deepEqual(weight('src/content/faq/funktion.md','Indoor-Drohnen wiegen 300 Gramm.'),['indoorDroneWeightMaxGrams']);
});

import {factText} from '../src/content/show-extras.mjs';
test('Unbekannte Faktenplatzhalter brechen die Projektion ab',()=>{
 for(const token of ['{{unknown.value}}','{{contact.constructor}}','{{project.constructor.name}}','{{project.puma-bundesliga.constructor}}','{{project.puma-bundesliga.drones.unknown}}','{{duration.outdoor.missing}}','{{offer.indoor.missing}}'])assert.throws(()=>factText(token),/Unbekannt/);
});
