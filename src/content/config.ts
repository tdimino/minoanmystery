import { defineCollection, z } from 'astro:content';

const portfolio = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    client: z.string(),
    team: z.string(),
    role: z.string(),
    website: z.string().url(),
    heroImage: z.string(),
    summary: z.string(),
    order: z.number(),
    galleryProcess: z.array(z.object({
      src: z.string(),
      alt: z.string(),
    })).optional(),
    gallerySolution: z.array(z.object({
      src: z.string(),
      alt: z.string(),
    })).optional(),
    captionProcess: z.string().optional(),
    captionSolution: z.string().optional(),
  }),
});

export const collections = { portfolio };
