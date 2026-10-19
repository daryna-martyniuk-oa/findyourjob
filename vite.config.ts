import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

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
  test: {
    environment: 'jsdom',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['./tests/setup.ts'],
  },
});
