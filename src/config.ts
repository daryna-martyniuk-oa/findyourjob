import type { SortKey } from './types/filters';

export const PAGE_SIZE = 12;
export const HOME_LATEST_COUNT = 6;

export const SORT_LABELS: Record<SortKey, string> = {
  relevance: 'Релевантність',
  date: 'Дата публікації',
  salary: 'Зарплата',
  title: 'Назва (A–Z)',
  company: 'Компанія (A–Z)',
};

export const STORAGE_KEYS = {
  jobs: 'remoteit:jobs:v1',
  saved: 'remoteit:saved',
  theme: 'remoteit:theme',
} as const;
