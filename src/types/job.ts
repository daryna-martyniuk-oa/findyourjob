export interface Salary {
  min: number | null;
  max: number | null;
  currency: string | null;
  period: string | null;
}

export interface Job {
  id: number;
  url: string;
  title: string;
  company: string;
  logo: string | null;
  industries: string[];
  types: string[];
  geo: string;
  level: string | null;
  excerpt: string;
  descriptionHtml: string;
  publishedAt: string;
  salary: Salary | null;
}

export type DataSource = 'network' | 'cache' | 'stale-cache' | 'snapshot';

export interface LoadResult {
  jobs: Job[];
  source: DataSource;
  fetchedAt: number;
}
