// Read-only audit of the activated contract. No private state and no legacy hash exemption.
import {createSite} from './flyingstars-adapter.mjs';
import {readContractRecords,auditContracts} from '../src/i18n/read-contracts.mjs';
import {policyTree,policyStatistics} from '../src/i18n/field-policy.mjs';
const site=await createSite(process.cwd()),records=readContractRecords(process.cwd(),site),results=auditContracts(site,records);
const ids=['page/index','post/test','project/test','faq/test','person/test','media/test','site/contact','site/navigation','site/show-duration','site/show-extras','site/business-facts','site/project-facts','site/preview-policy','package/configuration','site/ui','site/safety-concept','site/sustainability-pillars'];
console.log(JSON.stringify({version:2,addressing:'stable-keys',sources:results.length/2,localeFiles:results.length,valid:results.length,fields:results.reduce((n,r)=>n+r.result.fields.length,0),policy:Object.fromEntries(ids.map(id=>[id,policyStatistics(policyTree(site.sourceFor(id).schema))]))},null,2));
