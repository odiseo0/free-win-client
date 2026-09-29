// @ts-check
import { defineConfig, sessionDrivers } from 'astro/config';

import svelte from '@astrojs/svelte';
import node from '@astrojs/node';

import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  output: 'server',
  adapter: node({ mode: 'standalone' }),
  session: {
    driver: sessionDrivers.fsLite({ base: '/tmp/astro-sessions' })
  },
  integrations: [svelte()],

  vite: {
    plugins: [tailwindcss()]
  }
});
