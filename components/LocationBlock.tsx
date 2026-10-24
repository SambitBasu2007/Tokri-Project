import { useEffect, useState } from 'react';
import { ChevronDown, MapPin } from 'lucide-react';
import type { Address } from '../types';
import { useAddresses } from '../hooks/useAddresses';
import { AddressForm } from './AddressForm';
import { Sheet } from './Sheet';
import { readRaw, writeRaw } from '../lib/storage';
import styles from './LocationBlock.module.css';

const DELIVERY_ADDRESS_KEY = 'tokri_delivery_address_v1';

interface LocationBlockProps {
  /** Compact hides the "Delivering to" eyebrow (used in the mobile header). */
  compact?: boolean;
}

export function LocationBlock({ compact = false }: LocationBlockProps) {
  const { addresses, save, loading } = useAddresses();
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(() =>
    readRaw('local', DELIVERY_ADDRESS_KEY),
  );

  const selected =
    addresses.find((address) => address.id === selectedId) ??
    addresses.find((address) => address.isDefault) ??
    addresses[0] ??
    null;

  // The saved id can point at a deleted address; keep the visible choice honest.
  useEffect(() => {
    if (!selected) {
      if (selectedId) {
        setSelectedId(null);
        writeRaw('local', DELIVERY_ADDRESS_KEY, '');
      }
      return;
    }
    if (selected.id !== selectedId) {
      setSelectedId(selected.id);
      writeRaw('local', DELIVERY_ADDRESS_KEY, selected.id);
    }
  }, [selected, selectedId]);

  const choose = (address: Address | null) => {
    setSelectedId(address?.id ?? null);
    writeRaw('local', DELIVERY_ADDRESS_KEY, address?.id ?? '');
    if (address) setOpen(false);
  };

  return (
    <>
      <button
        type="button"
        className={`${styles.trigger} ${compact ? styles.compact : ''}`.trim()}
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={selected ? `Delivering to ${selected.line}. Change address` : 'Set delivery address'}
      >
        <MapPin className={styles.pin} size={16} strokeWidth={1.5} aria-hidden />
        <span className={styles.copy}>
          {!compact && <span className={styles.eyebrow}>Delivering to</span>}
          <span className={styles.line}>{selected ? selected.line : 'Set delivery address'}</span>
        </span>
        <ChevronDown className={styles.chevron} size={15} strokeWidth={1.5} aria-hidden />
      </button>

      <Sheet
        open={open}
        title="Delivery address"
        onClose={() => setOpen(false)}
      >
        <AddressForm
          addresses={addresses}
          save={save}
          loading={loading}
          value={selected}
          onChange={choose}
          submitLabel="Use this address"
        />
      </Sheet>
    </>
  );
}
