// Public GitHub repository variables only. No secrets and no environment file creation.
import { execFileSync, spawnSync } from 'node:child_process';
import { trackingConfig } from '../src/lib/consent.mjs';
const names = ['PUBLIC_GOOGLE_ADS_ID', 'PUBLIC_GOOGLE_ADS_LABEL', 'PUBLIC_GA_ID'];
const variables = JSON.parse(execFileSync('gh', ['variable', 'list', '--repo', 'marc-viladrich/flyingstars-site', '--json', 'name,value'], { encoding: 'utf8' }));
const tracking = Object.fromEntries(names.map(name => {
  const value = variables.find(variable => variable.name === name)?.value;
  if (!value) throw new Error(`Missing GitHub repository variable: ${name}`);
  return [name, value];
}));
trackingConfig({ ga: tracking.PUBLIC_GA_ID, ads: tracking.PUBLIC_GOOGLE_ADS_ID, label: tracking.PUBLIC_GOOGLE_ADS_LABEL });
const result = spawnSync('npm', ['run', 'build'], { stdio: 'inherit', env: { ...process.env, ...tracking } });
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
