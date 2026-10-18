const enabled = import.meta.env.DEV;

export const logger = {
  debug: (...args) => {
    if (enabled) console.debug('[findyourjob]', ...args);
  },
  warn: (...args) => {
    if (enabled) console.warn('[findyourjob]', ...args);
  },
  error: (...args) => {
    if (enabled) console.error('[findyourjob]', ...args);
  },
};
