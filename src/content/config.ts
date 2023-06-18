import { z, defineCollection } from 'astro:content';

const scores = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    filename:  z.string(),
  }),
});

export const collections = {
  'scores': scores,
};