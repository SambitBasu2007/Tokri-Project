import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBasket } from 'lucide-react';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { calculateTotals, COUPONS } from '../lib/pricing';
import { inr, minutesLabel } from '../lib/format';
import { clearDraft, readDraft, writeDraft, type CouponDraft } from '../lib/drafts';
import { useOrders } from '../hooks/useOrders';
import type { Address, Coupon } from '../types';
import { AddressPicker } from '../components/AddressPicker';
import { EmptyState } from '../components/EmptyState';
import { StorePicker } from '../components/StorePicker';
import styles from './Checkout.module.css';

type Payment = 'upi' | 'card' | 'cod';

const PAYMENTS: { id: Payment; label: string; note: string }[] = [
  { id: 'upi', label: 'UPI', note: 'GPay, PhonePe, Paytm' },
  { id: 'card', label: 'Card', note: 'Visa, Mastercard, RuPay' },
  { id: 'cod', label: 'Cash on delivery', note: 'Pay the rider' },
];

export default function CheckoutPage() {
  const { items, active, activeLabel, clear, selectStore } = useCart();
  const { products, stores } = useCatalog();
  const { signedIn } = useAuth();
  const { toast } = useToast();
  const { placeOrder } = useOrders();
  const navigate = useNavigate();

  const [address, setAddress] = useState<Address | null>(null);
  const [couponInput, setCouponInput] = useState(() => readDraft<CouponDraft>('coupon')?.code ?? '');
  const [coupon, setCoupon] = useState<Coupon | null>(null);
  const [payment, setPayment] = useState<Payment>('upi');
  const [placing, setPlacing] = useState(false);

  // An abandoned coupon code survives a refresh, but never a completed order.
  useEffect(() => {
    if (couponInput.trim()) writeDraft('coupon', { code: couponInput });
    else clearDraft('coupon');
  }, [couponInput]);

  const totals = useMemo(
    () => calculateTotals(items, products, stores, coupon),
    [items, products, stores, coupon],
  );

  if (!items.length) {
    return (
      <div className="page">
        <div className={`container ${styles.empty}`}>
          <EmptyState
            icon={<ShoppingBasket size={28} strokeWidth={1.5} aria-hidden />}
            title="Nothing to check out"
            action={<Link className="btn btn-primary" to="/">Browse products</Link>}
          >
            Add items to {activeLabel.toLowerCase()} first.
          </EmptyState>
        </div>
      </div>
    );
  }

  const applyCode = () => {
    const found = COUPONS.find(
      (entry) => entry.code.toLowerCase() === couponInput.trim().toLowerCase(),
    );
    if (!found) {
      toast('That coupon code is not valid.', 'error');
      return;
    }
    setCoupon(found);
    setCouponInput('');
    toast(`${found.code} applied.`, 'success');
  };

  const submit = async () => {
    if (!address) {
      toast('Choose a delivery address first.', 'error');
      return;
    }
    if (totals.couponError) {
      toast(totals.couponError, 'error');
      return;
    }
    setPlacing(true);
    try {
      const order = await placeOrder({
        communityId: active.type === 'community' ? active.communityId : null,
        items,
        products,
        address,
        amount: totals.total,
      });
      await clear();
      clearDraft('coupon');
      setCouponInput('');
      toast(
        order.source === 'db'
          ? 'Order placed. Tracking starts now.'
          : 'Demo order saved on this device only.',
        'success',
      );
      navigate(`/orders?placed=${order.id}`);
    } catch (err) {
      toast(err instanceof Error ? err.message : 'Could not place the order.', 'error');
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="page">
      <div className="container">
        <div className={styles.head}>
          <div>
            <h1>Checkout · {activeLabel}</h1>
            <p className={styles.headNote}>
              {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'} across {totals.groups.length}{' '}
              store{totals.groups.length === 1 ? '' : 's'}
              {active.type === 'community' ? ' · shared community basket' : ''}
            </p>
          </div>
          <Link className="btn btn-sm" to="/">
            Keep shopping
          </Link>
        </div>

        <div className={styles.layout}>
          <div>
            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Delivery address</h2>
                <span className={styles.sectionMeta}>Location is click-only and owner-only</span>
              </div>
              <AddressPicker value={address} onChange={setAddress} />
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Items</h2>
                <span className={styles.sectionMeta}>Grouped by fulfilling store</span>
              </div>
              <div className={styles.items}>
                {totals.groups.map((group) => (
                  <div key={group.store.id}>
                    <div className={styles.sectionHead}>
                      <h3 className={styles.sectionTitle}>{group.store.name}</h3>
                      <span className={styles.sectionMeta}>
                        {minutesLabel(group.store.deliveryMinutes)} ·{' '}
                        {group.deliveryFee === 0 ? 'free delivery' : `${inr(group.deliveryFee)} delivery`}
                      </span>
                    </div>
                    {group.lines.map((line) => {
                      const item = items.find(
                        (entry) => entry.productId === line.product.id && entry.storeId === group.store.id,
                      );
                      return (
                        <div key={`${line.product.id}-${group.store.id}`} className={styles.item}>
                          <div>
                            <p className={styles.itemName}>{line.product.name}</p>
                            <p className={styles.itemMeta}>
                              {line.product.weight} · {inr(line.unitPrice)} × {line.quantity}
                            </p>
                          </div>
                          <p className={styles.itemPrice}>{inr(line.unitPrice * line.quantity)}</p>
                          {item && (
                            <div className={styles.itemExtra}>
                              <StorePicker
                                product={line.product}
                                value={item.storeId}
                                stores={stores}
                                onChange={(storeId) => void selectStore(item.productId, storeId)}
                                label="Change store"
                                variant="compact"
                              />
                              {item.addedByName && <span>Added by {item.addedByName}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </section>

            <section className={styles.section}>
              <div className={styles.sectionHead}>
                <h2 className={styles.sectionTitle}>Payment</h2>
                <span className={styles.sectionMeta}>No payment is actually processed</span>
              </div>
              <div className={styles.payment}>
                {PAYMENTS.map((option) => (
                  <label
                    key={option.id}
                    className={`${styles.paymentOption} ${payment === option.id ? styles.paymentSelected : ''}`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      checked={payment === option.id}
                      onChange={() => setPayment(option.id)}
                    />
                    <span>{option.label}</span>
                    <span className={styles.sectionMeta}>{option.note}</span>
                  </label>
                ))}
              </div>
              <p className={styles.demoNote}>
                This is a demo checkout. Nothing is charged and no store receives the order.
                Delivery status is simulated.
              </p>
            </section>
          </div>

          <aside className={styles.summary} aria-label="Order summary">
            <h2 className={styles.summaryTitle}>Summary</h2>
            <div className={styles.rows}>
              <div className={styles.row}>
                <span>Items ({totals.itemCount})</span>
                <span>{inr(totals.subtotal)}</span>
              </div>
              <div className={styles.row}>
                <span>Delivery</span>
                <span>{totals.delivery === 0 ? 'Free' : inr(totals.delivery)}</span>
              </div>
              <div className={styles.row}>
                <span>Saved vs MRP</span>
                <span>{inr(totals.savings)}</span>
              </div>
              {totals.discount > 0 && (
                <div className={styles.row}>
                  <span>Coupon {coupon?.code}</span>
                  <span>−{inr(totals.discount)}</span>
                </div>
              )}
            </div>

            {coupon ? (
              <div className={styles.couponApplied}>
                <span>{coupon.code} applied</span>
                <button type="button" className={styles.linkButton} onClick={() => setCoupon(null)}>
                  Remove
                </button>
              </div>
            ) : (
              <div className={styles.couponRow}>
                <input
                  className="field"
                  placeholder="Coupon code"
                  aria-label="Coupon code"
                  value={couponInput}
                  onChange={(event) => setCouponInput(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyCode();
                    }
                  }}
                />
                <button type="button" className="btn btn-sm" onClick={applyCode} disabled={!couponInput.trim()}>
                  Apply
                </button>
              </div>
            )}
            {totals.couponError && <p className={styles.couponError}>{totals.couponError}</p>}

            <div className={styles.total}>
              <span>Total</span>
              <span>{inr(totals.total)}</span>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-block"
              onClick={() => void submit()}
              disabled={placing || !address}
            >
              {placing ? 'Placing order…' : address ? 'Place order' : 'Choose an address'}
            </button>

            {!signedIn && (
              <p className={styles.note}>
                You are signed out, so this order is stored on this device as a demo.{' '}
                <Link to="/social">Sign in</Link> to keep orders and sync your cart.
              </p>
            )}
            <p className={styles.demoNote}>
              Prices and delivery are simulated. Coupons {COUPONS.map((entry) => entry.code).join(' / ')}{' '}
              are demo codes.
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
