import { removeStored, readJson, writeJson } from './storage';

/**
 * In-progress form input lives in sessionStorage: it survives a refresh and
 * navigation, but not closing the tab. Drafts never leave the device.
 */
export interface CommunityDraft {
  name: string;
  handle: string;
  type: 'family' | 'friends';
}

export interface AddressDraft {
  label: string;
  line: string;
  pincode: string;
  lat: number | null;
  lng: number | null;
  geocoded: boolean;
}

export interface CouponDraft {
  code: string;
}

const KEYS = {
  community: 'tokri:draft:community',
  address: 'tokri:draft:address',
  coupon: 'tokri:draft:coupon',
} as const;

export type DraftName = keyof typeof KEYS;

export function readDraft<T>(name: DraftName): T | null {
  return readJson<T>('session', KEYS[name]);
}

export function writeDraft(name: DraftName, value: unknown): void {
  writeJson('session', KEYS[name], value);
}

export function clearDraft(name: DraftName): void {
  removeStored('session', KEYS[name]);
}
