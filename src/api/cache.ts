import { logger } from '../utils/logger';

export interface CacheEntry<T> {
  savedAt: number;
  data: T;
}

export function readCache<T>(key: string, storage: Storage = localStorage): CacheEntry<T> | null {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as CacheEntry<T>).savedAt === 'number' &&
      'data' in parsed
    ) {
      return parsed as CacheEntry<T>;
    }
  } catch (error) {
    logger.warn('Cache read failed', error);
  }
  return null;
}

export function writeCache<T>(
  key: string,
  data: T,
  storage: Storage = localStorage,
  now: number = Date.now(),
): boolean {
  try {
    storage.setItem(key, JSON.stringify({ savedAt: now, data } satisfies CacheEntry<T>));
    return true;
  } catch (error) {
    logger.warn('Cache write failed', error);
    return false;
  }
}

export function isFresh(
  entry: CacheEntry<unknown>,
  ttlMs: number,
  now: number = Date.now(),
): boolean {
  return now - entry.savedAt < ttlMs;
}
