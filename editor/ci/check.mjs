import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const run = promisify(execFile);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const env = {...process.env, ASTRO_TELEMETRY_DISABLED: '1', FLYINGSTARS_OFFLINE_MEDIA: '1', PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH};

// Dependencies are installed by npm ci before this entry; the offline fixture supplies the same lockfile dependencies.
for (const step of [
  ['Astro check', [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'check']],
  ['Editor- und Site-Tests', ['--test', ...await files('editor'), ...await files('editor/test'), ...await files('scripts'), 'src/schemas/editorial-source.test.mjs']],
  ['Offline-Astro-Build', [path.join(root, 'node_modules/astro/bin/astro.mjs'), 'build']],
]) {
  console.log(step[0]);
  try {const result = await run(process.execPath, step[1], {cwd: root, env, timeout: 600_000, maxBuffer: 12_000_000}); console.log(result.stdout);}
  catch (error) {console.error(error.stdout || ''); console.error(error.stderr || ''); process.exitCode = 1; break;}
}
async function files(dir) {
  return (await fs.readdir(path.join(root, dir))).filter(name => name.endsWith('.test.mjs')).map(name => dir + '/' + name);
}
