import { randomUUID } from "node:crypto";
import { draftFiles, snapshotId } from "./workspace.mjs";

// Preview requests from editor tabs, in front of one driver (live or static).
//
// Lease: every tab gets one, bound to its login session; nobody else can render with it. One host has one
// workspace, so renders run one at a time. Each render writes its tab's complete draft (and puts back what an
// earlier draft changed), so a tab never sees another tab's draft, whichever rendered before.
// Epoch: a tab numbers its requests. An older number than one already seen is refused, and a request still
// waiting when a newer one of the same tab arrives is dropped unrendered: typing renders the latest state only.
// Snapshot: the response names the head and the snapshot ID of exactly the files the driver proved it shows.

const conflict = (code, message) => Object.assign(Error(message), { status: 409, code });

export class PreviewService {
  constructor(driver, store, { idle = 30 * 60 * 1000, now = Date.now } = {}) {
    this.driver = driver;
    this.store = store;
    this.leases = new Map();
    this.idle = idle;
    this.now = now;
    this.queue = Promise.resolve();
  }
  get kind() {
    return this.driver.kind;
  }
  init() {
    return this.driver.init();
  }
  lease(owner) {
    this.expire();
    const lease = { id: randomUUID(), owner, epoch: 0, seen: this.now() };
    this.leases.set(lease.id, lease);
    return { leaseId: lease.id, driver: this.driver.kind };
  }
  expire() {
    for (const [id, lease] of this.leases) if (this.now() - lease.seen > this.idle) this.leases.delete(id);
  }
  claim(leaseId, owner, epoch) {
    const lease = this.leases.get(leaseId);
    if (!lease) throw conflict("lease-unknown", "Die Vorschau-Sitzung ist abgelaufen.");
    if (lease.owner !== owner) throw Object.assign(Error("Diese Vorschau gehört zu einer anderen Anmeldung."), { status: 403 });
    if (!Number.isSafeInteger(epoch) || epoch <= lease.epoch) throw conflict("stale", "Veraltete Vorschau-Anfrage.");
    lease.epoch = epoch;
    lease.seen = this.now();
    return lease;
  }
  async render({ leaseId, epoch, head, route = "/", changes = [], creates = [], deletes = [] }, owner) {
    const lease = this.claim(leaseId, owner, epoch);
    if (!/^[a-f0-9]{40}$/.test(head || "")) throw Object.assign(Error("Ungültiger Vorschau-Stand."), { status: 400 });
    if (typeof route !== "string" || !route.startsWith("/") || route.includes("..")) throw Object.assign(Error("Ungültige Seite."), { status: 400 });
    const work = async () => {
      if (lease.epoch !== epoch) throw conflict("superseded", "Eine neuere Vorschau-Anfrage ersetzt diese.");
      const files = await draftFiles(this.store, { head, changes, creates, deletes });
      const { html, proof } = await this.driver.render({ head, files, route });
      return { leaseId: lease.id, epoch, head, route, snapshotId: snapshotId(head, files), driver: this.driver.kind, proof, html };
    };
    const result = this.queue.then(work);
    this.queue = result.catch(() => {});
    return await result;
  }
  handles(pathname) {
    return this.driver.handles(pathname);
  }
}
