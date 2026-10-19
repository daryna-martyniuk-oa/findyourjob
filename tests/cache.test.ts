import { beforeEach, describe, expect, it } from 'vitest';
import { isFresh, readCache, writeCache } from '../src/api/cache';

describe('cache', () => {
  beforeEach(() => localStorage.clear());

  it('записує та читає значення', () => {
    expect(writeCache('k', { a: 1 }, localStorage, 1000)).toBe(true);
    expect(readCache<{ a: number }>('k')).toEqual({ savedAt: 1000, data: { a: 1 } });
  });
  it('повертає null, якщо ключа немає або дані пошкоджені', () => {
    expect(readCache('missing')).toBeNull();
    localStorage.setItem('bad', '{not json');
    expect(readCache('bad')).toBeNull();
    localStorage.setItem('shape', JSON.stringify({ foo: 1 }));
    expect(readCache('shape')).toBeNull();
  });
  it('isFresh враховує TTL', () => {
    const entry = { savedAt: 1000, data: null };
    expect(isFresh(entry, 500, 1400)).toBe(true);
    expect(isFresh(entry, 500, 1500)).toBe(false);
  });
  it('writeCache повертає false, якщо сховище кидає помилку', () => {
    const broken = {
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    } as unknown as Storage;
    expect(writeCache('k', 1, broken)).toBe(false);
  });
});
