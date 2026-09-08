// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import { satteri } from '@astrojs/markdown-satteri';
import sitemap from '@astrojs/sitemap';
import { responsiveTables } from './src/lib/responsive-tables.mjs';

export default defineConfig({
  adapter: cloudflare({
    inspectorPort: false,
    prerenderEnvironment: 'node',
  }),
  markdown: {
    processor: satteri({
      hastPlugins: [responsiveTables()],
    }),
  },
  site: 'https://siddhantdembi.com',
  integrations: [sitemap()]
});
