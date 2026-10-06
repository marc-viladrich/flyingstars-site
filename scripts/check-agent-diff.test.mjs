import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { forbiddenAgentPaths } from './check-agent-diff.mjs';

test('normale Inhalts- und Gestaltungsänderungen sind erlaubt', () => {
  assert.deepEqual(forbiddenAgentPaths([
    'src/content/posts/neuer-beitrag.md',
    'src/content/pages/index.yaml',
    'src/components/sections/Hero.astro',
    'src/styles/global.css',
    'src/site.config.ts',
  ]), []);
});

test('Workflow-, Tool-, Test-, Vertrags- und Credential-Änderungen werden blockiert', () => {
  const paths = ['.github/workflows/agent.yml', 'scripts/check-agent-diff.mjs', 'tests/a11y.spec.ts', 'AGENTS.md', 'package.json', '.env', 'src/content.config.ts', 'src/components/SectionRenderer.astro'];
  assert.deepEqual(forbiddenAgentPaths(paths), paths);
});

test('Prüfer blockiert einen echten Git-Diff mit zusätzlicher Workflow-Datei', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'agent-diff-'));
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  const check = () => spawnSync(process.execPath, [fileURLToPath(new URL('./check-agent-diff.mjs', import.meta.url)), 'main', 'HEAD'], { cwd, encoding: 'utf8' });
  try {
    git('init', '-b', 'main');
    git('config', 'user.name', 'Guard Test');
    git('config', 'user.email', 'guard@example.invalid');
    git('commit', '--allow-empty', '-m', 'base');
    git('checkout', '-b', 'agent-test');
    mkdirSync(join(cwd, 'src/content/posts'), { recursive: true });
    writeFileSync(join(cwd, 'src/content/posts/beitrag.md'), 'Inhalt');
    git('add', '.');
    git('commit', '-m', 'allowed');
    assert.equal(check().status, 0);
    mkdirSync(join(cwd, '.github/workflows'), { recursive: true });
    writeFileSync(join(cwd, '.github/workflows/unwanted.yml'), 'name: unwanted');
    git('add', '.');
    git('commit', '-m', 'forbidden');
    const blocked = check();
    assert.equal(blocked.status, 1);
    assert.match(blocked.stderr, /\.github\/workflows\/unwanted\.yml/);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
