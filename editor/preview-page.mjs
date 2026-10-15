// The saved draft as a plain page under /vorschau/ on the editor host (behind the editor login).
// One slim bar on top says what this is and links the live version. The public site never gets a bar:
// every visitor would see it there, and the live site has nothing to explain.
import { previewPrefix } from "./web/frontend-url.mjs";

// From editor/web/ui-tokens.css (--ui-accent-ink, --ui-toast-accent, --ui-on-accent); a test keeps them equal.
export const barColors = { surface: "#5e2c78", soft: "#e9d5f5", ink: "#fff" };

const escape = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** state: { live: boolean (saved draft is what the public site serves), draftHead, shownHead, liveURL|null } */
export function previewBar({ live, draftHead, shownHead, liveURL }) {
  const status = live ? "entspricht der Live-Version" : "noch nicht veröffentlicht";
  const behind = shownHead && draftHead && shownHead !== draftHead;
  const { surface, soft, ink } = barColors;
  return `<fs-preview-bar data-draft-head="${escape(draftHead || "")}" style="position:fixed;inset:0 0 auto 0;z-index:2147483647;display:block"><template shadowrootmode="open"><style>
:host{all:initial}
.bar{box-sizing:border-box;display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:4px 16px;min-height:40px;padding:8px 20px;background:${surface};color:${ink};font:500 13px/18px Inter,system-ui,-apple-system,"Segoe UI",sans-serif;-webkit-font-smoothing:antialiased}
.state b{font-weight:600}
.note{color:${soft};font-weight:400}
a{color:${ink};font-weight:600;text-decoration:underline;text-decoration-thickness:1px;text-underline-offset:3px;border-radius:4px}
a:hover{text-decoration-thickness:2px}
a:focus-visible{outline:2px solid ${soft};outline-offset:3px}
[hidden]{display:none}
</style><div class="bar" role="region" aria-label="Vorschau des gespeicherten Stands">
<span class="state"><b>Vorschau</b> · ${status}</span>
${behind ? `<span class="note">Gezeigt wird der zuletzt erfolgreich aufgebaute Stand.</span>` : ""}
<span class="note" data-unsaved hidden></span>
<a data-reload href="" hidden>Neuer Stand gespeichert · neu laden</a>
${liveURL ? `<a href="${escape(liveURL)}">Live ansehen</a>` : `<span class="note">Diese Seite ist noch nicht live.</span>`}
</div></template></fs-preview-bar>`;
}

// Runs in the preview page: keeps the page under the bar, keeps site links inside the preview and says
// whether the editor holds changes this page does not contain (the editor writes them to localStorage).
const script = `<script>(()=>{
const bar=document.querySelector("fs-preview-bar"),root=bar&&bar.shadowRoot;if(!root)return;
const P=${JSON.stringify(previewPrefix)};
const page=p=>!/^\\/(?:editor|vorschau)(?:\\/|$)|^\\/[_@]/.test(p)&&(!p.split("/").pop().includes(".")||p.endsWith(".html"));
const keep=a=>{try{const u=new URL(a.getAttribute("href"),location.href);if(u.origin===location.origin&&page(u.pathname))a.href=P+u.pathname+u.search+u.hash;}catch{}};
document.querySelectorAll("a[href]").forEach(keep);
document.addEventListener("click",e=>{const a=e.target.closest&&e.target.closest("a[href]");if(a&&!root.contains(a))keep(a);},true);
let pinned=null;
const fit=()=>{const h=Math.round(bar.getBoundingClientRect().height);document.documentElement.style.setProperty("padding-top",h+"px","important");document.documentElement.style.setProperty("scroll-padding-top",h+"px");
if(!pinned){pinned=[];for(const n of document.body.querySelectorAll("*")){if(n===bar)continue;const s=getComputedStyle(n);if((s.position==="fixed"||s.position==="sticky")&&s.top==="0px")pinned.push(n);}}
for(const n of pinned)n.style.setProperty("top",h+"px","important");};
const note=root.querySelector("[data-unsaved]"),reload=root.querySelector("[data-reload]");
const sync=()=>{let n=0,head="";try{n=Number(localStorage.getItem("fs-editor-unsaved")||0);head=localStorage.getItem("fs-editor-head")||"";}catch{}
note.hidden=!n;note.textContent=n===1?"1 ungespeicherte Änderung im Editor ist hier nicht enthalten.":n+" ungespeicherte Änderungen im Editor sind hier nicht enthalten.";
reload.hidden=!head||head===bar.dataset.draftHead;fit();};
reload.addEventListener("click",e=>{e.preventDefault();location.reload();});
addEventListener("storage",e=>{if(e.key&&e.key.startsWith("fs-editor-"))sync();});
addEventListener("resize",fit);sync();
})();</script>`;

export function withPreviewBar(html, state) {
  const bar = previewBar(state);
  const opened = /<body[^>]*>/i.exec(html);
  const withBar = opened ? html.slice(0, opened.index + opened[0].length) + bar + html.slice(opened.index + opened[0].length) : bar + html;
  const close = withBar.lastIndexOf("</body>");
  return close < 0 ? withBar + script : withBar.slice(0, close) + script + withBar.slice(close);
}
