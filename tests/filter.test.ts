import { describe, expect, it } from 'vitest';
import {
  annualSalary,
  collectOptions,
  filterJobs,
  normalizeText,
  searchScore,
  sortJobs,
  tokenize,
} from '../src/utils/filter';
import { DEFAULT_FILTERS } from '../src/utils/url-state';
import { makeJob } from './helpers';

const noSaved = new Set<number>();
const f = (patch: Partial<typeof DEFAULT_FILTERS>) => ({ ...DEFAULT_FILTERS, ...patch });

const jobs = [
  makeJob({ id: 1, title: 'React Developer', company: 'Acme', geo: 'Ukraine', level: 'Senior' }),
  makeJob({
    id: 2,
    title: 'Python Engineer',
    company: 'Globex',
    geo: 'USA',
    level: 'Junior',
    types: ['Contract'],
    publishedAt: '2026-10-02T10:00:00+00:00',
    descriptionHtml: '<p>We use <b>React</b> for the admin</p>',
  }),
  makeJob({
    id: 3,
    title: 'DevOps',
    company: 'Initech',
    geo: 'Anywhere',
    level: null,
    publishedAt: '2026-09-20T10:00:00+00:00',
    salary: { min: 5000, max: 6000, currency: 'USD', period: 'monthly' },
  }),
];

describe('normalizeText / tokenize', () => {
  it('прибирає діакритику та регістр', () => {
    expect(normalizeText('Zürich')).toBe('zurich');
  });
  it('розбиває запит на слова', () => {
    expect(tokenize('  React   TS ')).toEqual(['react', 'ts']);
  });
});

describe('searchScore', () => {
  it('0, якщо хоча б одне слово не знайдено', () => {
    expect(searchScore(jobs[0]!, tokenize('react java'))).toBe(0);
  });
  it('збіг у назві важить більше, ніж в описі', () => {
    const inTitle = searchScore(jobs[0]!, tokenize('react'));
    const inDescription = searchScore(jobs[1]!, tokenize('react'));
    expect(inTitle).toBeGreaterThan(inDescription);
    expect(inDescription).toBeGreaterThan(0);
  });
});

describe('filterJobs', () => {
  it('без фільтрів повертає все', () => {
    expect(filterJobs(jobs, DEFAULT_FILTERS, noSaved)).toHaveLength(3);
  });
  it('шукає за кількома словами (AND)', () => {
    expect(filterJobs(jobs, f({ query: 'python globex' }), noSaved).map((j) => j.id)).toEqual([2]);
  });
  it('шукає в описі', () => {
    expect(filterJobs(jobs, f({ query: 'admin' }), noSaved).map((j) => j.id)).toEqual([2]);
  });
  it('фільтрує за рівнем і типом', () => {
    expect(filterJobs(jobs, f({ level: 'Junior' }), noSaved).map((j) => j.id)).toEqual([2]);
    expect(filterJobs(jobs, f({ type: 'Contract' }), noSaved).map((j) => j.id)).toEqual([2]);
  });
  it('фільтрує за регіоном', () => {
    expect(filterJobs(jobs, f({ geo: 'ua' }), noSaved).map((j) => j.id)).toEqual([1, 3]);
  });
  it('фільтрує за Європою та Північною Америкою незалежно', () => {
    expect(filterJobs(jobs, f({ geo: 'europe' }), noSaved).map((j) => j.id)).toEqual([1]);
    expect(filterJobs(jobs, f({ geo: 'north-america' }), noSaved).map((j) => j.id)).toEqual([2]);
  });
  it('лише із зарплатою', () => {
    expect(filterJobs(jobs, f({ salaryOnly: true }), noSaved).map((j) => j.id)).toEqual([3]);
  });
  it('лише збережені', () => {
    expect(filterJobs(jobs, f({ savedOnly: true }), new Set([1])).map((j) => j.id)).toEqual([1]);
  });
});

describe('sortJobs', () => {
  it('за датою: найновіші першими, вхідний масив не змінюється', () => {
    const before = jobs.map((j) => j.id);
    expect(sortJobs(jobs, 'date').map((j) => j.id)).toEqual([2, 1, 3]);
    expect(jobs.map((j) => j.id)).toEqual(before);
  });
  it('за зарплатою: вакансії без зарплати — в кінці', () => {
    expect(sortJobs(jobs, 'salary')[0]!.id).toBe(3);
  });
  it('за назвою та компанією', () => {
    expect(sortJobs(jobs, 'title').map((j) => j.title)).toEqual([
      'DevOps',
      'Python Engineer',
      'React Developer',
    ]);
    expect(sortJobs(jobs, 'company').map((j) => j.company)).toEqual(['Acme', 'Globex', 'Initech']);
  });
  it('за релевантністю: назва вище за опис', () => {
    expect(sortJobs(jobs, 'relevance', 'react').map((j) => j.id)).toEqual([1, 2, 3]);
  });
  it('релевантність без запиту = за датою', () => {
    expect(sortJobs(jobs, 'relevance').map((j) => j.id)).toEqual([2, 1, 3]);
  });
});

describe('annualSalary', () => {
  it('приводить період до року', () => {
    expect(annualSalary(jobs[2]!)).toBe(72000);
  });
  it('-1, якщо зарплати немає', () => {
    expect(annualSalary(jobs[0]!)).toBe(-1);
  });
});

describe('collectOptions', () => {
  it('збирає унікальні відсортовані значення', () => {
    expect(collectOptions(jobs, 'level')).toEqual(['Junior', 'Senior']);
    expect(collectOptions(jobs, 'types')).toEqual(['Contract', 'Full-Time']);
  });
  it('сортує рівні від початкового до директорського', () => {
    const levels = [
      makeJob({ id: 4, level: 'Director' }),
      makeJob({ id: 5, level: 'Senior' }),
      makeJob({ id: 6, level: 'Midweight' }),
      makeJob({ id: 7, level: 'Entry-Level' }),
      makeJob({ id: 8, level: 'Junior' }),
    ];
    expect(collectOptions(levels, 'level')).toEqual([
      'Entry-Level',
      'Junior',
      'Midweight',
      'Senior',
      'Director',
    ]);
  });
});
