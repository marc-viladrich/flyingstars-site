import {factText} from '../content/show-extras.mjs';
import { getCollection, type CollectionEntry, type CollectionKey } from 'astro:content';
import { LOCALES, localeOfId, sourceId } from './routing.mjs';

/** Every query uses the requested locale, including related cards and FAQ. No silent DE fallback. */
export async function localizedCollection<C extends CollectionKey>(collection: C, locale: string, filter: (entry: CollectionEntry<C>) => unknown = () => true): Promise<CollectionEntry<C>[]> {
  return (await getCollection(collection)).filter((entry) => localeOfId(entry.id) === locale && filter(entry));
}

/** All languages use the same versioned field contract; raw revisions remain the editor's conflict guard. */
export async function checkContentCoverage() {
  const {createFlyingStarsAdapter}=await import('../../editor/flyingstars-adapter.mjs');
  const {readContractRecords,auditContracts}=await import('./read-contracts.mjs');
  const root=process.cwd(),site=await createFlyingStarsAdapter(root),records=readContractRecords(root,site);
  auditContracts(site,records,{allowUnreviewed:process.env.AFE_MODE==='editor'});
  for(const record of records)factText(JSON.stringify(record.data),localeOfId(record.id.slice(record.id.indexOf('/')+1)));
}
