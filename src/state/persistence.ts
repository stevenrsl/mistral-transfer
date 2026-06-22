/** localStorage-backed persistence for non-sensitive user prefs. */

const NS = 'mistral-transfer:';

export interface SavedConnection {
  baseUrl: string;
  username: string;
  /** Last successful connection timestamp. */
  lastUsedAt: number;
}

export type Theme = 'light' | 'dark' | 'system';

export function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(NS + key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function writeJSON(key: string, value: unknown): void {
  try {
    localStorage.setItem(NS + key, JSON.stringify(value));
  } catch {
    // ignore quota / private-mode errors
  }
}

export function readString(key: string): string | null {
  try {
    return localStorage.getItem(NS + key);
  } catch {
    return null;
  }
}

export function writeString(key: string, value: string): void {
  try {
    localStorage.setItem(NS + key, value);
  } catch {
    // ignore
  }
}

export function remove(key: string): void {
  try {
    localStorage.removeItem(NS + key);
  } catch {
    // ignore
  }
}
