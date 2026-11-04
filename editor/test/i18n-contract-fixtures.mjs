import {readFileSync, readdirSync} from 'node:fs';
import path from 'node:path';
import {codecs} from 'astro-frontend-editor/runtime/extensions';
import {createFlyingStarsAdapter} from '../flyingstars-adapter.mjs';

export async function contractFixtures(root = process.cwd()) {
  const site = await createFlyingStarsAdapter(root);
  const json = file => JSON.parse(readFileSync(path.join(root, file), 'utf8'));
  const records = directory => Object.fromEntries(readdirSync(path.join(root, 'src/content', directory)).filter(file => /\.(md|json)$/.test(file)).map(file => {
    const source = site.sourceFor(`${directory === 'projects' ? 'project' : 'person'}/${file.replace(/\.[^.]+$/, '')}`);
    return [source.address.id, {file: source.file, data: codecs[source.format].parse(readFileSync(path.join(root, source.file), 'utf8'))}];
  }));
  const dependencies = {contact: json('src/content/contact.json'), showExtras: json('src/content/show-extras.json'),
    showDuration: json('src/content/show-duration.json'), projectFacts: json('src/content/project-facts.json'),
    businessFacts: json('src/content/business-facts.json'), ui: json('src/i18n/ui.json'), people: records('people'), projects: records('projects')};
  const pairs = [];
  for (const {directory, prefix, extension, format, schema} of site.types.filter(type => ['pages', 'posts', 'projects', 'faq'].includes(type.directory))) {
    for (const file of readdirSync(path.join(root, 'src/content', directory)).filter(file => file.endsWith('.' + extension))) {
      const sourceFile = `src/content/${directory}/${file}`, sourceRaw = readFileSync(path.join(root, sourceFile), 'utf8');
      const source = codecs[format].parse(sourceRaw);
      for (const locale of ['en', 'nl']) {
        const targetFile = `src/content/${directory}/${locale}/${file}`, targetRaw = readFileSync(path.join(root, targetFile), 'utf8');
        pairs.push({id: `${prefix}/${locale}/${file}`, sourceFile, targetFile, format, schema, source, target: codecs[format].parse(targetRaw), sourceRaw, locale, dependencies});
      }
    }
  }
  return {site, dependencies, pairs};
}
