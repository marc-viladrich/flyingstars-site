import {unwrap} from 'astro-frontend-editor/runtime/extensions';
export const editable=meta=>({'x-afe':meta});
export const inGroup=(group,schema)=>schema.meta({...unwrap(schema).meta(),...schema.meta(),'x-afe':{...unwrap(schema).meta()?.['x-afe'],...schema.meta()?.['x-afe'],group}});
