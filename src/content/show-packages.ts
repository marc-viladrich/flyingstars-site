// Calculation logic has no editorial data imports. Both browser tools receive localized packages.
import {PACKAGE_KEYS} from './package-ids.mjs';
export type ShowPackage = 'SPARK'|'HORIZON'|'ODYSSEY';
export const PACKAGE_NAMES = PACKAGE_KEYS as readonly ShowPackage[];
export function priceFor(name:ShowPackage,drones:number,packages:any):number|null {
 const p=packages[name],max=p.max??Infinity;
 return drones>max?null:p.price+Math.max(0,Math.ceil((drones-p.base)/p.step))*p.add;
}
export function recommendPackage(drones:number,packages:any):ShowPackage {
 return drones <= packages.SPARK.max ? 'SPARK' : drones < packages.ODYSSEY.base ? 'HORIZON' : 'ODYSSEY';
}
