import { describe, expect, it } from 'vitest';
import { extractJobs } from '../src/api/jobicy';
import { decodeEntities, normalizeJob } from '../src/api/normalize';
import { safeHttpUrl } from '../src/utils/safe-url';
import { sanitizeHtml } from '../src/utils/sanitize';
const raw = {
  id: 42,
  url: 'https://jobicy.com/jobs/42-x',
  jobTitle: 'R&amp;D Engineer',
  companyName: 'Acme',
  companyLogo: 'https://jobicy.com/logo.png',
  jobIndustry: ['Software Engineering'],
  jobType: ['Full-Time'],
  jobGeo: 'Europe, Ukraine',
  jobLevel: 'Senior',
  jobExcerpt: 'Short',
  jobDescription: '<p>Full</p>',
  pubDate: '2026-10-01T10:00:00+00:00',
  salaryMin: 3000,
  salaryMax: '5000',
  salaryCurrency: 'USD',
  salaryPeriod: 'monthly',
};

describe('normalizeJob', () => {
  it('перетворює DTO на доменну модель', () => {
    const job = normalizeJob(raw);
    expect(job).toMatchObject({
      id: 42,
      title: 'R&D Engineer',
      geo: 'Europe, Ukraine',
      level: 'Senior',
      salary: { min: 3000, max: 5000, currency: 'USD', period: 'monthly' },
    });
  });
  it('відсутні необов’язкові поля → null / порожні значення', () => {
    const job = normalizeJob({ id: 1, url: 'https://x.io/1', jobTitle: 'T' });
    expect(job).toMatchObject({ logo: null, level: null, salary: null, types: [], industries: [] });
  });
  it('jobLevel "Any" не вважається рівнем', () => {
    expect(normalizeJob({ ...raw, jobLevel: 'Any' })?.level).toBeNull();
  });
  it('приймає рядок замість масиву в jobType', () => {
    expect(normalizeJob({ ...raw, jobType: 'Contract' })?.types).toEqual(['Contract']);
  });
  it('нормалізує альтернативні назви поля локації', () => {
    expect(
      normalizeJob({ ...raw, jobGeo: undefined, candidate_required_location: ['Canada', 'USA'] })
        ?.geo,
    ).toBe('Canada, USA');
    expect(normalizeJob({ ...raw, jobGeo: undefined, location: 'Germany' })?.geo).toBe('Germany');
    expect(normalizeJob({ ...raw, candidate_required_location: 'Canada' })?.geo).toBe(
      'Europe, Ukraine',
    );
  });
  it.each([
    null,
    'str',
    5,
    [],
    { id: 'x' },
    { ...raw, url: 'javascript:alert(1)' },
    { ...raw, jobTitle: '' },
  ])('відкидає некоректний елемент %#', (value) => {
    expect(normalizeJob(value)).toBeNull();
  });
  it('небезпечний URL логотипа відкидається', () => {
    expect(normalizeJob({ ...raw, companyLogo: 'javascript:alert(1)' })?.logo).toBeNull();
  });
});

describe('extractJobs', () => {
  it('фільтрує некоректні елементи', () => {
    expect(extractJobs({ jobs: [raw, null, { id: 1 }] })).toHaveLength(1);
  });
  it('кидає ApiError(parse) при неправильній структурі', () => {
    expect(() => extractJobs({ nope: true })).toThrowError(/структура/);
    expect(() => extractJobs(null)).toThrowError();
  });
});

describe('безпека', () => {
  it('sanitizeHtml прибирає скрипти й обробники подій', () => {
    const html = sanitizeHtml(
      '<p onclick="x()">Hi</p><script>alert(1)</script><img src=x onerror="alert(1)"><a href="https://a.io">l</a>',
    );
    expect(html).not.toMatch(/script|onerror|onclick/i);
    expect(html).toContain('<p>Hi</p>');
    expect(html).toContain('rel="noopener noreferrer"');
  });
  it('sanitizeHtml додає alt до зображень без нього', () => {
    expect(sanitizeHtml('<img src="https://a.io/x.png">')).toContain('alt=""');
    expect(sanitizeHtml('<img src="https://a.io/x.png" alt="Logo">')).toContain('alt="Logo"');
  });
  it('safeHttpUrl пропускає лише http(s)', () => {
    expect(safeHttpUrl('https://a.io/x')).toBe('https://a.io/x');
    expect(safeHttpUrl('javascript:alert(1)')).toBeNull();
    expect(safeHttpUrl('data:text/html,hi')).toBeNull();
    expect(safeHttpUrl(5)).toBeNull();
  });
  it('decodeEntities не виконує теги', () => {
    expect(decodeEntities('A &amp; B')).toBe('A & B');
    expect(decodeEntities('plain')).toBe('plain');
  });
});
