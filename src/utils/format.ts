import type { Salary } from '../types/job';

const PERIOD_LABELS: Record<string, string> = {
  year: 'рік',
  yearly: 'рік',
  annual: 'рік',
  annually: 'рік',
  month: 'міс.',
  monthly: 'міс.',
  week: 'тиж.',
  weekly: 'тиж.',
  day: 'день',
  daily: 'день',
  hour: 'год.',
  hourly: 'год.',
};

function numberFormatter(currency: string | null): (n: number) => string {
  if (currency && /^[A-Za-z]{3}$/.test(currency)) {
    try {
      const nf = new Intl.NumberFormat('uk-UA', {
        style: 'currency',
        currency: currency.toUpperCase(),
        currencyDisplay: 'narrowSymbol',
        maximumFractionDigits: 0,
      });
      return (n) => nf.format(n);
    } catch {
      // ignore
    }
  }
  const nf = new Intl.NumberFormat('uk-UA', { maximumFractionDigits: 0 });
  return (n) => nf.format(n);
}

export function formatSalary(salary: Salary | null): string | null {
  if (!salary) return null;
  const { min, max } = salary;
  if (min === null && max === null) return null;
  const fmt = numberFormatter(salary.currency);
  const range =
    min !== null && max !== null && min !== max
      ? `${fmt(min)} – ${fmt(max)}`
      : fmt((max ?? min) as number);
  const period = salary.period ? PERIOD_LABELS[salary.period.toLowerCase()] : undefined;
  return period ? `${range} / ${period}` : range;
}

const relativeFormat = new Intl.RelativeTimeFormat('uk', { numeric: 'auto' });
const dateFormat = new Intl.DateTimeFormat('uk-UA', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

export function formatRelative(iso: string, now: Date = new Date()): string {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return '';
  const days = Math.trunc((time - now.getTime()) / 86_400_000);
  if (Math.abs(days) < 30) return relativeFormat.format(days, 'day');
  const months = Math.trunc(days / 30);
  if (Math.abs(months) < 12) return relativeFormat.format(months, 'month');
  return relativeFormat.format(Math.trunc(days / 365), 'year');
}

export function formatDate(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '' : dateFormat.format(new Date(time));
}

const pluralRules = new Intl.PluralRules('uk');

export function pluralUk(n: number, forms: readonly [string, string, string]): string {
  const category = pluralRules.select(n);
  if (category === 'one') return forms[0];
  if (category === 'few') return forms[1];
  return forms[2];
}
