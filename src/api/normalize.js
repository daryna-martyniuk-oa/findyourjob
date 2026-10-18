import { safeHttpUrl } from '../utils/safe-url.js';

export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

let decoder = null;

export function decodeEntities(value) {
  if (!value.includes('&')) return value;
  decoder ??= document.createElement('textarea');
  decoder.innerHTML = value;
  return decoder.value;
}

function text(value) {
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number') return String(value);
  return '';
}

function textList(value) {
  const items = Array.isArray(value) ? value : [value];
  return items.map(text).filter(Boolean).map(decodeEntities);
}

function positiveNumber(value) {
  const n = typeof value === 'number' ? value : Number(text(value).replace(/[^\d.]/g, ''));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function readSalary(raw) {
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

export function normalizeJob(raw) {
  if (!isRecord(raw)) return null;
  const dto = raw;

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
