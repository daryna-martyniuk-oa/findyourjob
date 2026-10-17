import { resolve } from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        jobs: resolve(__dirname, 'jobs.html'),
        job: resolve(__dirname, 'job.html')
      }
    }
  }
});