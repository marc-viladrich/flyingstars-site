// One back stack for every editor surface that opens another: "Inhalte verwalten" → Mediathek → an image's
// panel → the record that uses it, or a record from the navigator → its references. An entry is one view
// ({ surface: "dialog" | "panel", … }); the top entry is what is shown. Before a view is left for a new one,
// its state (search, open groups, scroll position, selection) is stored on its entry, so Back shows it again
// exactly as it was. Closing (X, Escape) clears the stack: nothing is left half-open behind the next view.
export class NavStack {
  #entries = [];
  get depth() {
    return this.#entries.length;
  }
  get top() {
    return this.#entries.at(-1) || null;
  }
  get previous() {
    return this.#entries.at(-2) || null;
  }
  get entries() {
    return [...this.#entries];
  }
  canGoBack() {
    return this.#entries.length > 1;
  }
  // Starts a new stack with one view (a right-click on the canvas, a menu command).
  reset(entry) {
    this.#entries = entry ? [entry] : [];
    return entry;
  }
  clear() {
    this.#entries = [];
  }
  // leaving: the state of the view that is left; it comes back with that view on Back.
  push(entry, leaving) {
    const top = this.top;
    if (top && leaving !== undefined) top.state = leaving;
    this.#entries.push(entry);
    return entry;
  }
  // A step within the same view (an entry → its parent entry) replaces it instead of stacking.
  replaceTop(entry) {
    if (!this.#entries.length) return this.reset(entry);
    this.#entries[this.#entries.length - 1] = entry;
    return entry;
  }
  // Drops the shown view; returns the one below with the state it had when it was left (or null).
  back() {
    if (!this.canGoBack()) return null;
    this.#entries.pop();
    return this.top;
  }
  // Removes views whose object no longer exists (a deleted record); the remaining order is kept.
  retain(keep) {
    this.#entries = this.#entries.filter(keep);
    return this.top;
  }
  // How many views of one surface are stacked on top (the panel's own views above a dialog).
  run(surface) {
    let count = 0;
    for (let i = this.#entries.length - 1; i >= 0 && this.#entries[i].surface === surface; i--) count++;
    return count;
  }
}
