#!/usr/bin/env node
// Deterministischer Intake: Issue-Form-Body → Content-Datei. Kein LLM.
// Aufruf: node scripts/issue-to-content.mjs <typ> <issue-nummer> < body.md
// typ ∈ blogpost | projekt | faq. Schreibt die Datei, gibt den Pfad auf stdout aus.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { parseIssueForm, slugify, yamlString, listFromCsv } from './lib/parse-issue-form.mjs';

const [type, issueArg] = process.argv.slice(2);
const issue = Number(issueArg);
if (!['blogpost', 'projekt', 'faq'].includes(type) || !Number.isInteger(issue)) {
  console.error('Usage: issue-to-content.mjs <blogpost|projekt|faq> <issue-nummer> < body.md');
  process.exit(2);
}
const body = readFileSync(0, 'utf8');
const today = new Date().toISOString().slice(0, 10);

const LABELS = {
  Titel: 'title', Beschreibung: 'description', Datum: 'date', Schlagworte: 'tags', Text: 'body',
  Kunde: 'client', Ort: 'location', Kurzbeschreibung: 'summary', Hervorheben: 'featured',
  Frage: 'question', Antwort: 'answer', Reihenfolge: 'order', Bild: 'image',
};
const f = parseIssueForm(body, LABELS);
const fail = (msg) => { console.error(`Validierung fehlgeschlagen: ${msg}`); process.exit(1); };

let dir, file, content;
if (type === 'blogpost') {
  if (!f.title) fail('Titel fehlt');
  if (!f.description || f.description.length < 50 || f.description.length > 160) fail('Beschreibung muss 50 bis 160 Zeichen haben');
  if (!f.body) fail('Text fehlt');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(f.date ?? '') ? f.date : today;
  dir = 'src/content/posts';
  file = `${dir}/${date}-${slugify(f.title)}.md`;
  content = `---\ntitle: ${yamlString(f.title)}\ndescription: ${yamlString(f.description)}\ndate: ${date}\ntags: [${listFromCsv(f.tags ?? '').map(yamlString).join(', ')}]\ndraft: false\nsourceIssue: ${issue}\n---\n\n${f.body}\n`;
} else if (type === 'projekt') {
  if (!f.title) fail('Titel fehlt');
  if (!f.summary || f.summary.length < 30 || f.summary.length > 200) fail('Kurzbeschreibung muss 30 bis 200 Zeichen haben');
  const date = /^\d{4}-\d{2}-\d{2}$/.test(f.date ?? '') ? f.date : today;
  dir = 'src/content/projects';
  file = `${dir}/${slugify(f.title)}.md`;
  const featured = /\[x\]/i.test(f.featured ?? '');
  content = `---\ntitle: ${yamlString(f.title)}\n${f.client ? `client: ${yamlString(f.client)}\n` : ''}date: ${date}\n${f.location ? `location: ${yamlString(f.location)}\n` : ''}summary: ${yamlString(f.summary)}\nfeatured: ${featured}\ndraft: false\nsourceIssue: ${issue}\n---\n\n${f.body ?? ''}\n`;
} else {
  if (!f.question || f.question.length < 5) fail('Frage fehlt');
  if (!f.answer) fail('Antwort fehlt');
  dir = 'src/content/faq';
  file = `${dir}/${slugify(f.question)}.md`;
  const order = Number.isInteger(Number(f.order)) && f.order !== '' ? Number(f.order) : 100;
  content = `---\nquestion: ${yamlString(f.question)}\ntags: [${listFromCsv(f.tags ?? '').map(yamlString).join(', ')}]\norder: ${order}\ndraft: false\nsourceIssue: ${issue}\n---\n\n${f.answer}\n`;
}

if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
if (existsSync(file)) fail(`Datei existiert bereits: ${file}. Titel ändern oder bestehende Datei bearbeiten.`);
writeFileSync(file, content);
console.log(file);
