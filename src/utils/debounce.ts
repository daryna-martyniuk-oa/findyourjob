export function debounce<A extends unknown[]>(
  fn: (...args: A) => void,
  waitMs: number,
): (...args: A) => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), waitMs);
  };
}
