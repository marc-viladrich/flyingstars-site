import test from 'node:test';
import assert from 'node:assert/strict';
import { joinLastWords, noOrphans } from '../src/lib/no-orphans.ts';

test('verbindet die letzten zwei Wörter', () => {
  assert.equal(joinLastWords('Wir sagen euch, was möglich ist.'), 'Wir sagen euch, was möglich&nbsp;ist.');
});
test('über Tags hinweg, Tags bleiben ganz', () => {
  assert.equal(joinLastWords('Mehr dazu <a href="/x/">hier lesen</a>'), 'Mehr dazu <a href="/x/">hier&nbsp;lesen</a>');
  assert.equal(joinLastWords('Text mit <b>Fett</b>'), 'Text mit&nbsp;<b>Fett</b>');
});
test('lange Wortpaare bleiben trennbar', () => {
  assert.equal(joinLastWords('Die Umsatzsteuer-Identifikationsnummer DE346644500'), 'Die Umsatzsteuer-Identifikationsnummer DE346644500');
  assert.equal(joinLastWords('Bis 2026 Hochzeitsfeierlichkeiten'), 'Bis 2026 Hochzeitsfeierlichkeiten');
});
test('einzelnes Wort bleibt unverändert', () => {
  assert.equal(joinLastWords('Hallo'), 'Hallo');
  assert.equal(joinLastWords('  Hallo  '), '  Hallo  ');
});
test('Zeilenumbruch im Quelltext wird zu einem geschützten Leerzeichen', () => {
  assert.equal(joinLastWords('eins zwei\n      drei'), 'eins zwei&nbsp;drei');
});
test('Seiten: nur Textblöcke ohne Unterblöcke, keine Skripte', () => {
  const html = '<h2>Große Überschrift hier</h2><dd>Stadion De Geusselt, Maastricht</dd><p class="a">Ein kurzer Satz hier.</p><ul><li>Erster Punkt hier</li></ul><li><p>innen</p></li><p>Zeile<br>neue Zeile da</p><p data-orphans="keep">so lassen bitte</p><script>const p = "<p>nicht anfassen</p>";</script>';
  const out = noOrphans(html);
  assert.match(out, /<h2>Große Überschrift hier<\/h2><dd>Stadion De Geusselt, Maastricht<\/dd>/);
  assert.match(out, /<p class="a">Ein kurzer Satz&nbsp;hier\.<\/p>/);
  assert.match(out, /<li>Erster Punkt&nbsp;hier<\/li>/);
  assert.match(out, /Zeile<br>neue Zeile da/);
  assert.match(out, /so lassen bitte/);
  assert.match(out, /<script>const p = "<p>nicht anfassen<\/p>";<\/script>/);
});

test('EN und NL: letzte Wörter werden sprachunabhängig verbunden, lange Paare bleiben trennbar', () => {
  assert.equal(noOrphans('<p>We plan your show together.</p>'), '<p>We plan your show&nbsp;together.</p>');
  assert.equal(noOrphans('<p>We plannen de show met jullie.</p>'), '<p>We plannen de show met&nbsp;jullie.</p>');
  for (const text of ['An internationalisation implementation', 'Een aansprakelijkheidsverzekering afsluiten']) {
    assert.equal(joinLastWords(text), text);
  }
});

test('Absätze in Listenpunkten (Teamkarten) werden verbunden', () => {
  const out = noOrphans('<ul><li class="m"><span>Rolle</span><h3>Name</h3><p>Sorgt dafür, dass eure Show fliegen darf. Auch auf Englisch.</p></li></ul>');
  assert.match(out, /<p>Sorgt dafür, dass eure Show fliegen darf\. Auch auf&nbsp;Englisch\.<\/p><\/li>/);
});
test('lange Schlusswörter bis 22 Zeichen und Bindestriche im letzten Wort', () => {
  assert.equal(joinLastWords('automatisch ein Sicherheitsprotokoll.'), 'automatisch ein&nbsp;Sicherheitsprotokoll.');
  assert.equal(joinLastWords('mit dem elektrischen Ford E-Transit.'), 'mit dem elektrischen Ford&nbsp;E-&#8288;Transit.');
  assert.equal(joinLastWords('ein Pre-Check und Follow-up'), 'ein Pre-Check und&nbsp;Follow-&#8288;up');
});
