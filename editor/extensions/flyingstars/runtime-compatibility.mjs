// Persisted names and deprecated host aliases remain byte-compatible during the pilot migration.
export const legacyRuntimePaths=Object.freeze({operationLock:'flyingstars-operation.lock',draftLease:'flyingstars-draft-lease',rebasePrefix:'flyingstars-rebase-',deployPrefix:'flyingstars-deploy-'});
export const legacyEnvironmentOptions=Object.freeze({stateDir:['FLYINGSTARS_STATE_DIR'],publicWebroot:['FLYINGSTARS_PUBLIC_WEBROOT'],remote:['FLYINGSTARS_GIT_REMOTE'],offlineMedia:['FLYINGSTARS_OFFLINE_MEDIA']});
export const legacyBuildEnvironment=value=>value===undefined?{}:{FLYINGSTARS_OFFLINE_MEDIA:String(value)};
export const legacyRestartEnvironment=state=>({FLYINGSTARS_STATE_DIR:state});
export const legacyRuntimeMessages=Object.freeze({remote:'AFE_GIT_REMOTE (FLYINGSTARS_GIT_REMOTE) muss einen konfigurierten Git-Remote benennen.',state:'AFE_STATE_DIR (FLYINGSTARS_STATE_DIR) muss außerhalb des Repository-Klons liegen.'});
