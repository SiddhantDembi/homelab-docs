// @ts-check
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  adapter: cloudflare({
    inspectorPort: false,
    prerenderEnvironment: 'node',
  }),
  site: 'https://docs.dembi.xyz',
  integrations: [sitemap()]
});
