import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const editorRoot = path.dirname(fileURLToPath(import.meta.url));
export const sourceRoot = path.dirname(editorRoot);
// The legacy local folder remains the default; a host sets an absolute private directory.
export const stateRoot = () => path.resolve(process.env.FLYINGSTARS_STATE_DIR || path.join(sourceRoot, '..'));
