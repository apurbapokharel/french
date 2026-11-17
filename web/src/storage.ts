/**
 * Read a value from localStorage.
 *
 * @param key storage key
 * @returns the stored string, or null when missing or when storage is blocked
 */
export function readSetting(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

/**
 * Write a value to localStorage, ignoring failures.
 *
 * @param key storage key
 * @param value string to store
 * @returns true when the value was stored, false when storage is blocked or full
 */
export function writeSetting(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
