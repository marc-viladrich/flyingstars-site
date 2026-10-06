import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export function forbiddenAgentPaths(paths) {
  return paths.filter((path) => !(
    path.startsWith('src/content/') ||
    path.startsWith('src/components/sections/') ||
    path === 'src/styles/global.css' ||
    path === 'src/site.config.ts'
  ));
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [base, head] = process.argv.slice(2);
  if (!base || !head) {
    console.error('Usage: check-agent-diff.mjs <base> <head>');
    process.exit(2);
  }
  const result = spawnSync('git', ['diff', '--no-renames', '--name-only', '-z', `${base}...${head}`], { encoding: 'utf8' });
  if (result.status !== 0) {
    console.error(result.stderr);
    process.exit(result.status ?? 1);
  }
  const forbidden = forbiddenAgentPaths(result.stdout.split('\0').filter(Boolean));
  if (forbidden.length) {
    console.error(`Agent-Diff enthält nicht freigegebene Dateipfade:\n${forbidden.join('\n')}`);
    process.exit(1);
  }
  console.log('Agent-Diff enthält ausschließlich freigegebene Dateipfade.');
}
