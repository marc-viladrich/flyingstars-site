import {isMain} from '../paths.mjs';
import http from 'node:http';
import {Duplex} from 'node:stream';
import {startNativeServers} from '../server.mjs';

export async function handlerRequest(server, origin, route = '/editor/api/state', headers = {}) {
  const chunks = [], socket = new Duplex({read() {}, write(chunk, _encoding, done) {chunks.push(Buffer.from(chunk)); done();}});
  socket.remoteAddress = '127.0.0.1';
  const req = new http.IncomingMessage(socket);
  Object.assign(req, {method: 'GET', url: route, complete: true, httpVersion: '1.0', httpVersionMajor: 1, httpVersionMinor: 0, headers: {host: new URL(origin).host,...headers}});
  req.push(null);
  const res = new http.ServerResponse(req); res.assignSocket(socket);
  return new Promise((resolve, reject) => {
    res.once('error', reject);
    res.once('finish', () => {
      const bytes = Buffer.concat(chunks), offset = bytes.indexOf('\r\n\r\n') + 4;
      resolve({status: res.statusCode, body: bytes.subarray(offset).toString()}); socket.destroy();
    });
    server.emit('request', req, res);
  });
}

export async function smoke(source, state) {
  const app = await startNativeServers({source, runtimeRoot: state, listen: false, initialize: false, remote: false});
  try {
    const response = await handlerRequest(app.editor, app.origin);
    if (response.status !== 200 || !JSON.parse(response.body).records.length) throw Error('Editor-Smoke-Test fehlgeschlagen.');
  } finally {app.store.sync.close(); app.editor.close(); app.publicServer.close();}
}
if (isMain(import.meta.url)) await smoke(process.argv[2], process.argv[3]);
