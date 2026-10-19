import type { Filters, SortKey } from '../types/filters';
import type { Job } from '../types/job';
import { matchesGeoMode } from './geo';

export function normalizeText(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase();
}

export function tokenize(query: string): string[] {
  return normalizeText(query).split(/\s+/).filter(Boolean);
}

interface SearchIndex {
  title: string;
  company: string;
  rest: string;
}

const indexCache = new WeakMap<Job, SearchIndex>();

function stripTags(html: string): string {
  return html.replace(/<[^>]*>/g, ' ');
}

function getIndex(job: Job): SearchIndex {
  let index = indexCache.get(job);
  if (!index) {
    index = {
      title: normalizeText(job.title),
      company: normalizeText(job.company),
      rest: normalizeText(
        [
          job.excerpt,
          job.geo,
          job.level ?? '',
          ...job.industries,
          ...job.types,
          stripTags(job.descriptionHtml),
        ].join(' '),
      ),
    };
    indexCache.set(job, index);
  }
  return index;
}

export function searchScore(job: Job, tokens: readonly string[]): number {
  if (tokens.length === 0) return 1;
  const { title, company, rest } = getIndex(job);
  let total = 0;
  for (const token of tokens) {
    let score = 0;
    if (title.includes(token)) {
      score += title.startsWith(token) || title.includes(` ${token}`) ? 8 : 5;
    }
    if (company.includes(token)) score += 3;
    if (rest.includes(token)) score += 1;
    if (score === 0) return 0;
    total += score;
  }
  return total;
}

const ANNUAL_MULTIPLIER: Record<string, number> = {
  year: 1,
  yearly: 1,
  annual: 1,
  annually: 1,
  month: 12,
  monthly: 12,
  week: 52,
  weekly: 52,
  day: 260,
  daily: 260,
  hour: 2080,
  hourly: 2080,
};

export function annualSalary(job: Job): number {
  const salary = job.salary;
  const amount = salary?.max ?? salary?.min ?? null;
  if (!salary || amount === null) return -1;
  const multiplier = ANNUAL_MULTIPLIER[(salary.period ?? '').toLowerCase()] ?? 1;
  return amount * multiplier;
}

function timestamp(job: Job): number {
  const time = Date.parse(job.publishedAt);
  return Number.isNaN(time) ? 0 : time;
}

const byDateDesc = (a: Job, b: Job): number => timestamp(b) - timestamp(a);
const byText = (a: string, b: string): number => a.localeCompare(b, 'en', { sensitivity: 'base' });

const LEVEL_ORDER: readonly { rank: number; terms: readonly string[] }[] = [
  { rank: 0, terms: ['entry', 'junior', 'intern', 'graduate'] },
  { rank: 1, terms: ['midweight', 'mid-level', 'mid level', 'intermediate'] },
  { rank: 2, terms: ['senior'] },
  { rank: 3, terms: ['lead', 'principal', 'staff'] },
  { rank: 4, terms: ['director', 'executive', 'head'] },
];

function levelRank(level: string): number {
  const normalized = normalizeText(level);
  return (
    LEVEL_ORDER.find(({ terms }) => terms.some((term) => normalized.includes(term)))?.rank ??
    LEVEL_ORDER.length
  );
}

function bySeniority(a: string, b: string): number {
  return levelRank(a) - levelRank(b) || byText(a, b);
}

export function filterJobs(
  jobs: readonly Job[],
  filters: Filters,
  savedIds: ReadonlySet<number>,
): Job[] {
  const tokens = tokenize(filters.query);
  return jobs.filter((job) => {
    if (filters.level && job.level !== filters.level) return false;
    if (filters.type && !job.types.includes(filters.type)) return false;
    if (!matchesGeoMode(job.geo, filters.geo)) return false;
    if (filters.salaryOnly && annualSalary(job) < 0) return false;
    if (filters.savedOnly && !savedIds.has(job.id)) return false;
    return searchScore(job, tokens) > 0;
  });
}

export function sortJobs(jobs: readonly Job[], sort: SortKey, query = ''): Job[] {
  const list = [...jobs];
  switch (sort) {
    case 'relevance': {
      const tokens = tokenize(query);
      if (tokens.length === 0) return list.sort(byDateDesc);
      const scores = new Map(list.map((job) => [job.id, searchScore(job, tokens)]));
      return list.sort(
        (a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || byDateDesc(a, b),
      );
    }
    case 'date':
      return list.sort(byDateDesc);
    case 'salary':
      return list.sort((a, b) => annualSalary(b) - annualSalary(a) || byDateDesc(a, b));
    case 'title':
      return list.sort((a, b) => byText(a.title, b.title));
    case 'company':
      return list.sort((a, b) => byText(a.company, b.company) || byDateDesc(a, b));
  }
}

export function collectOptions(jobs: readonly Job[], field: 'level' | 'types'): string[] {
  const values = new Set<string>();
  for (const job of jobs) {
    if (field === 'level') {
      if (job.level) values.add(job.level);
    } else {
      job.types.forEach((type) => values.add(type));
    }
  }
  return [...values].sort(field === 'level' ? bySeniority : byText);
}
