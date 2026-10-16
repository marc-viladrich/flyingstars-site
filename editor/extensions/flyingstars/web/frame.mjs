// markers: the editor's frame marker queries (frame-markers.mjs), passed with every presentation.
function presentSections({document,records,markers}) {
  for (const {node,marker} of markers.allMarked(document,markers.isBlock)) {
    const owner = markers.recordOf(records, marker.address.owner),
      section = readPath(owner?.data, marker.address.path);
    if (!section) continue;
    if (section.columns) {
      const grid = node.querySelector(".packs,.crew,.testimonials");
      if (grid) {
        grid.style.removeProperty("grid-template-columns");
        const base = grid.classList.contains("packs")
            ? "packs"
            : grid.classList.contains("crew")
              ? "crew"
              : "testimonials",
          variants = base === "packs" ? ["one", "two"] : base === "crew" ? ["one", "two", "three"] : ["one"];
        for (const variant of variants) grid.classList.toggle(base + "--" + variant, section.columns === variant);
      }
    }
    if (section.type === "testimonials") {
      const grid = node.querySelector(".testimonials");
      grid?.classList.toggle("testimonials--plain", section.background === false);
    }
    if (section.showImages !== undefined) {
      for (const img of node.querySelectorAll("img")) img.hidden = !section.showImages;
      if (section.type === "team")
        for (const portrait of node.querySelectorAll(".portrait")) portrait.hidden = !section.showImages;
    }
    if (section.type === "pricing")
      for (const [index, card] of [...node.querySelectorAll(".pack")].entries()) {
        const canvas = card.querySelector("canvas");
        if (canvas)
          canvas.hidden = node.classList.contains("native-copy-pending") || section.tiers?.[index]?.showOrb === false;
        // Immediate feedback; the server render confirms it a moment later.
        // The recommendation belongs to the package (shown wherever it appears), not to this card.
        const pack = section.tiers?.[index] && records.find((r) => r.id === "package/" + section.tiers[index].packageId);
        if (pack) card.classList.toggle("featured", !!pack.data.highlight);
      }
    if (section.type === "textMedia") {
      const image = node.querySelector("figure,img");
      if (image) image.hidden = section.showImage === false;
      const grid = node.querySelector(".wrap");
      if (grid) {
        grid.classList.toggle("grid-2", section.showImage !== false && !!section.image);
        grid.classList.toggle("grid-2--media-left", section.showImage !== false && section.mediaSide === "left");
      }
    }
  }
}
export const snapshotFrame=({window})=>({configurator:window.flyingstarsConfigurator?.snapshot()});
export async function restoreFrame(value,{window}){if(value?.configurator&&window.flyingstarsConfigurator?.restore)await window.flyingstarsConfigurator.restore(value.configurator);}
export const ownsTransientInput=(node,value)=>!!value?.configurator&&!!node.closest('#cfg');

function readPath(data,path){return path.reduce((v,k)=>v?.[k],data);}
const mediaSourceChanged=(a,b)=>a!==b;
export function presentFrame({document,records,mediaBaselines,initialMediaSource,markers}){
  // Colour fields feed CSS variables (color markers): a picked colour token shows at once.
  for (const {node,marker} of markers.allMarked(document,markers.isColor)) {
    const id = readPath(markers.recordOf(records, marker.address.owner)?.data, marker.address.path);
    if (typeof id === "string" && /^[a-z0-9-]+$/.test(id)) node.style.setProperty(marker.cssVar, `var(--c-${id})`);
  }
  presentSections({document,records,markers});
  for (const {node,marker} of markers.allMarked(document,markers.isMedia)) {
    const item = markers.recordOf(records, marker.address.owner),
      path = markers.editorPath(marker.address),
      usage = readPath(item?.data, path);
    if (!usage) continue;
    const asset =
        usage.assetId && records.find((r) => r.id === usage.assetId || r.id === "media/" + usage.assetId)?.data,
      media = asset
        ? {
            ...usage,
            src: asset.src,
            width: asset.width,
            height: asset.height,
            alt: usage.decorative ? "" : (usage.altOverride ?? asset.defaultAlt ?? ""),
          }
        : usage;
    const img = node.matches("img") ? node : node.querySelector("img");
    if (img) {
      let baseline = mediaBaselines.get(img);
      if (!baseline) {
        const saved = initialMediaSource(item?.id, path) || media.src;
        baseline = {
          source: saved,
          src: img.getAttribute("src"),
          srcset: img.getAttribute("srcset"),
          width: img.getAttribute("width"),
          height: img.getAttribute("height"),
          sources: [...(img.closest("picture")?.querySelectorAll("source") || [])].map((node) => ({
            node,
            srcset: node.getAttribute("srcset"),
          })),
          replaced: false,
        };
        mediaBaselines.set(img, baseline);
      }
      if (mediaSourceChanged(baseline.source, media.src)) {
        if (!baseline.replaced || img.getAttribute("src") !== media.src) {
          for (const entry of baseline.sources) entry.node.removeAttribute("srcset");
          img.removeAttribute("srcset");
          img.src = media.src;
          if (media.width) img.width = media.width;
          if (media.height) img.height = media.height;
          baseline.replaced = true;
        }
      } else if (baseline.replaced) {
        for (const [name, newValue] of [
          ["src", baseline.src],
          ["srcset", baseline.srcset],
          ["width", baseline.width],
          ["height", baseline.height],
        ])
          if (newValue === null) img.removeAttribute(name);
          else img.setAttribute(name, newValue);
        for (const entry of baseline.sources)
          if (entry.srcset !== null) entry.node.setAttribute("srcset", entry.srcset);
        baseline.replaced = false;
      }
      img.alt = media.decorative ? "" : (media.altOverride ?? media.alt ?? "");
    }
  }
}

export const variantPresentation=(field,value,chip)=>{if(field.path.at(-1)==='tone'&&['y','n','p'].includes(value))chip.dataset.tone=value;};
export const frameStyles=()=>['.native-variant button[data-tone]{font:500 10.5px/1 ui-monospace,"SF Mono",Menlo,monospace;letter-spacing:.08em;text-transform:uppercase;height:24px;margin:3px 1px;border-radius:3px;box-shadow:inset 0 0 0 1px currentColor;opacity:.55}.native-variant button[data-tone=y]{color:var(--ui-success)}.native-variant button[data-tone=n]{color:var(--ui-danger)}.native-variant button[data-tone=p]{color:var(--ui-warning)}.native-variant button[data-tone][aria-pressed=true]{opacity:1;color:var(--ui-on-accent);box-shadow:none}.native-variant button[data-tone=y][aria-pressed=true]{background:var(--ui-success)}.native-variant button[data-tone=n][aria-pressed=true]{background:var(--ui-danger)}.native-variant button[data-tone=p][aria-pressed=true]{background:var(--ui-warning)}'];
