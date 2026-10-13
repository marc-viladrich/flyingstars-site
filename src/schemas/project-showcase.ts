import {z} from 'astro/zod';
import {projectShowcaseSchema} from './project-showcase.mjs';
export {projectShowcaseSchema};
export type ProjectShowcase=z.infer<typeof projectShowcaseSchema>;
