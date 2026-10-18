import { logger } from '../utils/logger.js';

export function readCache(key, storage = localStorage) {
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof parsed.savedAt === 'number' &&
      'data' in parsed
    ) {
      return parsed;
    }
  } catch (error) {
    logger.warn('Cache read failed', error);
  }
  return null;
}

export function writeCache(key, data, storage = localStorage, now = Date.now()) {
  try {
    storage.setItem(key, JSON.stringify({ savedAt: now, data }));
    return true;
  } catch (error) {
    logger.warn('Cache write failed', error);
    return false;
  }
}

export function isFresh(entry, ttlMs, now = Date.now()) {
  return now - entry.savedAt < ttlMs;
}
