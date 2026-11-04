import test from 'node:test';
import assert from 'node:assert/strict';
import data from '../src/content/contact.json' with {type:'json'};
import {contactSchema} from '../src/schemas/contact.mjs';
import {projectContact,contactText,legalContactDrift} from '../src/content/contact.mjs';
import {legalDocuments} from './check-contact-drift.mjs';
test('Eine Nummer besitzt Anzeige, Telefonlink und WhatsApp; Mail-Platzhalter und Rechtsdrift folgen derselben Quelle',()=>{
 assert.ok(contactSchema.safeParse(data).success);
 assert.deepEqual(legalContactDrift(legalDocuments()),[]);
 const changed=projectContact(contactSchema.parse({...data,phone:'0209 999 12 34',mobile:'01579 999 12 34',email:'probe@example.org',post:['FlyingStars GmbH','Teststraße 7','45888 Gelsenkirchen']}));
 assert.equal(changed.phone.href,'tel:+492099991234');
 assert.equal(changed.whatsapp.href,'https://wa.me/4915799991234');
 assert.equal(contactText('{{contact.email}} {{contact.phone.label}} {{contact.phone.href}}',changed),'probe@example.org 0209 999 12 34 tel:+492099991234');
 const drift=legalContactDrift(legalDocuments(),changed);
 assert.equal(drift.filter(f=>f.fact==='email').length,6);
 assert.equal(drift.filter(f=>f.fact==='post.1').length,6);
 assert.throws(()=>contactText('{{contact.unknown}}'));
 assert.ok(!contactSchema.safeParse({...data,phone:'tel:123'}).success);
});
