import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const page = (file: string): string => fileURLToPath(new URL(file, import.meta.url));

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        index: page('index.html'),
        jobs: page('jobs.html'),
        job: page('job.html'),
      },
    },
  },
});
