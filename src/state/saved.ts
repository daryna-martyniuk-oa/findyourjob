import { STORAGE_KEYS } from '../config';

export const SAVED_EVENT = 'findyourjob:saved-change';

export function getSaved(storage: Storage = localStorage): Set<number> {
  try {
    const parsed: unknown = JSON.parse(storage.getItem(STORAGE_KEYS.saved) ?? '[]');
    if (Array.isArray(parsed)) {
      return new Set(parsed.filter((id): id is number => typeof id === 'number'));
    }
  } catch {
    // пошкоджені дані — починаємо з порожнього списку
  }
  return new Set();
}

export function toggleSaved(id: number, storage: Storage = localStorage): boolean {
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
