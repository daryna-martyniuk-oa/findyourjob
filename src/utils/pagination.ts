import type { Job } from '../types/job';

export function getTotalPages(totalItems: number, pageSize: number): number {
  if (pageSize <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / pageSize));
}

export function getPaginatedJobs(jobs: Job[], page: number, pageSize: number): Job[] {
  const start = (page - 1) * pageSize;
  return jobs.slice(start, start + pageSize);
}
