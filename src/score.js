// Personal-best + player-name persistence. Guarded so private mode / disabled
// storage falls back to in-memory (returns defaults / silently ignores).
const BEST_KEY = 'stickman.best';
const NAME_KEY = 'stickman.name';

export function loadBest() {
  try {
    return parseInt(localStorage.getItem(BEST_KEY), 10) || 0;
  } catch (e) {
    return 0;
  }
}

export function saveBest(value) {
  try {
    localStorage.setItem(BEST_KEY, String(value));
  } catch (e) {
    /* ignore */
  }
}

export function loadName() {
  try {
    return localStorage.getItem(NAME_KEY) || '';
  } catch (e) {
    return '';
  }
}

export function saveName(value) {
  try {
    localStorage.setItem(NAME_KEY, value);
  } catch (e) {
    /* ignore */
  }
}
