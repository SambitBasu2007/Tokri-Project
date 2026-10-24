import type { Address } from '../types';
import { useAddresses } from '../hooks/useAddresses';
import { AddressForm } from './AddressForm';

interface AddressPickerProps {
  value: Address | null;
  onChange: (address: Address | null) => void;
}

/** Checkout wrapper: saved addresses plus the shared location-aware form. */
export function AddressPicker({ value, onChange }: AddressPickerProps) {
  const { addresses, save, loading } = useAddresses();

  return (
    <AddressForm
      addresses={addresses}
      save={save}
      loading={loading}
      value={value}
      onChange={onChange}
    />
  );
}
