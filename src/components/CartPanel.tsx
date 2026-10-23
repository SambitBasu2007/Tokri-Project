import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ImageOff, Minus, Plus, ShoppingBasket, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useAuth } from '../state/AuthContext';
import { useToast } from '../state/ToastContext';
import { bestSplit } from '../lib/pricing';
import { MAX_QUANTITY } from '../lib/cart';
import { inr } from '../lib/format';
import { EmptyState } from './EmptyState';
import { StorePicker } from './StorePicker';
import styles from './CartPanel.module.css';

interface CartPanelProps {
  open: boolean;
  onClose: () => void;
}

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function CartPanel({ open, onClose }: CartPanelProps) {
  const { items, totals, active, activeLabel, storageMode, setQty, remove, setStore, selectStore, clear } =
    useCart();
  const { products, stores } = useCatalog();
  const { signedIn, communities } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const panelRef = useRef<HTMLElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previousFocus.current = document.activeElement as HTMLElement | null;
    const node = panelRef.current;
    node?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !node) return;
      const focusable = [...node.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
        (element) => element.offsetParent !== null,
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previousFocus.current?.focus();
    };
  }, [open, onClose]);

  if (!open) return null;

  const split = bestSplit(items, products, stores);
  const splitSaving = split ? totals.total - split.total : 0;
  const community =
    active.type === 'community'
      ? communities.find((entry) => entry.id === active.communityId)
      : null;

  const applySplit = async () => {
    if (!split) return;
    for (const assignment of split.assignments) {
      for (const line of assignment.items) {
        const item = items.find(
          (entry) => entry.productId === line.product.id && entry.storeId !== assignment.storeId,
        );
        if (item) await setStore(item, assignment.storeId, { silent: true });
      }
    }
    toast('Switched each item to its cheapest store.', 'success');
  };

  return createPortal(
    <div
      className={styles.overlay}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-label={`${activeLabel} cart`}
      >
        <div className={styles.head}>
          <div>
            <p className={styles.title}>{activeLabel}</p>
            <p className={styles.sub}>
              {totals.itemCount} item{totals.itemCount === 1 ? '' : 's'}
              {community ? ` · shared with ${community.members.length} members` : ''}
            </p>
          </div>
          <button type="button" className={styles.close} onClick={onClose} aria-label="Close cart">
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className={styles.body}>
          {signedIn && storageMode === 'local' && (
            <p className={styles.notice}>
              This cart is saved on this device. Apply the V2 Supabase migration to sync it across
              devices.
            </p>
          )}
          {!signedIn && (
            <p className={styles.notice}>
              You are shopping as a guest. Sign in before checkout to keep your orders.
            </p>
          )}

          {items.length === 0 ? (
            <div className={styles.emptyWrap}>
              <EmptyState
                icon={<ShoppingBasket size={28} strokeWidth={1.5} aria-hidden />}
                title="Your cart is empty"
                action={
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      onClose();
                      navigate('/');
                    }}
                  >
                    Browse products
                  </button>
                }
              >
                Add an item from the grid and it lands in {activeLabel.toLowerCase()}.
              </EmptyState>
            </div>
          ) : (
            <>
              {split && splitSaving > 0.5 && (
                <div className={styles.optimizer}>
                  <p className={styles.optimizerTitle}>Cheaper basket available</p>
                  <p className={styles.optimizerText}>
                    {split.assignments.length === 1
                      ? `Everything from one store costs ${inr(split.total)} including delivery — ${inr(splitSaving)} less than this basket.`
                      : `Splitting across ${split.assignments.length} stores costs ${inr(split.total)} including delivery — ${inr(splitSaving)} less than this basket.`}
                  </p>
                  <button type="button" className="btn btn-sm" onClick={() => void applySplit()}>
                    Use the cheaper split
                  </button>
                </div>
              )}

              {totals.groups.map((group) => (
                <section
                  key={group.store.id}
                  className={styles.group}
                  data-store={group.store.id}
                  aria-label={group.store.name}
                >
                  <div className={styles.groupHead}>
                    <div className={styles.groupTitle}>
                      <span className={styles.storeDot} aria-hidden />
                      <div>
                        <h3 className={styles.groupName}>{group.store.name}</h3>
                        <span className={styles.groupMeta}>
                          {group.store.deliveryMinutes} min ·{' '}
                          {group.deliveryFee === 0
                            ? 'free delivery'
                            : `${inr(group.deliveryFee)} delivery`}
                        </span>
                      </div>
                    </div>
                    <span className={styles.groupTotal}>{inr(group.subtotal)}</span>
                  </div>
                  <div className={styles.lines}>
                    {group.lines.map((line) => {
                      const item = items.find(
                        (entry) =>
                          entry.productId === line.product.id && entry.storeId === group.store.id,
                      );
                      if (!item) return null;
                      return (
                        <div key={`${line.product.id}-${item.rowId ?? group.store.id}`} className={styles.line}>
                          <div className={styles.thumb}>
                            {line.product.imageUrl ? (
                              <img src={line.product.imageUrl} alt="" loading="lazy" />
                            ) : (
                              <ImageOff size={18} strokeWidth={1.3} aria-hidden />
                            )}
                          </div>
                          <div className={styles.lineMain}>
                            <p className={styles.lineName}>{line.product.name}</p>
                            <p className={styles.lineMeta}>
                              {line.product.weight} · {inr(line.unitPrice)} each
                            </p>
                            {item.addedByName && (
                              <p className={styles.owner}>Added by {item.addedByName}</p>
                            )}
                            {item.fallbackFrom && (
                              <p className={styles.owner}>
                                {stores.find((store) => store.id === item.fallbackFrom)?.name ??
                                  item.fallbackFrom}{' '}
                                is out of stock · using {group.store.name}
                              </p>
                            )}
                          </div>
                          <p className={styles.linePrice}>{inr(line.unitPrice * line.quantity)}</p>
                          <div className={styles.lineActions}>
                            <div className={styles.stepper}>
                              <button
                                type="button"
                                onClick={() => void setQty(item, item.quantity - 1)}
                                aria-label={`Decrease quantity of ${line.product.name}`}
                              >
                                <Minus size={12} aria-hidden />
                              </button>
                              <span aria-live="polite">{item.quantity}</span>
                              <button
                                type="button"
                                onClick={() => void setQty(item, item.quantity + 1)}
                                disabled={item.quantity >= MAX_QUANTITY}
                                aria-label={
                                  item.quantity >= MAX_QUANTITY
                                    ? `Maximum quantity reached for ${line.product.name}`
                                    : `Increase quantity of ${line.product.name}`
                                }
                              >
                                <Plus size={12} aria-hidden />
                              </button>
                            </div>
                            <div className={styles.lineRight}>
                              <StorePicker
                                product={line.product}
                                value={item.storeId}
                                stores={stores}
                                onChange={(storeId) => void selectStore(item.productId, storeId)}
                                label="Change store"
                                variant="compact"
                              />
                              <button
                                type="button"
                                className={styles.remove}
                                onClick={() => void remove(item)}
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>

        {items.length > 0 && (
          <div className={styles.foot}>
            <div className={styles.totalRow}>
              <span>Subtotal</span>
              <span>{inr(totals.subtotal)}</span>
            </div>
            <div className={styles.totalRow}>
              <span>Delivery</span>
              <span>{totals.delivery === 0 ? 'Free' : inr(totals.delivery)}</span>
            </div>
            {totals.savings > 0 && (
              <div className={`${styles.totalRow} ${styles.saved}`}>
                <span>Saved vs MRP</span>
                <span>−{inr(totals.savings)}</span>
              </div>
            )}
            <div className={styles.grand}>
              <span>Total</span>
              <span>{inr(totals.total)}</span>
            </div>
            <div className={styles.actions}>
              <button
                type="button"
                className={`btn btn-primary ${styles.checkout}`}
                onClick={() => {
                  onClose();
                  navigate('/checkout');
                }}
              >
                Checkout
              </button>
              <button type="button" className={styles.clear} onClick={() => void clear()}>
                Clear
              </button>
            </div>
            <p className={styles.footNote}>
              Prices are simulated for this demo. Coupons are applied at checkout.
            </p>
          </div>
        )}
      </aside>
    </div>,
    document.body,
  );
}
