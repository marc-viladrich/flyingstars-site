const runtimeTypes = new Set(["showreelHero", "pricing", "sustainability", "logoBar", "team", "contactForm"]);
const runtimeSelector = "canvas,video,form,[data-scrolly],[data-rotate]";

export const isRuntime=node=>runtimeTypes.has(node.dataset?.editorBlockType)||!!node.querySelector?.(runtimeSelector)||!!node.matches?.(runtimeSelector);

export function attributePolicy(node,name){if(node.tagName!=='CANVAS'||!(name.startsWith('data-')||['width','height','style'].includes(name)))return undefined;if(!name.startsWith('data-'))return 'skip';if(name==='data-canvas-live'||!node.hasAttribute('data-canvas-live'))return 'unsafe';}
