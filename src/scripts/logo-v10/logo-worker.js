import { convert } from './converter/convert.mjs';
import { converterWorker } from './worker-core.mjs';
self.onmessage = converterWorker(convert, message => self.postMessage(message));
