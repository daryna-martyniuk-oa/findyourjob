import { STORAGE_KEYS } from '../config.js';
import { logger } from '../utils/logger.js';
import { isFresh, readCache, writeCache } from './cache.js';
import { isRecord, normalizeJob } from './normalize.js';

export const API_URL = 'https://jobicy.com/api/v2/remote-jobs';
export const INDUSTRIES = ['engineering', 'dev', 'data-science'];
export const MAX_COUNT = 200;
export const CACHE_TTL_MS = 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  constructor(kind, message, status) {
    super(message);
    this.name = 'ApiError';
    this.kind = kind;
    this.status = status;
  }
}

export function buildUrl(industry, count = MAX_COUNT) {
  const url = new URL(API_URL);
  url.searchParams.set('count', String(count));
  url.searchParams.set('industry', industry);
  return url.toString();
}

const useFixture = () => import.meta.env.VITE_USE_FIXTURE === 'true';

export function fixtureUrl() {
  return `${import.meta.env.BASE_URL}fixtures/jobs.json`;
}

async function fetchJson(url, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, REQUEST_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
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

export function extractJobs(payload) {
  if (!isRecord(payload) || !Array.isArray(payload.jobs)) {
    throw new ApiError('parse', 'Неочікувана структура відповіді');
  }
  return payload.jobs.map(normalizeJob).filter((job) => job !== null);
}

export function dedupeById(jobs) {
  return [...new Map(jobs.map((job) => [job.id, job])).values()];
}

async function fetchAllIndustries(signal) {
  const results = await Promise.allSettled(
    INDUSTRIES.map(async (industry) => extractJobs(await fetchJson(buildUrl(industry), signal))),
  );
  const jobs = [];
  let firstError;
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

export async function loadJobs(options = {}) {
  if (useFixture()) {
    const jobs = extractJobs(await fetchJson(fixtureUrl(), options.signal));
    logger.debug('Fixture mode:', jobs.length, 'jobs');
    return { jobs, source: 'fixture', fetchedAt: Date.now() };
  }

  const cached = readCache(STORAGE_KEYS.jobs);
  if (!options.force && cached && isFresh(cached, CACHE_TTL_MS)) {
    logger.debug('Cache hit:', cached.data.length, 'jobs');
    return { jobs: cached.data, source: 'cache', fetchedAt: cached.savedAt };
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
    return { jobs, source: 'network', fetchedAt: Date.now() };
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (cached) {
      logger.warn('Мережа недоступна — використовуємо застарілий кеш', error);
      return { jobs: cached.data, source: 'stale-cache', fetchedAt: cached.savedAt };
    }
    throw error;
  }
}
