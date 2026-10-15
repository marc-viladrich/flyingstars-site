// Explicit legacy identity -> Astro identity table. Entry IDs pass through
// unchanged; collection names are never inferred by pluralizing legacy prefixes.
export const legacyCollections = Object.freeze({
 page:'pages',post:'posts',project:'projects',faq:'faq',
 extra:'extras',package:'packages',screen:'screens',client:'clients',team:'team',media:'media',
 translation:'translations',
});
export const siteAddresses = Object.freeze({
 contact:Object.freeze({collection:'siteContact',id:'contact'}),
 inquiry:Object.freeze({collection:'siteInquiry',id:'inquiry'}),
 navigation:Object.freeze({collection:'siteNavigation',id:'navigation'}),
 ui:Object.freeze({collection:'siteUi',id:'ui'}),
});
