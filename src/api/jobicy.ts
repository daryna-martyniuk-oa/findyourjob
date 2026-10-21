import type { Job, LoadResult } from '../types/job';
import { STORAGE_KEYS } from '../config';
import { logger } from '../utils/logger';
import { isFresh, readCache, writeCache } from './cache';
import { isRecord, normalizeJob } from './normalize';

export const API_URL = 'https://jobicy.com/api/v2/remote-jobs';
export const INDUSTRIES = ['engineering', 'dev', 'data-science'] as const;
export const MAX_COUNT = 200;
export const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;

export type ApiErrorKind = 'network' | 'timeout' | 'http' | 'parse';

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | undefined;

  constructor(kind: ApiErrorKind, message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function buildUrl(industry: string, count: number = MAX_COUNT): string {
  const url = new URL(API_URL);
  url.searchParams.set('count', String(count));
  url.searchParams.set('industry', industry);
  return url.toString();
}

const useFixture = (): boolean => import.meta.env.VITE_USE_FIXTURE === 'true';

export function fixtureUrl(): string {
  return `${import.meta.env.BASE_URL}fixtures/jobs.json`;
}

const FIXTURE_MODE_MESSAGE = 'Режим розробки: використовуються локальні тестові дані';
const FIXTURE_FALLBACK_MESSAGE = 'API тимчасово недоступне — показано локальний знімок';

async function loadSnapshot(message: string, signal?: AbortSignal): Promise<LoadResult> {
  const jobs = extractJobs(await fetchJson(fixtureUrl(), signal));
  logger.debug('Fixture snapshot:', jobs.length, 'jobs');
  return { jobs, source: 'snapshot', fetchedAt: Date.now(), isSnapshot: true, message };
}

async function fetchJson(url: string, signal?: AbortSignal): Promise<unknown> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = (): void => controller.abort();
  signal?.addEventListener('abort', forwardAbort, { once: true });

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new ApiError('http', `HTTP ${response.status}`, response.status);
    try {
      return await response.json();
    } catch {
      throw new ApiError('parse', 'Відповідь не є коректним JSON');
    }
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (timedOut) throw new ApiError('timeout', 'Перевищено час очікування відповіді');
    if (signal?.aborted) throw error;
    throw new ApiError('network', error instanceof Error ? error.message : 'Network error');
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

export function extractJobs(payload: unknown): Job[] {
  if (!isRecord(payload) || !Array.isArray(payload.jobs)) {
    throw new ApiError('parse', 'Неочікувана структура відповіді');
  }
  return payload.jobs.map(normalizeJob).filter((job): job is Job => job !== null);
}

export function dedupeById(jobs: readonly Job[]): Job[] {
  return [...new Map(jobs.map((job) => [job.id, job])).values()];
}

async function fetchAllIndustries(signal?: AbortSignal): Promise<Job[]> {
  const results = await Promise.allSettled(
    INDUSTRIES.map(async (industry) => extractJobs(await fetchJson(buildUrl(industry), signal))),
  );
  const jobs: Job[] = [];
  let firstError: unknown;
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') {
      jobs.push(...result.value);
    } else {
      firstError ??= result.reason;
      logger.warn(`Категорія "${INDUSTRIES[index]}" не завантажилась`, result.reason);
    }
  });
  if (jobs.length === 0 && firstError) throw firstError;
  return dedupeById(jobs);
}

export interface LoadOptions {
  force?: boolean;
  signal?: AbortSignal;
}

export async function loadJobs(options: LoadOptions = {}): Promise<LoadResult> {
  if (useFixture()) {
    return loadSnapshot(FIXTURE_MODE_MESSAGE, options.signal);
  }

  const cached = readCache<Job[]>(STORAGE_KEYS.jobs);
  if (!options.force && cached && isFresh(cached, CACHE_TTL_MS)) {
    logger.debug('Cache hit:', cached.data.length, 'jobs');
    return { jobs: cached.data, source: 'cache', fetchedAt: cached.savedAt, isSnapshot: false };
  }

  try {
    const jobs = await fetchAllIndustries(options.signal);
    if (!writeCache(STORAGE_KEYS.jobs, jobs)) {
      writeCache(
        STORAGE_KEYS.jobs,
        jobs.map((job) => ({ ...job, descriptionHtml: '' })),
      );
    }
    logger.debug('Network:', jobs.length, 'jobs');
    return { jobs, source: 'network', fetchedAt: Date.now(), isSnapshot: false };
  } catch (error) {
    if (options.signal?.aborted) throw error;

    try {
      const snapshot = await loadSnapshot(FIXTURE_FALLBACK_MESSAGE, options.signal);
      logger.warn('Jobicy API unavailable — using local snapshot', error);
      return snapshot;
    } catch (fixtureError) {
      if (options.signal?.aborted) throw fixtureError;
      logger.warn('Local fixture fallback failed', fixtureError);
    }

    if (cached) {
      logger.warn('Мережа недоступна — використовуємо застарілий кеш', error);
      return {
        jobs: cached.data,
        source: 'stale-cache',
        fetchedAt: cached.savedAt,
        isSnapshot: false,
      };
    }
    throw error;
  }
}
