#!/usr/bin/env node
// Hosting probe: measures on the real account what the documentation leaves open, before anything is
// deployed. Run it over SSH in the account, e.g. on Hetzner Webhosting L:
//   node editor/hosting-probe.mjs [--build <astro-source-dir>] [--json]
// Proxy check: run it as the editor subdomain's Node app instead of editor/server.mjs, open the subdomain in a
// browser and read what arrives (public Host kept? X-Forwarded-For set? which proxy IP?):
//   node editor/hosting-probe.mjs --proxy-echo [--port <port>] [--host <ip>]   (port also from PORT/AFE_PORT)
// It never writes outside a temporary directory and never contacts the network except through the
// optional Astro build (which fetches the site's remote images like any build).
import { spawn, spawnSync } from "node:child_process";
import { promises as fs, watch } from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";

const args = process.argv.slice(2);
const buildDir = args.includes("--build") ? path.resolve(args[args.indexOf("--build") + 1]) : null;
const asJson = args.includes("--json");
const mb = (bytes) => (bytes == null ? null : Math.round(bytes / 1048576));
const result = {};

if (args.includes("--proxy-echo")) {
  const option = (name, fallback) => (args.includes(name) ? args[args.indexOf(name) + 1] : fallback);
  const port = Number(option("--port", process.env.PORT || process.env.AFE_PORT || 4542)), host = option("--host", "127.0.0.1");
  http.createServer((req, res) => {
    // What the editor's checks depend on: Host must equal AFE_EDITOR_ORIGIN's host; the socket peer is the proxy
    // (candidate for AFE_TRUSTED_PROXIES); X-Forwarded-For must end with the visitor's address.
    const seen = { host: req.headers.host ?? null, xForwardedFor: req.headers["x-forwarded-for"] ?? null, xForwardedProto: req.headers["x-forwarded-proto"] ?? null,
      forwarded: req.headers.forwarded ?? null, xRealIp: req.headers["x-real-ip"] ?? null, socketPeer: req.socket.remoteAddress, listening: `${host}:${port}`, node: process.version };
    res.writeHead(200, { "content-type": "application/json", "cache-control": "no-store" });
    res.end(JSON.stringify(seen, null, 2));
  }).listen(port, host, () => console.log(`proxy echo on ${host}:${port}`));
  await new Promise(() => {});
}

result.node = process.version;
// The editor needs Node >= 24.15 for node:sqlite (accounts and sessions).
const [major, minor] = process.versions.node.split(".").map(Number);
result.nodeForEditor = major > 24 || (major === 24 && minor >= 15) ? "ok" : "needs Node >= 24.15";
result.sqlite = await import("node:sqlite").then(({ DatabaseSync }) => { const db = new DatabaseSync(":memory:"); db.exec("CREATE TABLE t (x)"); db.close(); return "ok"; }, (error) => `missing (${error.code || error.message})`);
result.platform = `${os.type()} ${os.release()} ${os.arch()}`;
result.cpus = os.cpus().length;
result.totalMemoryMB = mb(os.totalmem());
// The cgroup limit the host enforces for this process (what konsoleH's "memory limit" most likely sets).
result.constrainedMemoryMB = typeof process.constrainedMemory === "function" ? mb(process.constrainedMemory()) || null : null;
result.v8HeapLimitMB = mb((await import("node:v8")).getHeapStatistics().heap_size_limit);
result.ulimitVirtual = spawnSync("sh", ["-c", "ulimit -v"], { encoding: "utf8" }).stdout?.trim() || null;
result.ulimitProcesses = spawnSync("sh", ["-c", "ulimit -u"], { encoding: "utf8" }).stdout?.trim() || null;

// Child processes: the editor runs git and Astro builds as children.
const child = spawnSync(process.execPath, ["-e", "process.stdout.write('ok')"], { encoding: "utf8" });
result.childProcess = child.stdout === "ok" ? "ok" : `blocked (${child.error?.code || child.status})`;
const gitVersion = spawnSync("git", ["--version"], { encoding: "utf8" });
result.git = gitVersion.status === 0 ? gitVersion.stdout.trim() : "missing";

// Writable private directory and file watching (Astro dev / live preview needs watchers).
const temp = await fs.mkdtemp(path.join(os.tmpdir(), "fs-probe-"));
try {
  const file = path.join(temp, "probe.txt");
  await fs.writeFile(file, "a");
  result.writeTemp = "ok";
  let watcher, pending;
  result.fileWatch = await new Promise((resolve) => {
    const timer = setTimeout(() => resolve("no event within 2 s"), 2000);
    try {
      watcher = watch(temp, () => (clearTimeout(timer), resolve("ok")));
      pending = new Promise((done) => setTimeout(() => fs.writeFile(file, "b").then(done, done), 100));
    } catch (error) {
      clearTimeout(timer);
      resolve(`blocked (${error.code})`);
    }
  });
  watcher?.close();
  await pending;
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}

// How much memory a process may actually allocate (stops at 1.5 GB or at the first failure).
result.allocatableMB = await new Promise((resolve) => {
  const probe = spawn(
    process.execPath,
    ["--max-old-space-size=1600", "-e", "const a=[];let n=0;const t=setInterval(()=>{try{a.push(Buffer.alloc(64*1048576,1));n+=64;process.stdout.write(n+'\\n');if(n>=1536){clearInterval(t);process.exit(0)}}catch{process.exit(0)}},20)"],
    { stdio: ["ignore", "pipe", "ignore"] },
  );
  let last = 0;
  probe.stdout.on("data", (chunk) => (last = Number(String(chunk).trim().split("\n").at(-1)) || last));
  probe.on("exit", (code, signal) => resolve(signal ? `${last} (killed by ${signal})` : last));
});

// Optional: a real Astro build of the site, with peak memory of the build process.
if (buildDir) {
  const out = await fs.mkdtemp(path.join(os.tmpdir(), "fs-probe-build-"));
  const started = Date.now();
  // Peak memory of the build via /usr/bin/time (Linux: -v, kilobytes; macOS: -l, bytes).
  const darwin = os.platform() === "darwin";
  const timed = spawnSync("/usr/bin/time", [darwin ? "-l" : "-v", process.execPath, path.join(buildDir, "node_modules/astro/bin/astro.mjs"), "build", "--outDir", out], {
    cwd: buildDir,
    encoding: "utf8",
    env: { ...process.env, ASTRO_TELEMETRY_DISABLED: "1" },
  });
  const report = timed.stderr || "";
  const peak = darwin ? /(\d+)\s+maximum resident set size/.exec(report)?.[1] : /Maximum resident set size \(kbytes\): (\d+)/.exec(report)?.[1];
  result.build = {
    status: timed.error ? `no /usr/bin/time (${timed.error.code})` : timed.status === 0 ? "ok" : `failed (${timed.status ?? timed.signal})`,
    seconds: Math.round((Date.now() - started) / 100) / 10,
    peakMB: peak ? Math.round(Number(peak) / (darwin ? 1048576 : 1024)) : null,
    tail: timed.status === 0 ? undefined : (timed.stdout || report).split("\n").slice(-6).join("\n"),
  };
  await fs.rm(out, { recursive: true, force: true });
}

if (asJson) console.log(JSON.stringify(result, null, 2));
else for (const [key, value] of Object.entries(result)) console.log(key.padEnd(22), typeof value === "object" ? JSON.stringify(value) : value);
