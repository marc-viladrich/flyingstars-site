import {spawnSync} from 'node:child_process';
import {UNIT_ARGS} from './unit-contract.mjs';
const result=spawnSync(process.execPath,UNIT_ARGS,{stdio:'inherit',env:process.env});
if(result.error)throw result.error;
process.exitCode=result.status??1;
