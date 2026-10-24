import { useCallback, useEffect, useState } from 'react';
import { supabase, errorMessage, isMissingRelation } from '../lib/supabase';
import { ADDRESSES_KEY } from '../lib/cart';
import type { Address } from '../types';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';

export interface AddressInput {
  label: string;
  line: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  isDefault?: boolean;
}

function readLocalAddresses(): Address[] {
  try {
    const raw = localStorage.getItem(ADDRESSES_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Address[]) : [];
  } catch {
    return [];
  }
}

function writeLocalAddresses(addresses: Address[]): void {
  try {
    localStorage.setItem(ADDRESSES_KEY, JSON.stringify(addresses));
  } catch {
    // Ignore storage failures.
  }
}

export function useAddresses() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>(() => readLocalAddresses());
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    if (!user) {
      setAddresses(readLocalAddresses());
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('addresses')
        .select('id, label, line, pincode, lat, lng, is_default')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      if (error) {
        if (!isMissingRelation(error)) console.warn('[Tokri] addresses:', error.message);
        setAddresses(readLocalAddresses());
        return;
      }
      setAddresses(
        (data ?? []).map((row) => ({
          id: row.id,
          label: row.label,
          line: row.line,
          pincode: row.pincode,
          lat: row.lat,
          lng: row.lng,
          isDefault: row.is_default,
        })),
      );
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = useCallback(
    async (input: AddressInput): Promise<Address | null> => {
      if (!input.line.trim()) {
        toast('Enter an address line first.', 'error');
        return null;
      }
      if (user) {
        const { data, error } = await supabase
          .from('addresses')
          .insert({
            user_id: user.id,
            label: input.label || 'Home',
            line: input.line.trim(),
            pincode: input.pincode,
            lat: input.lat,
            lng: input.lng,
            is_default: input.isDefault ?? addresses.length === 0,
          })
          .select('id, label, line, pincode, lat, lng, is_default')
          .single();
        if (!error && data) {
          const address: Address = {
            id: data.id,
            label: data.label,
            line: data.line,
            pincode: data.pincode,
            lat: data.lat,
            lng: data.lng,
            isDefault: data.is_default,
          };
          setAddresses((current) => [...current, address]);
          toast('Address saved.', 'success');
          return address;
        }
        if (error && !isMissingRelation(error)) {
          toast(errorMessage(error, 'Could not save the address.'), 'error');
          return null;
        }
      }

      const address: Address = {
        id: `local-${Date.now()}`,
        label: input.label || 'Home',
        line: input.line.trim(),
        pincode: input.pincode,
        lat: input.lat,
        lng: input.lng,
        isDefault: input.isDefault ?? addresses.length === 0,
      };
      const next = [...addresses, address];
      setAddresses(next);
      writeLocalAddresses(next);
      toast(user ? 'Address saved on this device (address table not available yet).' : 'Address saved on this device.', 'success');
      return address;
    },
    [user, addresses, toast],
  );

  const remove = useCallback(
    async (id: string) => {
      if (user && !id.startsWith('local-')) {
        const { error } = await supabase.from('addresses').delete().eq('id', id);
        if (error && !isMissingRelation(error)) {
          toast(errorMessage(error, 'Could not remove the address.'), 'error');
          return;
        }
      }
      const next = addresses.filter((address) => address.id !== id);
      setAddresses(next);
      writeLocalAddresses(next);
    },
    [user, addresses, toast],
  );

  return { addresses, loading, save, remove, refresh: load };
}
