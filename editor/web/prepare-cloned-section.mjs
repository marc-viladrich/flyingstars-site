import {extensions} from './site-adapter.mjs';
export const prepareClonedSection=(...args)=>extensions.first('prepareClone',...args);
