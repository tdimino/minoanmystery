// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import icon from 'astro-icon';
import vercel from '@astrojs/vercel';

// https://astro.build/config
export default defineConfig({
  site: 'https://www.minoanmystery.org',
  trailingSlash: 'never',
  output: 'static',
  adapter: vercel({
    maxDuration: 60,
  }),
  integrations: [
    sitemap(),
    icon({
      include: {
        // Lucide - Clean, consistent icons
        lucide: ['*'],
        // Iconoir - Modern, minimal icons
        iconoir: ['*'],
        // Phosphor - Flexible icon family
        ph: ['*'],
        // Tabler - Over 4000 pixel-perfect icons
        tabler: ['*'],
        // Heroicons - Beautiful hand-crafted SVG icons
        heroicons: ['*'],
        // Radix - UI component icons
        'radix-icons': ['*'],
        // Remix - Open source icon set
        ri: ['*'],
        // MingCute - Cute style icons
        mingcute: ['*'],
        // Hugeicons - Huge collection
        hugeicons: ['*'],
        // Simple Icons - Brand/logo icons
        'simple-icons': ['*'],
        // Devicon - Developer tool icons
        devicon: ['*'],
        // Skill Icons - Developer skill badges
        'skill-icons': ['*'],
      },
    }),
  ],
  vite: {
    css: {
      transformer: 'lightningcss',
    },
  },
});
