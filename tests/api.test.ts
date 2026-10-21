import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeCache } from '../src/api/cache';
import { ApiError, buildUrl, loadJobs } from '../src/api/jobicy';
import { STORAGE_KEYS } from '../src/config';
import { describeSource } from '../src/components/status';
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
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

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

  it('при помилці API завантажує локальний snapshot і повертає його повідомлення', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes('fixtures/jobs.json')) {
        return new Response(JSON.stringify(fixture), { status: 200 });
      }
      throw new TypeError('offline');
    });
    vi.stubGlobal('fetch', fetchMock);

    const result = await loadJobs();

    expect(result.source).toBe('snapshot');
    expect(result.isSnapshot).toBe(true);
    expect(describeSource(result)).toBe('API тимчасово недоступне — показано локальний знімок');
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('у fixture mode завантажує лише snapshot і пояснює режим', async () => {
    vi.stubEnv('VITE_USE_FIXTURE', 'true');
    const fetchMock = vi.fn(async (url: string) =>
      url.includes('fixtures/jobs.json')
        ? new Response(JSON.stringify(fixture), { status: 200 })
        : new Response('unexpected API request', { status: 500 }),
    );
    vi.stubGlobal('fetch', fetchMock);

    const result = await loadJobs();

    expect(result.source).toBe('snapshot');
    expect(result.isSnapshot).toBe(true);
    expect(describeSource(result)).toBe('Режим розробки: використовуються локальні тестові дані');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('fixtures/jobs.json');
  });

  it('для успішної мережі не показує повідомлення про snapshot', async () => {
    mockFetchOk();
    const result = await loadJobs({ force: true });
    expect(result.source).toBe('network');
    expect(result.isSnapshot).toBe(false);
    expect(describeSource(result)).not.toContain('знімок');
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
