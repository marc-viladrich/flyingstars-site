// Only a newly cloned draft fragment is passed here. Native live source nodes
// keep their observers, listeners and animation controllers unchanged.
export function prepareClonedSection(copy){
 const revealTargets=[copy,...copy.querySelectorAll('[data-reveal-group],.member')].filter(node=>node.hasAttribute('data-reveal-group')||node.classList.contains('member'));
 for(const node of revealTargets){node.classList.remove('pre');if(node.classList.contains('member'))node.classList.add('shown');}
 const canvases=[...copy.querySelectorAll('canvas')];
 if(canvases.length){copy.classList.add('native-copy-pending');let note=copy.querySelector('[data-native-runtime-note]');if(!note){note=copy.ownerDocument.createElement('p');note.dataset.nativeRuntimeNote='true';note.dataset.nativeEditor='runtime-note';note.className='native-runtime-note';copy.prepend(note);}note.textContent='Animationen werden beim Speichern aufgebaut.';for(const canvas of canvases){canvas.hidden=true;delete canvas.dataset.running;}}
 return {revealedNodes:revealTargets.length,pendingCanvases:canvases.length};
}
