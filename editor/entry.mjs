// Every way into the editor ends in the editor: the login, a bookmark of a site page on the editor
// host, "/editor" without slash. The site itself is only shown top-level on the public host.
const framePages = /^\/(?!editor(?:\/|$)|_|@)/;

// The editor address that shows `target` (a URL on the editor host), or null when it is not a page.
export function editorEntry(target) {
  const p = target.pathname;
  if (p === "/editor" || p === "/editor/" || p === "/editor/login") return p === "/editor/login" ? "/editor/" : "/editor/" + target.search;
  if (!isSitePage(p)) return null;
  return p === "/" ? "/editor/" : "/editor/?page=" + encodeURIComponent(p);
}

export function isSitePage(pathname) {
  if (!framePages.test(pathname)) return false;
  const last = pathname.split("/").pop();
  return !last.includes(".") || last.endsWith(".html");
}

// Only a top-level visit is redirected; the editor's own iframe loads the same pages (Sec-Fetch-Dest: iframe).
export const topLevelVisit = (req) => req.method === "GET" && req.headers["sec-fetch-dest"] === "document";
