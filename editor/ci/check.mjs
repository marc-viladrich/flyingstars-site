import {spawn} from 'node:child_process';
import {once} from 'node:events';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {UNIT_ARGS} from '../../scripts/unit-contract.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const astro = path.join(root, 'node_modules/astro/bin/astro.mjs');
const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: '1',
  FLYINGSTARS_OFFLINE_MEDIA: '1',
  PATH: path.dirname(process.execPath) + path.delimiter + process.env.PATH,
};

// The top-level run includes the offline deployment test. That test runs its own CI pass without recursion.
const unitMinutes = env.FLYINGSTARS_PIPELINE_CHILD === '1' ? 25 : 45;
for (const [name, args, minutes] of [
  ['Astro check', [astro, 'check'], 5],
  ['Editor- und Site-Tests', UNIT_ARGS, unitMinutes],
  ['Offline-Astro-Build', [astro, 'build'], 5],
]) {
  console.log(name);
  try {
    const subprocess = spawn(process.execPath, args, {cwd: root, env, stdio: 'inherit', timeout: minutes * 60_000});
    const [code, signal] = await once(subprocess, 'exit');
    if (code === 0) continue;
    console.error(`${name}: ${signal ?? `Exitcode ${code}`} (Zeitlimit ${minutes} min)`);
  } catch (error) {
    console.error(error);
  }
  process.exitCode = 1;
  break;
}
