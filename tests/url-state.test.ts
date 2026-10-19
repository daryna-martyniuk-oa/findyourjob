import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, parseFilters, serializeFilters } from '../src/utils/url-state';

describe('url-state', () => {
  it('порожній URL → значення за замовчуванням', () => {
    expect(parseFilters('')).toEqual(DEFAULT_FILTERS);
  });
  it('типові фільтри не потрапляють в URL', () => {
    expect(serializeFilters(DEFAULT_FILTERS)).toBe('');
  });
  it('круговий обмін parse ↔ serialize', () => {
    const filters = {
      query: 'react native',
      level: 'Senior',
      type: 'Full-Time',
      geo: 'europe' as const,
      salaryOnly: true,
      savedOnly: true,
      sort: 'salary' as const,
    };
    expect(parseFilters(serializeFilters(filters))).toEqual(filters);
  });
  it('ігнорує невалідні geo і sort', () => {
    const parsed = parseFilters('?geo=mars&sort=banana');
    expect(parsed.geo).toBe('all');
    expect(parsed.sort).toBe('relevance');
  });
  it('переносить старий параметр Європи на нову категорію', () => {
    expect(parseFilters('?geo=ua-eu').geo).toBe('europe');
  });
  it('обрізає надто довгий запит', () => {
    expect(parseFilters(`?q=${'a'.repeat(500)}`).query).toHaveLength(100);
  });
});
