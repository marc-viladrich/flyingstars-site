// Temporary site helper until PR 11 imports astro-frontend-editor/schema.
// The editor and product checker validate this namespace against AFE_META_SPEC.
export const editable=value=>({'x-afe':value});
