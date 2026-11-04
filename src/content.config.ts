import contactData from './content/contact.json' with {type:'json'};
import {contactSchema} from './schemas/contact.mjs';
contactSchema.parse(contactData);
import navigationData from './content/navigation.json' with {type:'json'};
import {navigationSchema} from './schemas/navigation.mjs';
navigationSchema.parse(navigationData);
import packageData from './content/show-packages.json' with {type:'json'};
import {showPackagesSchema} from './schemas/show-packages.mjs';
showPackagesSchema.parse(packageData);
import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import type { z } from 'astro/zod';
import { sectionSchema, contentSchemas } from './schemas/content-schema.mjs';

// Public rendering and the editor consume the same Zod instances.
export { sectionSchema };
export type Section = z.infer<typeof sectionSchema>;
export const collections = {
  pages: defineCollection({ loader: glob({ pattern: '**/*.yaml', base: './src/content/pages', generateId: ({ entry }) => entry.replace(/\.yaml$/, '') }), schema: contentSchemas.pages }),
  posts: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/posts' }), schema: contentSchemas.posts }),
  projects: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/projects' }), schema: contentSchemas.projects }),
  faq: defineCollection({ loader: glob({ pattern: '**/*.md', base: './src/content/faq' }), schema: contentSchemas.faq }),
};
