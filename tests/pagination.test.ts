import { describe, expect, it } from 'vitest';
import { getPaginatedJobs, getTotalPages } from '../src/utils/pagination';
import { sampleJobs } from './helpers';

describe('pagination utils', () => {
  it('коректно обчислює загальну кількість сторінок', () => {
    expect(getTotalPages(24, 10)).toBe(3);
    expect(getTotalPages(10, 10)).toBe(1);
    expect(getTotalPages(0, 10)).toBe(1);
  });

  it('повертає правильний зріз вакансій для сторінки', () => {
    const page1 = getPaginatedJobs(sampleJobs, 1, 10);
    expect(page1).toHaveLength(10);

    const page3 = getPaginatedJobs(sampleJobs, 3, 10);
    expect(page3).toHaveLength(4);
  });
});
