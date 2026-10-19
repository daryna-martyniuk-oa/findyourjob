import axe from 'axe-core';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { initHomePage } from '../src/pages/home';
import { initJobPage } from '../src/pages/job';
import { initJobsPage } from '../src/pages/jobs';
import { mockFetchOk, mountPage } from './helpers';

async function violations(): Promise<string[]> {
  document.documentElement.lang = 'uk';
  document.title ||= 'Тестова сторінка';
  const results = await axe.run(document.documentElement, {
    runOnly: {
      type: 'tag',
      values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'],
    },
    rules: { 'color-contrast': { enabled: false } },
  });
  return results.violations.map(
    (v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

describe('axe-core: автоматична перевірка доступності', () => {
  beforeEach(() => {
    localStorage.clear();
    mockFetchOk();
  });
  afterEach(() => vi.unstubAllGlobals());

  it('головна сторінка', async () => {
    mountPage('index.html');
    await initHomePage();
    expect(await violations()).toEqual([]);
  }, 10_000);

  it('каталог вакансій', async () => {
    window.history.replaceState(null, '', '/jobs.html');
    mountPage('jobs.html');
    await initJobsPage();
    expect(await violations()).toEqual([]);
  });

  it('сторінка вакансії', async () => {
    window.history.replaceState(null, '', '/job.html?id=100001');
    mountPage('job.html');
    await initJobPage();
    expect(await violations()).toEqual([]);
  });
});
