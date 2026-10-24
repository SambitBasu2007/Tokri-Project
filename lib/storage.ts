import {
  ACTIVE_CART_KEY,
  ADDRESS_CACHE_KEY,
  ADDRESSES_KEY,
  CART_KEY,
  CART_OWNER_KEY,
  DELETED_ORDERS_KEY,
  DEMO_ORDERS_KEY,
  STORE_PICKS_KEY,
  WATCHES_KEY,
} from './cart';

export type StorageKind = 'local' | 'session';

/** Explicit theme choice. Absent means "follow the OS". */
export const THEME_KEY = 'tokri_theme';
export const WATCH_NOTIFIED_KEY = 'tokri_watch_notified_v1';
export const DRAFT_PREFIX = 'tokri:draft:';

function store(kind: StorageKind): Storage | null {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    // Storage can be blocked by the browser (private mode, embedded frames).
    return null;
  }
}

export function readRaw(kind: StorageKind, key: string): string | null {
  try {
    return store(kind)?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writeRaw(kind: StorageKind, key: string, value: string): void {
  try {
    store(kind)?.setItem(key, value);
  } catch {
    // Quota or blocked storage: the in-memory state still works.
  }
}

export function removeStored(kind: StorageKind, key: string): void {
  try {
    store(kind)?.removeItem(key);
  } catch {
    // Ignore storage failures.
  }
}

export function readJson<T>(kind: StorageKind, key: string): T | null {
  const raw = readRaw(kind, key);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function writeJson(kind: StorageKind, key: string, value: unknown): void {
  try {
    writeRaw(kind, key, JSON.stringify(value));
  } catch {
    // JSON.stringify can fail on cyclic input; never let that break the UI.
  }
}

export function clearDrafts(): void {
  try {
    const session = store('session');
    if (!session) return;
    const keys: string[] = [];
    for (let index = 0; index < session.length; index += 1) {
      const key = session.key(index);
      if (key?.startsWith(DRAFT_PREFIX)) keys.push(key);
    }
    for (const key of keys) removeStored('session', key);
  } catch {
    // Ignore storage failures.
  }
}

/**
 * Sign-out on a shared computer must not leave the previous person's cart,
 * addresses, watches or in-progress form drafts behind. The database copy is
 * untouched; only this device is wiped.
 */
export function clearDeviceUserData(): void {
  for (const key of [
    CART_KEY,
    CART_OWNER_KEY,
    STORE_PICKS_KEY,
    ACTIVE_CART_KEY,
    ADDRESSES_KEY,
    ADDRESS_CACHE_KEY,
    WATCHES_KEY,
    DEMO_ORDERS_KEY,
    DELETED_ORDERS_KEY,
    WATCH_NOTIFIED_KEY,
  ]) {
    removeStored('local', key);
  }
  clearDrafts();
}
