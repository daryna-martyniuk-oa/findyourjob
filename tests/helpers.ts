import { vi } from 'vitest';
import indexHtml from '../index.html?raw';
import jobHtml from '../job.html?raw';
import jobsHtml from '../jobs.html?raw';
import type { Job } from '../src/types/job';
import sample from './sample-jobs.json';

export const fixture = sample;
export const sampleJobs = sample.jobs as unknown as Job[];

export function makeJob(overrides: Partial<Job> = {}): Job {
  return {
    id: 1,
    url: 'https://jobicy.com/jobs/1',
    title: 'Frontend Developer',
    company: 'Acme',
    logo: null,
    industries: ['Software Engineering'],
    types: ['Full-Time'],
    geo: 'Anywhere',
    level: 'Senior',
    excerpt: 'Build interfaces',
    descriptionHtml: '<p>React and TypeScript</p>',
    publishedAt: '2026-10-01T10:00:00+00:00',
    salary: null,
    ...overrides,
  };
}

const htmlTemplates: Record<string, string> = {
  'index.html': indexHtml,
  'jobs.html': jobsHtml,
  'job.html': jobHtml,
};

export function mountPage(file: string): void {
  const html = htmlTemplates[file] || '';
  const body = /<body[^>]*>([\s\S]*)<\/body>/.exec(html)?.[1] ?? '';
  document.body.innerHTML = body.replace(/<script[\s\S]*?<\/script>/g, '');
}

export function mockFetchOk(payload: unknown = fixture) {
  const fn = vi.fn(async () => new Response(JSON.stringify(payload), { status: 200 }));
  vi.stubGlobal('fetch', fn);
  return fn;
}

export const wait = (ms = 0): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));
