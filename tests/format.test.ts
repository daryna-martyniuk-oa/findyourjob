import { describe, expect, it } from 'vitest';
import { formatDate, formatRelative, formatSalary, pluralUk } from '../src/utils/format';

const norm = (s: string | null): string => (s ?? '').replace(/\s/g, ' ');

describe('formatSalary', () => {
  it('null без зарплати', () => {
    expect(formatSalary(null)).toBeNull();
    expect(formatSalary({ min: null, max: null, currency: 'USD', period: null })).toBeNull();
  });
  it('діапазон з валютою та періодом', () => {
    const result = norm(
      formatSalary({ min: 60000, max: 90000, currency: 'USD', period: 'yearly' }),
    );
    expect(result).toMatch(/60 000.*–.*90 000.*\/ рік/);
    expect(result).toContain('$');
  });
  it('одне значення, якщо min = max або задано лише одне', () => {
    expect(
      norm(formatSalary({ min: 5000, max: null, currency: 'EUR', period: 'monthly' })),
    ).toMatch(/^5 000.*\/ міс\.$/);
    expect(formatSalary({ min: 10, max: 10, currency: null, period: 'hourly' })).toBe('10 / год.');
  });
  it('не падає на некоректній валюті', () => {
    expect(formatSalary({ min: 1000, max: null, currency: 'ZZZZ', period: null })).toBeTruthy();
  });
});

describe('formatRelative', () => {
  const now = new Date('2026-10-04T12:00:00Z');
  it('сьогодні / вчора / дні тому', () => {
    expect(formatRelative('2026-10-04T08:00:00Z', now)).toBe('сьогодні');
    expect(formatRelative('2026-10-03T08:00:00Z', now)).toMatch(/^[ву]чора$/);
    expect(formatRelative('2026-10-01T08:00:00Z', now)).toContain('3');
  });
  it('місяці та некоректна дата', () => {
    expect(formatRelative('2026-07-01T08:00:00Z', now)).toMatch(/міс/);
    expect(formatRelative('not-a-date', now)).toBe('');
  });
});

describe('formatDate', () => {
  it('форматує українською, порожньо для сміття', () => {
    expect(formatDate('2026-10-03T12:00:00Z')).toMatch(/2026/);
    expect(formatDate('???')).toBe('');
  });
});

describe('pluralUk', () => {
  const forms = ['вакансія', 'вакансії', 'вакансій'] as const;
  it.each([
    [1, 'вакансія'],
    [2, 'вакансії'],
    [5, 'вакансій'],
    [11, 'вакансій'],
    [21, 'вакансія'],
    [0, 'вакансій'],
  ])('%i → %s', (n, expected) => {
    expect(pluralUk(n, forms)).toBe(expected);
  });
});
