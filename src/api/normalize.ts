import type { Job, Salary } from '../types/job';
import { safeHttpUrl } from '../utils/safe-url';

export interface JobicyJobDto {
  id?: unknown;
  url?: unknown;
  jobSlug?: unknown;
  jobTitle?: unknown;
  companyName?: unknown;
  companyLogo?: unknown;
  jobIndustry?: unknown;
  jobType?: unknown;
  jobGeo?: unknown;
  candidate_required_location?: unknown;
  location?: unknown;
  jobLevel?: unknown;
  jobExcerpt?: unknown;
  jobDescription?: unknown;
  pubDate?: unknown;
  salaryMin?: unknown;
  salaryMax?: unknown;
  salaryCurrency?: unknown;
  salaryPeriod?: unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

let decoder: HTMLTextAreaElement | null = null;

export function decodeEntities(value: string): string {
  if (!value.includes('&')) return value;
  decoder ??= document.createElement('textarea');
  decoder.innerHTML = value;
  return decoder.value;
}

function text(value: unknown): string {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function textList(value: unknown): string[] {
  const items = Array.isArray(value) ? value : [value];
  return items.map(text).filter(Boolean).map(decodeEntities);
}

function positiveNumber(value: unknown): number | null {
  const n = typeof value === 'number' ? value : Number(text(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readSalary(raw: JobicyJobDto): Salary | null {
  const min = positiveNumber(raw.salaryMin);
  const max = positiveNumber(raw.salaryMax);
  if (min === null && max === null) return null;
  return {
    min,
    max,
    currency: text(raw.salaryCurrency) || null,
    period: text(raw.salaryPeriod) || null,
  };
}

export function normalizeJob(raw: unknown): Job | null {
  if (!isRecord(raw)) return null;
  const dto: JobicyJobDto = raw;

  const id = Number(dto.id);
  const title = decodeEntities(text(dto.jobTitle));
  const url = safeHttpUrl(dto.url);
  if (!Number.isFinite(id) || !title || !url) return null;

  const level = text(dto.jobLevel);
  const geo = [dto.jobGeo, dto.candidate_required_location, dto.location]
    .map((value) => textList(value).join(', '))
    .find(Boolean);
  return {
    id,
    url,
    title,
    company: decodeEntities(text(dto.companyName)) || 'Компанія не вказана',
    logo: safeHttpUrl(dto.companyLogo),
    industries: textList(dto.jobIndustry),
    types: textList(dto.jobType),
    geo: geo || 'Не вказано',
    level: level && level.toLowerCase() !== 'any' ? decodeEntities(level) : null,
    excerpt: decodeEntities(text(dto.jobExcerpt)),
    descriptionHtml: text(dto.jobDescription),
    publishedAt: text(dto.pubDate),
    salary: readSalary(dto),
  };
}
