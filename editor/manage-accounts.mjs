import {isMain} from './paths.mjs';
import {promises as fs} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {createInterface} from 'node:readline/promises';
import {Writable} from 'node:stream';
import {accountsPath, assertPrivateAccountsPath, hashPassword, loadAccounts, normalizeUsername, validUsername, validateAccounts} from './auth.mjs';

export async function writeAccounts(file, data) {
  validateAccounts(data);
  file = await assertPrivateAccountsPath(file);
  await fs.mkdir(path.dirname(file), {recursive: true, mode: 0o700});
  const temporary = path.join(path.dirname(file), '.accounts-' + randomUUID() + '.tmp');
  try {
    const handle = await fs.open(temporary, 'wx', 0o600);
    try { await handle.writeFile(JSON.stringify(data, null, 2) + '\n'); await handle.sync(); }
    finally { await handle.close(); }
    await fs.rename(temporary, file);
  } finally { await fs.rm(temporary, {force: true}); }
}

async function passwordInput() {
  if (process.env.EDITOR_NEW_PASSWORD !== undefined) return process.env.EDITOR_NEW_PASSWORD;
  // A pipe must use EDITOR_NEW_PASSWORD; this avoids accidentally echoing secrets or hanging.
  if (!process.stdin.isTTY) throw Error('Ohne Terminal bitte EDITOR_NEW_PASSWORD verwenden.');
  const muted = new Writable({write(_chunk, _encoding, done) { done(); }});
  const reader = createInterface({input: process.stdin, output: muted, terminal: true, historySize: 0});
  const controller = new AbortController();
  const cancel = () => controller.abort(); reader.on('SIGINT', cancel);
  try {
    process.stdout.write('Passwort: ');
    const first = await reader.question('', {signal: controller.signal});
    process.stdout.write('\nPasswort wiederholen: ');
    const second = await reader.question('', {signal: controller.signal});
    process.stdout.write('\n');
    if (first !== second) throw Error('Passwörter stimmen nicht überein.');
    return first;
  } finally { reader.close(); muted.end(); }
}

export async function manageAccounts(args, {file = accountsPath(), password = passwordInput, print = console.log} = {}) {
  file = await assertPrivateAccountsPath(file);
  const [command, rawUsername, ...options] = args, username = normalizeUsername(rawUsername);
  if (!['add', 'passwd', 'disable', 'list'].includes(command)) throw Error('Verwendung: add <username> --name "Anzeigename" --email x@y | passwd <username> | disable <username> | list');
  if (command === 'list' ? args.length !== 1 : !validUsername(username)) throw Error('Ungültiger Benutzername oder Aufruf.');
  if (command !== 'add' && options.length) throw Error('Unerwartete Optionen.');
  let data;
  try { data = await loadAccounts(file); }
  catch (e) { if (e.code !== 'ENOENT' || command !== 'add') throw e; data = {version: 1, users: []}; }
  if (command === 'list') {
    for (const user of data.users) print(`${user.username}\t${user.displayName}\t${user.email}\t${user.disabled ? 'deaktiviert' : 'aktiv'}`);
    return;
  }
  const user = data.users.find(user => user.username === username);
  if (command === 'add') {
    if (user) throw Error('Benutzername existiert bereits.');
    const fields = {};
    for (let i = 0; i < options.length; i += 2) {
      if (!['--name', '--email'].includes(options[i]) || !options[i + 1] || fields[options[i]]) throw Error('Bitte --name und --email genau einmal angeben.');
      fields[options[i]] = options[i + 1];
    }
    const account = {id: randomUUID(), username, displayName: fields['--name'], email: fields['--email'], disabled: false, passwordVersion: 1, ...await hashPassword(await password())};
    data.users.push(account);
  } else {
    if (!user) throw Error('Benutzername nicht gefunden.');
    if (command === 'passwd') { Object.assign(user, await hashPassword(await password())); user.passwordVersion++; }
    else { user.disabled = true; user.passwordVersion++; }
  }
  await writeAccounts(file, data);
  print(command === 'add' ? 'Konto angelegt.' : command === 'passwd' ? 'Passwort geändert; bestehende Sitzungen beendet.' : 'Konto deaktiviert; bestehende Sitzungen beendet.');
}

export async function runAccountsCli() {
  try { await manageAccounts(process.argv.slice(2)); }
  catch (e) { console.error(e.name === 'AbortError' ? 'Abgebrochen.' : e.message); process.exitCode = 1; }
}

if (isMain(import.meta.url)) await runAccountsCli();
