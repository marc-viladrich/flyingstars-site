// Colour runs = the connected colour pieces of the source (the converter's cg, v10: a connected piece of one colour region).
// A click takes the piece (the pink bar under Energizer, the dot of an i), a second click its element. Dots without a piece
// (cg < 0) belong to their element only. Erasing a piece removes exactly that piece (convert.mjs, opts.erase).
export function colourRuns(result) {
  const points = result.points || [], runs = [], byPoint = new Map(), byElement = new Map(), byCg = new Map();
  for (const p of points) {
    if (!(p.cg >= 0)) continue;
    const k = p.e + '|' + p.cg;
    let run = byCg.get(k);
    if (!run) { run = { id: runs.length, e: p.e, points: [], cgs: [p.cg], removable: true }; byCg.set(k, run); runs.push(run); if (!byElement.has(p.e)) byElement.set(p.e, []); byElement.get(p.e).push(run); }
    run.points.push(p); byPoint.set(p, run);
  }
  return { runs, byPoint, byElement, radius: result.spacing || 1 };
}
export function targetKey(groups,p){const run=groups.byPoint.get(p);return run?.removable && groups.byElement.get(p.e)?.length>=2 ? 'r'+run.id : 'e'+p.e;}
export function selectedPoints(groups,points,key){return key[0]==='r' ? groups.runs[+key.slice(1)]?.points||[] : points.filter(p=>p.e===+key.slice(1));}
export function selectElement(selected,e,groups){
 for(const key of selected)if(key[0]==='r'&&groups.runs[+key.slice(1)]?.e===e)selected.delete(key);
 const key='e'+e;selected.add(key);return key;
}
export function widenSelection(selected,key,groups){
 if(key[0]==='r'){
  const e=groups.runs[+key.slice(1)].e;
  if(selected.has(key))return selectElement(selected,e,groups);
  selected.delete('e'+e);selected.add(key);return key;
 }
 if(selected.has(key))selected.delete(key);
 else if(key[0]==='e')selectElement(selected,+key.slice(1),groups);
 else selected.add(key);
 return key;
}

export function selectionForAction(selected,mode){return new Set([...selected].filter(k=>mode==='restore'?k[0]==='g':k[0]!=='g'));}
