import { z, defineCollection } from 'astro:content';

// 2. Define a `type` and `schema` for each collection
const scores = defineCollection({
  type: 'data',
  schema: z.object({
    title: z.string(),
    author: z.string(),
    filename:  z.string(),
  }),
});

// 3. Export a single `collections` object to register your collection(s)
export const collections = {
  'scores': scores,
};