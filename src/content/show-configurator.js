// Technical package order only. Motif text belongs to screen/show-konfigurator.
export const PACKAGE_ORDER = ['SPARK','HORIZON','ODYSSEY'];
export const makeSteps = packages => PACKAGE_ORDER.map(pkg=>({pkg,label:packages[pkg].effortLabel,includes:packages[pkg].includes}));
