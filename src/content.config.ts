import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import {postSchema,projectSchema,faqSchema} from './schemas/collection-schema.mjs';
import {clientSchema,teamSchema,mediaSchema} from './schemas/entity-schema.mjs';
import {siteSchemas} from './schemas/site-schema.mjs';
import {translationSchema} from './schemas/translation-schema.mjs';
import {extraSchema} from './schemas/extra-schema.mjs';
import {packageSchema} from './content/package-schema.mjs';
import {screenSchema} from './content/screen-schema.mjs';

// ---------------------------------------------------------------------------
// Sections: die einzige Stelle, an der neue Section-Typen registriert werden.
// Jede Section hat genau einen Typ, typisierte Props und eine Komponente in
// src/components/sections/. Der Agent darf Seiten nur aus diesen Typen bauen.
// ---------------------------------------------------------------------------
import {sectionSchema,pageSchema} from './schemas/page-schema.mjs';
export {sectionSchema};
export type Section = z.infer<typeof sectionSchema>;

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------
const pages = defineCollection({
  loader: glob({ pattern: '**/*.yaml', base: './src/content/pages' }),
  schema: pageSchema,
});

const posts = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
  schema: postSchema,
});

const projects = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/projects' }),
  schema: projectSchema,
});

const faq = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/faq' }),
  schema: faqSchema,
});

// PR 5 uses Astro's loaders directly. Future x-afe annotations are recorded here
// without changing raw values or importing the product package yet.
// packages: editable collection/title/operations, readOnly name, feature-list policy.
const extras = defineCollection({loader:glob({pattern:'**/*.json',base:'./src/content/extras'}),schema:extraSchema});
const packages = defineCollection({
  loader: glob({pattern:'**/*.json',base:'./src/content/packages'}),
  schema: packageSchema,
});
// screens: editable collection/title/i18n, editorial strings and nested list policy.
const screens = defineCollection({
  loader: glob({pattern:'**/*.json',base:'./src/content/screens'}),
  schema: screenSchema,
});
// clients/team: media on shared images, media references on assetId;
// editable collection/title/i18n and media-ownership policy.
const clients = defineCollection({
  loader: glob({pattern:'**/*.json',base:'./src/content/clients'}),
  schema: clientSchema,
});
const team = defineCollection({
  loader: glob({pattern:'**/*.json',base:'./src/content/team'}),
  schema: teamSchema,
});
// media: editable collection/title/operations; upload-owned facts readOnly.
const media = defineCollection({
  loader: glob({pattern:'**/*.json',base:'./src/content/media'}),
  schema: mediaSchema,
});
// Each singleton has its own existing schema. A union would lose the association
// between its filename and schema. Future: singleton(), editable text/url/i18n.
const siteContact = defineCollection({
  loader: glob({pattern:'contact.json',base:'./src/content/site'}),
  schema: siteSchemas.contact,
});
const siteInquiry = defineCollection({
  loader: glob({pattern:'inquiry.json',base:'./src/content/site'}),
  schema: siteSchemas.inquiry,
});
const siteNavigation = defineCollection({
  loader: glob({pattern:'navigation.json',base:'./src/content/site'}),
  schema: siteSchemas.navigation,
});
const siteUi = defineCollection({
  loader: glob({pattern:'ui.json',base:'./src/content/site'}),
  schema: siteSchemas.ui,
});
// Existing overlay documents, not locale entries. Future editable metadata must
// preserve Decision 3's [collection,id,locale,field] identity in product storage.
const translations = defineCollection({
  loader: glob({pattern:'**/*.json',base:'./src/content/translations'}),
  schema: translationSchema,
});

export const collections = {pages,posts,projects,faq,packages,extras,screens,clients,team,media,
  siteContact,siteInquiry,siteNavigation,siteUi,translations};
