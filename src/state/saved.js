import { STORAGE_KEYS } from '../config.js';

export const SAVED_EVENT = 'findyourjob:saved-change';

export function getSaved(storage = localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(STORAGE_KEYS.saved) ?? '[]');
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id) => typeof id === 'number'));
    }
  } catch {
  }
  return new Set();
}

export function toggleSaved(id, storage = localStorage) {
  const saved = getSaved(storage);
  const nowSaved = !saved.has(id);
  if (nowSaved) saved.add(id);
  else saved.delete(id);
  try {
    storage.setItem(STORAGE_KEYS.saved, JSON.stringify([...saved]));
  } catch {
  }
  window.dispatchEvent(new CustomEvent(SAVED_EVENT));
  return nowSaved;
}
