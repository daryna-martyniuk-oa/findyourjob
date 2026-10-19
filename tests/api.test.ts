import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeCache } from '../src/api/cache';
import { ApiError, buildUrl, loadJobs } from '../src/api/jobicy';
import { STORAGE_KEYS } from '../src/config';
import { fixture, makeJob, mockFetchOk } from './helpers';

describe('buildUrl', () => {
  it('формує адресу з count та industry', () => {
    const url = new URL(buildUrl('engineering', 50));
    expect(url.origin + url.pathname).toBe('https://jobicy.com/api/v2/remote-jobs');
    expect(url.searchParams.get('industry')).toBe('engineering');
    expect(url.searchParams.get('count')).toBe('50');
  });
});

describe('loadJobs', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => vi.unstubAllGlobals());

  it('завантажує з мережі, прибирає дублікати між категоріями й кешує', async () => {
    const fetchMock = mockFetchOk();
    const first = await loadJobs();
    expect(first.source).toBe('network');
    expect(first.jobs).toHaveLength(24); // fixture повертається для кожної категорії, дублікатів немає
    expect(fetchMock).toHaveBeenCalledTimes(3);

    const second = await loadJobs();
    expect(second.source).toBe('cache');
    expect(fetchMock).toHaveBeenCalledTimes(3); // нових запитів немає
  });

  it('force ігнорує свіжий кеш', async () => {
    const fetchMock = mockFetchOk();
    await loadJobs();
    await loadJobs({ force: true });
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('якщо одна категорія впала, решта все одно показується', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) =>
        url.includes('industry=dev')
          ? new Response('boom', { status: 500 })
          : new Response(JSON.stringify(fixture), { status: 200 }),
      ),
    );
    const result = await loadJobs();
    expect(result.jobs.length).toBeGreaterThan(0);
  });

  it('HTTP-помилка без кешу → ApiError(http)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('x', { status: 503 })),
    );
    await expect(loadJobs()).rejects.toMatchObject({ kind: 'http', status: 503 });
  });

  it('мережева помилка без кешу → ApiError(network)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('Failed to fetch'))),
    );
    const error = await loadJobs().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).kind).toBe('network');
  });

  it('некоректний JSON → ApiError(parse)', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('<html>', { status: 200 })),
    );
    await expect(loadJobs()).rejects.toMatchObject({ kind: 'parse' });
  });

  it('при помилці мережі віддає застарілий кеш', async () => {
    const old = Date.now() - 5 * 60 * 60 * 1000;
    writeCache(STORAGE_KEYS.jobs, [makeJob({ id: 7 })], localStorage, old);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => Promise.reject(new TypeError('offline'))),
    );
    const result = await loadJobs();
    expect(result.source).toBe('stale-cache');
    expect(result.jobs[0]?.id).toBe(7);
  });
});
