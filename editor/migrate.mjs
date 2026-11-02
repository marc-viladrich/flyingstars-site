// FlyingStars launcher for content-format migrations: `node editor/migrate.mjs` shows what would change,
// `--apply` changes the working tree. Commit the result; a second run is empty.
import {migrate} from 'astro-frontend-editor/runtime';
import {site} from './server.mjs';
process.exitCode=await migrate(process.argv.slice(2),site);
