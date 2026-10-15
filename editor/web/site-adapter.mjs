// FlyingStars extensions. Field semantics belong here; core consumes x-afe descriptors.
import {legacyCollections} from '../../src/lib/content-addresses.mjs';
const getPath=(data,path)=>path.reduce((value,key)=>value?.[key],data);
export function resolveReference(records,value,reference){
 if(!reference||value==null)return null;
 const prefix=Object.entries(legacyCollections).find(([,collection])=>collection===reference.collection)?.[0];
 const id=reference.encoding==='astro-reference'?value.id:value;
 return records.find(record=>record.address?.collection===reference.collection&&record.address.id===id)||records.find(record=>prefix&&record.id.startsWith(prefix+'/')&&record.id===(String(id).includes('/')?id:prefix+'/'+id))||null;
}
export function omitOwnedField(data,path){return !!getPath(data,path.slice(0,-1))?.assetId&&['src','width','height','alt'].includes(path.at(-1));}
export function omitRecordField(item,data,path){return item.type==='media'&&path.length===1&&['src','width','height','mime'].includes(path[0])||omitOwnedField(data,path);}
const filled = (value) => (typeof value === "string" ? value.trim() : typeof value === "number" ? String(value) : "");
// A media usage points at its library record by full id ("media/x") or, in older content, by the bare id.
export function mediaRecordFor(records, assetId) {
  if (typeof assetId !== "string" || !assetId) return null;
  return records.find((r) => r.id === assetId) || records.find((r) => r.id === "media/" + assetId) || null;
}
const fileName = (src) => {
  if (typeof src !== "string" || !src) return "";
  const last = src.split(/[?#]/, 1)[0].split("/").filter(Boolean).at(-1) || "";
  try {
    return decodeURIComponent(last);
  } catch {
    return last;
  }
};
// Image usage: caption → effective alt (local override, own alt, library default) → library title → file name.
export function imageSummary(usage, records = []) {
  const asset = mediaRecordFor(records, usage?.assetId)?.data;
  const override = usage?.altOverride === null || usage?.altOverride === undefined ? "" : filled(usage.altOverride);
  const label = filled(usage?.caption) || override || filled(usage?.alt) || filled(asset?.defaultAlt) || filled(asset?.title) || fileName(asset?.src || usage?.src);
  return { label, thumb: asset?.src || (typeof usage?.src === "string" && usage.src) || null };
}

export const mediaSource=(value,records)=>mediaRecordFor(records,value?.assetId)?.data?.src||value?.src;

export function mediaControl(item, path, { title, untitled = false } = {}, api) {
 const {value, record, el, openMedia, fieldLabel, button, fieldsFor, fieldControl, changed, rerender, navRow, pushView}=api;
  const usage = value(item, path) || {};
  const asset = usage.assetId && (record(usage.assetId) || record("media/" + usage.assetId));
  const src = asset?.data.src || usage.src;
  const preview = el(
    "button",
    { type: "button", class: "media-preview", "aria-label": "Bild ersetzen", onclick: () => openMedia({ id: item.id, path }) },
    src ? el("img", { src, alt: "" }) : el("span", { class: "empty", text: "Kein Bild gewählt" }),
  );
  const parts = [
    untitled ? null : el("span", { class: "row-label", text: title || fieldLabel({ path }) }),
    preview,
    button(src ? "Bild ersetzen" : "Bild wählen", () => openMedia({ id: item.id, path }), { icon: "image", cls: "inline-button" }),
  ];
  const fields = fieldsFor(item).filter((f) => f.path.length === path.length + 1 && path.every((p, i) => f.path[i] === p));
  const decorative = fields.find((f) => f.path.at(-1) === "decorative");
  const override = fields.find((f) => f.path.at(-1) === "altOverride");
  const altField = fields.find((f) => f.path.at(-1) === "alt");
  if (src) {
    if (decorative) parts.push(fieldControl(item, decorative, { label: "Dekoratives Bild" }));
    if (!usage.decorative) {
      const overridePath = [...path, "altOverride"];
      if (override || usage.assetId) {
        const inherited = asset?.data.defaultAlt || "";
        const local = usage.altOverride !== null && usage.altOverride !== undefined;
        const toggle = el("input", { type: "checkbox", class: "switch", role: "switch", "aria-label": "Alternativtext nur hier abweichend" });
        toggle.checked = local;
        toggle.addEventListener("change", () => {
          changed(item.id, overridePath, toggle.checked ? inherited : null);
          rerender();
        });
        parts.push(
          el(
            "div",
            { class: "stack" },
            el("span", { class: "row-label", text: "Alternativtext" }),
            local
              ? fieldControl(item, override || { path: overridePath, kind: "text" }, { label: "Alternativtext an dieser Stelle" }).lastChild
              : el("p", { class: "inherited-alt", text: inherited || "Noch kein Alternativtext in der Mediathek." }),
          ),
        );
        parts.push(el("label", { class: "row" }, el("span", { class: "row-label", text: "Nur hier abweichend" }), toggle));
        if (asset) parts.push(navRow("Mediathek-Eintrag bearbeiten", () => pushView({ id: asset.id, path: [] }, "record"), "image"));
      } else if (altField) parts.push(fieldControl(item, altField, { label: "Alternativtext" }));
    }
  }
  return el("div", { class: "media-field" }, parts);
}

export function packageFeatures(item,container,{record,recordName,pushView,inlinePlain}) {
  // A package card shows a selection of the package's Leistungen (featureIds of package featureGroups).
  {
    const owner = getPath(item.data, container.path.slice(0, -1));
    const pkg = owner?.packageId && record("package/" + owner.packageId);
    if (!pkg) return { options: [], empty: "Erst ein Paket wählen." };
    return {
      noun: "Leistung",
      empty: "Noch keine Leistung auf der Karte.",
      owner: pkg,
      create: () => pushView({ id: pkg.id, path: [] }, "record"),
      createLabel: `Leistungen von ${recordName(pkg)} bearbeiten`,
      options: (pkg.data.featureGroups || []).flatMap((group, g) =>
        (group.items || []).map((feature, i) => ({
          key: feature.id,
          label: inlinePlain(feature.text),
          group: group.title,
          // The text belongs to the package: open its overview with this Leistung revealed.
          open: () => pushView({ id: pkg.id, path: [], reveal: ["featureGroups", g, "items", i] }, "record"),
        })),
      ),
    };
  }
}

export function changePackage(id,path,newValue,{record,draft}) {
  // A card that switches to another package keeps only Leistungen that exist in the new package.
  if (path.at(-1) === "packageId") {
    const card = path.slice(0, -1);
    const pkg = record("package/" + newValue);
    const known = new Set((pkg?.data.featureGroups || []).flatMap((g) => (g.items || []).map((f) => f.id)));
    const selected = getPath(record(id)?.data, [...card, "featureIds"]);
    draft.group(() => {
      draft.set(id, path, newValue);
      if (Array.isArray(selected)) draft.set(id, [...card, "featureIds"], selected.filter((f) => known.has(f)));
    });
    return true;
  }
  return false;
}

export function siteChange(id,path,value,api){return changePackage(id,path,value,api);}
export const mediaUsageKeys=new Set(['src','width','height','alt','altOverride','decorative','assetId','mime']);
export const mediaSelection=usage=>usage?.assetId?(String(usage.assetId).startsWith('media/')?usage.assetId:'media/'+usage.assetId):null;
export const selectedMedia=(existing,asset)=>({...existing,src:asset.data.src,alt:asset.data.defaultAlt||'',width:asset.data.width,height:asset.data.height,assetId:asset.id,altOverride:null,decorative:false});
export const uploadedMediaId=uploaded=>uploaded.assetId;
export const siteWidgets={
 'flyingstars/package-features':{choices:packageFeatures},
 'flyingstars/media-usage':{render:mediaControl},
 'flyingstars/compact-table':{table:true},
 'flyingstars/comparison':{layout:'comparison'},
};

export const referencePrefix=reference=>{const prefix=Object.entries(legacyCollections).find(([,collection])=>collection===reference?.collection)?.[0];return prefix?prefix+'/':null;};

export const optionalFieldAllowed=field=>field.path.at(-1)!=='decorative';

export const referencedRecords=(records,reference)=>{const prefix=referencePrefix(reference);return records.filter(record=>record.address?.collection===reference.collection||prefix&&record.id.startsWith(prefix));};
