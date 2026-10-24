import { useEffect, useId, useState } from 'react';
import { Crosshair, MapPin, Plus } from 'lucide-react';
import type { Address } from '../types';
import type { AddressInput } from '../hooks/useAddresses';
import { useLocation } from '../hooks/useLocation';
import { clearDraft, readDraft, writeDraft, type AddressDraft } from '../lib/drafts';
import styles from './AddressForm.module.css';

interface AddressFormProps {
  addresses: Address[];
  save: (input: AddressInput) => Promise<Address | null>;
  value?: Address | null;
  onChange?: (address: Address | null) => void;
  /** Checkout shows the saved-address radio list; Profile renders its own list. */
  showSaved?: boolean;
  loading?: boolean;
  submitLabel?: string;
  onSaved?: (address: Address) => void;
}

export function AddressForm({
  addresses,
  save,
  value = null,
  onChange,
  showSaved = true,
  loading = false,
  submitLabel = 'Save address',
  onSaved,
}: AddressFormProps) {
  const { locate, status, error } = useLocation();
  const baseId = useId();
  const [draft] = useState(() => readDraft<AddressDraft>('address'));
  const [showForm, setShowForm] = useState(() => Boolean(draft?.line || draft?.pincode));
  const [label, setLabel] = useState(draft?.label ?? 'Home');
  const [line, setLine] = useState(draft?.line ?? '');
  const [pincode, setPincode] = useState(draft?.pincode ?? '');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    draft?.lat != null && draft?.lng != null ? { lat: draft.lat, lng: draft.lng } : null,
  );
  const [geocoded, setGeocoded] = useState(draft?.geocoded ?? false);

  // The half-typed address survives a refresh or a detour to the cart.
  useEffect(() => {
    if (!showForm) return;
    const draftNext: AddressDraft = {
      label,
      line,
      pincode,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      geocoded,
    };
    if (!line.trim() && !pincode.trim() && label === 'Home' && !coords) clearDraft('address');
    else writeDraft('address', draftNext);
  }, [showForm, label, line, pincode, coords, geocoded]);

  const resetForm = () => {
    setLabel('Home');
    setLine('');
    setPincode('');
    setCoords(null);
    setGeocoded(false);
    setShowForm(false);
    clearDraft('address');
  };

  useEffect(() => {
    if (!showSaved || value || !onChange) return;
    if (addresses.length && !showForm) {
      onChange(addresses.find((address) => address.isDefault) ?? addresses[0]);
    }
  }, [addresses, value, showForm, onChange, showSaved]);

  useEffect(() => {
    if (!value && !addresses.length && !loading) setShowForm(true);
  }, [value, addresses.length, loading]);

  const useMyLocation = async () => {
    const result = await locate();
    if (!result) {
      setShowForm(true);
      return;
    }
    setLine(result.line);
    setPincode(result.pincode ?? '');
    setCoords({ lat: result.lat, lng: result.lng });
    setGeocoded(result.usedGeocoder);
    setShowForm(true);
  };

  const manual = () => {
    setShowForm(true);
    setGeocoded(false);
  };

  const submit = async () => {
    const saved = await save({
      label,
      line,
      pincode: pincode.trim() || null,
      lat: coords?.lat ?? null,
      lng: coords?.lng ?? null,
      isDefault: addresses.length === 0,
    });
    if (saved) {
      onChange?.(saved);
      onSaved?.(saved);
      resetForm();
    }
  };

  const detectedLine = coords
    ? line.trim() || `${coords.lat.toFixed(5)}, ${coords.lng.toFixed(5)}`
    : null;

  return (
    <div className={styles.wrap}>
      {showSaved && addresses.length > 0 && (
        <ul className={styles.list}>
          {addresses.map((address) => (
            <li key={address.id}>
              <label className={`${styles.option} ${value?.id === address.id ? styles.selected : ''}`}>
                <input
                  type="radio"
                  name="address"
                  checked={value?.id === address.id}
                  onChange={() => onChange?.(address)}
                />
                <span className={styles.optionBody}>
                  <span className={styles.optionLabel}>{address.label}</span>
                  <span className={styles.optionLine}>{address.line}</span>
                  {address.pincode && <span className={styles.optionMeta}>PIN {address.pincode}</span>}
                  {address.lat != null && address.lng != null && (
                    <span className={styles.optionMeta}>Location saved</span>
                  )}
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}

      <div className={styles.actions}>
        <button
          type="button"
          className="btn btn-sm"
          onClick={() => void useMyLocation()}
          disabled={status === 'locating'}
        >
          <Crosshair size={14} aria-hidden />
          {status === 'locating' ? 'Locating…' : 'Use my location'}
        </button>
        <button type="button" className="btn btn-sm" onClick={manual}>
          <Plus size={14} aria-hidden />
          Add manually
        </button>
      </div>

      {error && <p className={styles.error}>{error}</p>}

      {detectedLine && (
        <p className={styles.detected} aria-live="polite">
          <MapPin size={14} aria-hidden />
          <span>
            Detected: <strong>{detectedLine}</strong>
            {pincode.trim() ? ` · PIN ${pincode.trim()}` : ''}
          </span>
        </p>
      )}

      {status === 'ready' && geocoded && (
        <p className={styles.note}>
          Address filled from your location via OpenStreetMap Nominatim. Coordinates are stored only
          on your own address and order.
        </p>
      )}
      {status === 'ready' && !geocoded && (
        <p className={styles.note}>
          Coordinates captured, but reverse geocoding failed. Edit the address line before saving.
        </p>
      )}

      {showForm && (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor={`${baseId}-label`}>
              Label
            </label>
            <input
              id={`${baseId}-label`}
              className="field"
              value={label}
              onChange={(event) => setLabel(event.target.value)}
              placeholder="Home"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor={`${baseId}-line`}>
              Address
            </label>
            <input
              id={`${baseId}-line`}
              className="field"
              value={line}
              onChange={(event) => setLine(event.target.value)}
              placeholder="Flat, street, area, city"
            />
          </div>
          <div className={styles.formRow}>
            <label className={styles.label} htmlFor={`${baseId}-pin`}>
              Pincode
            </label>
            <input
              id={`${baseId}-pin`}
              className="field"
              value={pincode}
              onChange={(event) => setPincode(event.target.value)}
              inputMode="numeric"
              placeholder="400001"
            />
          </div>
          <div className={styles.formActions}>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => void submit()}
              disabled={!line.trim()}
            >
              <MapPin size={14} aria-hidden />
              {submitLabel}
            </button>
            {addresses.length > 0 && (
              <button type="button" className="btn btn-sm btn-ghost" onClick={resetForm}>
                Cancel
              </button>
            )}
          </div>
          <p className={styles.attribution}>
            Reverse geocoding © OpenStreetMap contributors (ODbL). Requests are cached and
            click-triggered.
          </p>
        </div>
      )}
    </div>
  );
}
