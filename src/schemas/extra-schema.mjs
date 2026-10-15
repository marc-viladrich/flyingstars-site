import {z} from 'astro/zod';
import {editable,inGroup} from './afe-meta.mjs';
const text=label=>z.string().min(1).describe(label).meta(editable({translatable:true}));
export const extraSchema=z.object({
  name:inGroup('Upgrade',text('Kurzname')),
  title:inGroup('Upgrade',text('Überschrift')),
  text:inGroup('Upgrade',text('Beschreibung')),
  priceNote:inGroup('Preis',text('Hinweis unter dem Preis')),
  order:z.number().int().positive().describe('Reihenfolge').meta(editable({visibility:'advanced'})),
}).strict().meta(editable({collection:{label:'Paket-Upgrades',title:['name'],icon:'package',group:'Show-Pakete',operations:['update','create','delete'],placement:'frontend',i18n:{mode:'overlay'},policies:['flyingstars/media-ownership']}}));
