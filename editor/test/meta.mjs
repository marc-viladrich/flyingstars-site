export const editable=meta=>({'x-afe':meta});
export const inGroup=(group,schema)=>schema.meta({...schema.meta(),'x-afe':{...schema.meta()?.['x-afe'],group}});
