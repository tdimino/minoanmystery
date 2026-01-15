import { defineCollection, z } from 'astro:content';

// Gallery image schema for lightbox galleries
const galleryImageSchema = z.object({
  src: z.string(),
  caption: z.string(),
});

// Gallery schema - each gallery is triggered by a specific inline image
const gallerySchema = z.object({
  id: z.string(),
  trigger: z.string(), // filename that triggers this gallery
  images: z.array(galleryImageSchema),
});

const portfolio = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    client: z.string(),
    team: z.string(),
    role: z.string(),
    website: z.string().url(),
    heroImage: z.string(),
    parallaxImage: z.string().optional(),
    tagline: z.string().optional(),
    summary: z.string(),
    duration: z.string().optional(),
    order: z.number(),
    category: z.enum(['enterprise', 'startup', 'nonprofit', 'ai']).optional(),
    tags: z.array(z.string()).optional(),
    galleries: z.array(gallerySchema).optional(),
  }),
});

export const collections = { portfolio };
