export type GeoMode = 'all' | 'ua' | 'europe' | 'north-america';

export type SortKey = 'relevance' | 'date' | 'salary' | 'title' | 'company';

export interface Filters {
  query: string;
  level: string;
  type: string;
  geo: GeoMode;
  salaryOnly: boolean;
  savedOnly: boolean;
  sort: SortKey;
}

export type UaEligibility = 'yes' | 'anywhere' | 'maybe' | 'no';
