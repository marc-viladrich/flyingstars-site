// FlyingStars ran the editor before it became the astro-frontend-editor package. These are the names its host,
// state directory and operators already use; the package keeps them only because this site passes them in.
// Persisted names stay byte-compatible: an existing state directory, lock, lease and session keep working.
export const compatibility=Object.freeze({
 environment:{
  stateDir:['FLYINGSTARS_STATE_DIR'],publicWebroot:['FLYINGSTARS_PUBLIC_WEBROOT'],remote:['FLYINGSTARS_GIT_REMOTE'],offlineMedia:['FLYINGSTARS_OFFLINE_MEDIA'],
  editorOrigin:['EDITOR_ORIGIN'],port:['RELAUNCH_PORT'],publicPort:['RELAUNCH_PUBLIC_PORT'],preview:['RELAUNCH_PREVIEW'],previewPort:['RELAUNCH_PREVIEW_PORT'],
  auth:['EDITOR_AUTH'],accounts:['EDITOR_ACCOUNTS'],sessionSecret:['EDITOR_SESSION_SECRET'],
  translationProvider:['EDITOR_TRANSLATION_PROVIDER'],translationUrl:['EDITOR_TRANSLATION_URL'],translationKey:['EDITOR_TRANSLATION_KEY'],translationBudget:['EDITOR_TRANSLATION_BUDGET'],
  newPassword:['EDITOR_NEW_PASSWORD'],
 },
 stateFiles:{operationLock:'flyingstars-operation.lock',draftLease:'flyingstars-draft-lease',rebasePrefix:'flyingstars-rebase-',deployPrefix:'flyingstars-deploy-'},
 cookieName:'fs_editor',
 commands:{accounts:'node editor/manage-accounts.mjs',migrate:'node editor/migrate.mjs'},
});
