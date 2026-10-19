import { loadJobs } from '../api/jobicy';
import { createError, describeError } from '../components/status';
import { createJobSkeletons } from '../components/jobSkeleton';
import type { LoadResult } from '../types/job';

export interface LoadViewOptions {
  skeletons: number;
  force?: boolean;
  onRetry: () => void;
  onStatus?: (text: string) => void;
}

export async function loadIntoContainer(
  container: HTMLElement,
  options: LoadViewOptions,
): Promise<LoadResult | null> {
  container.setAttribute('aria-busy', 'true');
  container.replaceChildren(createJobSkeletons(options.skeletons));
  options.onStatus?.('Завантаження вакансій…');

  try {
    const result = await loadJobs({ force: options.force });
    container.setAttribute('aria-busy', 'false');
    return result;
  } catch (error) {
    container.setAttribute('aria-busy', 'false');
    options.onStatus?.('');
    container.replaceChildren(createError(describeError(error), options.onRetry));
    return null;
  }
}
