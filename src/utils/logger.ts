const PREFIX = '[findyourjob]';

export const logger = {
  debug(...args: unknown[]): void {
    if (import.meta.env.DEV) {
      console.debug(PREFIX, ...args);
    }
  },
  info(...args: unknown[]): void {
    console.log(PREFIX, ...args);
  },
  warn(...args: unknown[]): void {
    console.warn(PREFIX, ...args);
  },
  error(...args: unknown[]): void {
    console.error(PREFIX, ...args);
  },
};
