import {extensions} from './site-adapter.mjs';
export const ALL='all',UNUSED='unused';
export const mediaUsage=(...args)=>extensions.require('mediaUsage',...args);
export const collectionOf=(...args)=>extensions.require('mediaCollection',...args);
export const mediaLibrary=(...args)=>extensions.require('mediaLibrary',...args);
export const mediaUsers=(...args)=>extensions.require('mediaUsers',...args);
