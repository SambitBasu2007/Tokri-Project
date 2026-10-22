import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Package } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useToast } from '../state/ToastContext';
import { useOrders } from '../hooks/useOrders';
import { deliveryFeeFor } from '../lib/pricing';
import { formatDateTime, inr } from '../lib/format';
import type { Order, Shipment, Store } from '../types';
import { EmptyState } from '../components/EmptyState';
import { OrderTracker } from '../components/OrderTracker';
import { Skeleton } from '../components/Skeleton';
import styles from './Orders.module.css';
import common from './common.module.css';

function deriveShipments(order: Order, stores: Store[]): Shipment[] {
  const map = new Map<string, number>();
  for (const item of order.items) {
    map.set(item.storeId, (map.get(item.storeId) ?? 0) + item.price * item.quantity);
  }
  return [...map.entries()].flatMap(([storeId, subtotal]) => {
    const store = stores.find((entry) => entry.id === storeId);
    if (!store) return [];
    return [
      {
        id: `${order.id}-${storeId}`,
        storeId: store.id,
        etaMinutes: store.deliveryMinutes,
        subtotal,
        deliveryFee: deliveryFeeFor(store, subtotal),
      },
    ];
  });
}

export default function OrdersPage() {
  const { orders, loading, refresh, nowOffset } = useOrders();
  const { signedIn, communities } = useAuth();
  const { stores } = useCatalog();
  const { add } = useCart();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const placed = params.get('placed');
  const announced = useRef<string | null>(null);

  useEffect(() => {
    if (placed && announced.current !== placed) {
      announced.current = placed;
      toast(orders.some((order) => order.id === placed && order.source === 'db') ? 'Order placed.' : 'Demo order saved on this device.', 'success');
      setParams({}, { replace: true });
    }
  }, [placed, orders, toast, setParams]);

  const buyAgain = async (order: Order) => {
    for (const item of order.items) {
      await add(item.productId, item.storeId, item.quantity);
    }
    toast('Items added to the active cart.', 'success');
  };

  return (
    <div className="page">
      <div className="container">
        <div className={common.pageHead}>
          <div>
            <h1>Orders</h1>
            <p className={common.lede}>
              Each store in an order gets its own shipment and ETA. Tracking is derived from the
              order time, so it survives reloads.
            </p>
          </div>
          <div className={common.actions}>
            <button type="button" className="btn btn-sm" onClick={() => void refresh()}>
              Refresh
            </button>
            <Link className="btn btn-sm" to="/">
              Keep shopping
            </Link>
          </div>
        </div>

        {!signedIn && (
          <p className={styles.notice}>
            Signed out. Orders placed as a guest are stored only in this browser.{' '}
            <Link to="/social">Sign in</Link> to sync them with your account.
          </p>
        )}

        {loading && !orders.length ? (
          <div className={common.stack}>
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </div>
        ) : orders.length === 0 ? (
          <EmptyState
            icon={<Package size={28} strokeWidth={1.5} aria-hidden />}
            title="No orders yet"
            action={<Link className="btn btn-primary" to="/">Start a basket</Link>}
          >
            Place an order and the per-store tracker appears here.
          </EmptyState>
        ) : (
          orders.map((order) => {
            const community = order.communityId
              ? communities.find((entry) => entry.id === order.communityId)
              : null;
            const shipments = order.shipments.length ? order.shipments : deriveShipments(order, stores);
            return (
              <article key={order.id} className={styles.order}>
                <div className={styles.orderHead}>
                  <div>
                    <p className={styles.orderTitle}>
                      {formatDateTime(order.createdAt)} · {order.items.length} item
                      {order.items.length === 1 ? '' : 's'}
                    </p>
                    <p className={styles.orderMeta}>
                      {community ? `${community.name} shared cart` : 'Personal order'} ·{' '}
                      {order.source === 'db' ? `#${order.id.slice(0, 8)}` : 'device-only demo'}
                    </p>
                  </div>
                  <div className={styles.badges}>
                    {order.source === 'local' && <span className={common.badgeQuiet}>Demo</span>}
                    {community && <span className={common.badge}>{community.name}</span>}
                  </div>
                </div>

                <div className={styles.orderBody}>
                  <div className={styles.items}>
                    {order.items.map((item) => (
                      <div key={`${item.productId}-${item.storeId}`} className={styles.item}>
                        <div>
                          <Link to={`/product/${item.productId}`}>{item.name}</Link>
                          <p className={styles.itemMeta}>
                            {item.weight ?? ''} · {item.quantity} × {inr(item.price)} · {item.storeId}
                          </p>
                        </div>
                        <p className={styles.itemPrice}>{inr(item.price * item.quantity)}</p>
                      </div>
                    ))}
                  </div>

                  <div className={styles.trackers}>
                    {shipments.map((shipment) => (
                      <OrderTracker
                        key={shipment.id}
                        order={order}
                        shipment={shipment}
                        offset={nowOffset}
                      />
                    ))}
                  </div>

                  <div className={styles.orderFoot}>
                    <div>
                      <p className={styles.amount}>{inr(order.amount)}</p>
                      {order.addressText && <p className={styles.address}>{order.addressText}</p>}
                    </div>
                    <button type="button" className="btn btn-sm" onClick={() => void buyAgain(order)}>
                      Buy again
                    </button>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </div>
  );
}
