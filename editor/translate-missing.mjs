#!/usr/bin/env node
// FlyingStars launcher: node editor/translate-missing.mjs --locale en [--records record/id] [--provider mymemory]
//   [--all] [--max-chars 3000] [--budget-chars 30000] [--dry-run] [--print]
import {translateMissing} from 'astro-frontend-editor/runtime';
import {site} from './server.mjs';
await translateMissing(process.argv.slice(2),site);
