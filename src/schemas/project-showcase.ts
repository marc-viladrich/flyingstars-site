import {z} from 'astro/zod';
import {projectShowcaseSchema} from './project-showcase.mjs';
export {projectShowcaseSchema};
export type ProjectShowcase=z.infer<typeof projectShowcaseSchema>;

// Astro resolves the native ID at the collection boundary.
export type ResolvedProjectShowcase=Omit<ProjectShowcase,'nextProject'> & {nextProject:{id:string;collection:'projects'}};
