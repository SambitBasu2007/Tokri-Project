import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Lock, Package, Trash2, Users } from 'lucide-react';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useCatalog } from '../state/CatalogContext';
import { useToast } from '../state/ToastContext';
import { useCommunityActivity } from '../hooks/useCommunityActivity';
import { useOrders } from '../hooks/useOrders';
import { deliveryFeeFor } from '../lib/pricing';
import { countItems } from '../lib/orders';
import { formatDateTime, inr, timeAgo } from '../lib/format';
import type { CommunityActivity, CommunityWithMembers, Order, Shipment, Store, StoreId } from '../types';
import { EmptyState } from '../components/EmptyState';
import { OrderTracker } from '../components/OrderTracker';
import { Skeleton } from '../components/Skeleton';
import styles from './Orders.module.css';
import common from './common.module.css';

type HistoryView = 'all' | 'mine' | 'community';

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

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return '?';
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function storeNameFor(storeId: StoreId, stores: Store[]): string {
  return stores.find((store) => store.id === storeId)?.name ?? storeId;
}

function PersonalOrderCard({
  order,
  communities,
  stores,
  nowOffset,
  onBuyAgain,
  onDelete,
  deleting,
}: {
  order: Order;
  communities: CommunityWithMembers[];
  stores: Store[];
  nowOffset: number;
  onBuyAgain: (order: Order) => void;
  onDelete: (order: Order) => void;
  deleting: boolean;
}) {
  const community = order.communityId
    ? communities.find((entry) => entry.id === order.communityId)
    : null;
  const shipments = order.shipments.length ? order.shipments : deriveShipments(order, stores);

  return (
    <article className={styles.order}>
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
          <button
            type="button"
            className={styles.deleteOrder}
            onClick={() => onDelete(order)}
            disabled={deleting}
            title="Delete this order"
            aria-label={`Delete order from ${formatDateTime(order.createdAt)}`}
          >
            <Trash2 size={13} strokeWidth={1.6} aria-hidden />
          </button>
        </div>
      </div>

      <div className={styles.orderBody}>
        <div className={styles.items}>
          {order.items.map((item) => (
            <div key={`${item.productId}-${item.storeId}`} className={styles.item}>
              <div>
                <Link to={`/product/${item.productId}`}>{item.name}</Link>
                <p className={styles.itemMeta}>
                  {item.weight ?? ''} · {item.quantity} × {inr(item.price)} ·{' '}
                  {storeNameFor(item.storeId, stores)}
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
          <button type="button" className="btn btn-sm" onClick={() => onBuyAgain(order)}>
            Buy again
          </button>
        </div>
      </div>
    </article>
  );
}

function CommunityOrderCard({
  activity,
  community,
  stores,
}: {
  activity: CommunityActivity;
  community: CommunityWithMembers | undefined;
  stores: Store[];
}) {
  return (
    <article className={`${styles.order} ${styles.communityOrder}`}>
      <div className={styles.orderHead}>
        <div className={styles.communityHead}>
          <span className={styles.communityAvatar} aria-hidden>
            {initialsFor(activity.orderedByName)}
          </span>
          <div className={styles.communityTitleWrap}>
            <p className={styles.orderTitle}>
              <strong>{activity.orderedByName}</strong> ordered from{' '}
              {community?.name ?? 'a community'}
            </p>
            <p className={styles.orderMeta} title={formatDateTime(activity.createdAt)}>
              {timeAgo(activity.createdAt)} · {countItems(activity.items)} item
              {countItems(activity.items) === 1 ? '' : 's'} · shared cart
            </p>
          </div>
        </div>
        <div className={styles.badges}>
          <span className={styles.communityBadge}>
            <Users size={12} aria-hidden />
            Community order
          </span>
        </div>
      </div>

      <div className={styles.orderBody}>
        <div className={styles.items}>
          {activity.items.map((item) => (
            <div key={`${item.productId}-${item.storeId}`} className={styles.item}>
              <div>
                <Link to={`/product/${item.productId}`}>{item.name}</Link>
                <p className={styles.itemMeta}>
                  {item.weight ?? 'Item'} · {storeNameFor(item.storeId, stores)}
                </p>
              </div>
              <span className={styles.communityQty}>×{item.quantity}</span>
            </div>
          ))}
        </div>

        <p className={styles.communityNote}>
          <Lock size={13} aria-hidden />
          Amount, delivery address and live tracker stay private to the member who ordered.
        </p>
      </div>
    </article>
  );
}

export default function OrdersPage() {
  const { orders, loading, refresh, deleteOrder, nowOffset, accountSync, syncLocalOrders } =
    useOrders();
  const { activity, loading: communityLoading, error: communityError, refresh: refreshActivity } =
    useCommunityActivity();
  const { signedIn, communities } = useAuth();
  const { stores } = useCatalog();
  const { add } = useCart();
  const { toast } = useToast();
  const [params, setParams] = useSearchParams();
  const placed = params.get('placed');
  const announced = useRef<string | null>(null);
  const syncAttempted = useRef(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const deviceOrders = useMemo(
    () => orders.filter((order) => order.source === 'local'),
    [orders],
  );

  const runSync = useCallback(async () => {
    setSyncing(true);
    try {
      const result = await syncLocalOrders();
      if (result.synced) {
        // Pull the account list again so orders uploaded by another device are
        // visible immediately, not only after a manual refresh.
        await refresh();
        toast(
          `${result.synced} device order${result.synced === 1 ? '' : 's'} saved to your account.`,
          'success',
        );
      } else if (result.unavailable) {
        toast('Account sync is not configured for this project yet.', 'error');
      } else if (result.failed) {
        toast('No device orders could be saved right now.', 'error');
      }
    } finally {
      setSyncing(false);
    }
  }, [syncLocalOrders, refresh, toast]);

  // Once the account database answers, move device-only history onto the
  // account automatically so both devices converge on the same list.
  useEffect(() => {
    if (!signedIn || accountSync !== 'ready' || !deviceOrders.length || syncAttempted.current) return;
    syncAttempted.current = true;
    void runSync();
  }, [signedIn, accountSync, deviceOrders.length, runSync]);

  const viewParam = params.get('view');
  const view: HistoryView =
    viewParam === 'mine' || viewParam === 'community' ? viewParam : 'all';

  const history = useMemo(() => {
    const mine = orders.map((order) => ({
      kind: 'mine' as const,
      createdAt: order.createdAt,
      order,
    }));
    const shared = activity.map((entry) => ({
      kind: 'community' as const,
      createdAt: entry.createdAt,
      activity: entry,
    }));
    return [...mine, ...shared].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [orders, activity]);

  const visible =
    view === 'mine'
      ? history.filter((entry) => entry.kind === 'mine')
      : view === 'community'
        ? history.filter((entry) => entry.kind === 'community')
        : history;

  const setView = (next: HistoryView) => {
    const nextParams = new URLSearchParams(params);
    if (next === 'all') nextParams.delete('view');
    else nextParams.set('view', next);
    setParams(nextParams, { replace: true });
  };

  useEffect(() => {
    if (placed && announced.current !== placed) {
      announced.current = placed;
      toast(
        orders.some((order) => order.id === placed && order.source === 'db')
          ? 'Order placed.'
          : 'Order saved on this device only. Account sync is not set up yet.',
        'success',
      );
      setParams(
        (current) => {
          const next = new URLSearchParams(current);
          next.delete('placed');
          return next;
        },
        { replace: true },
      );
    }
  }, [placed, orders, toast, setParams]);

  const buyAgain = async (order: Order) => {
    for (const item of order.items) {
      await add(item.productId, item.storeId, item.quantity);
    }
    toast('Items added to the active cart.', 'success');
  };

  const removeOrder = async (order: Order) => {
    if (!window.confirm('Delete this order from your history? This cannot be undone.')) return;
    setDeletingId(order.id);
    try {
      const result = await deleteOrder(order);
      if (order.source === 'local') {
        toast('Demo order deleted from this device.', 'success');
      } else if (result.remote) {
        toast('Order deleted.', 'success');
      } else {
        toast('Removed from this device. Apply migration 0005 to delete it everywhere.', 'info');
      }
    } finally {
      setDeletingId(null);
    }
  };

  const refreshAll = () => {
    void refresh();
    void refreshActivity();
  };

  // Coming back to this tab after checking out on another device should show
  // the other device's uploaded orders without a full page reload.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void refresh();
        void refreshActivity();
      }
    };
    window.addEventListener('focus', onVisible);
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      window.removeEventListener('focus', onVisible);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [refresh, refreshActivity]);

  const showSkeleton = (loading || communityLoading) && visible.length === 0;
  const communityAvailable = signedIn && communities.length > 0;

  return (
    <div className="page">
      <div className="container">
        <div className={common.pageHead}>
          <div>
            <h1>Orders</h1>
            <p className={common.lede}>
              Personal orders and shared-cart orders in one timeline. Every store in an order gets
              its own shipment and ETA; community orders show who checked out and what they bought,
              without exposing their amount or address.
            </p>
          </div>
          <div className={common.actions}>
            <button type="button" className="btn btn-sm" onClick={refreshAll}>
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
            <Link to="/social">Sign in</Link> to sync them with your account and see community
            activity.
          </p>
        )}

        {signedIn && accountSync === 'unavailable' && deviceOrders.length > 0 && (
          <p className={styles.notice}>
            <strong>Account sync is off.</strong> {deviceOrders.length} order
            {deviceOrders.length === 1 ? '' : 's'} saved in this browser will not appear on your
            other devices yet. Run the Tokri database setup (README → Database setup) to turn sync
            on.
          </p>
        )}

        {signedIn && accountSync === 'ready' && deviceOrders.length > 0 && (
          <div className={styles.notice}>
            {deviceOrders.length} order{deviceOrders.length === 1 ? ' is' : 's are'} still saved
            only in this browser.{' '}
            <button
              type="button"
              className={styles.syncButton}
              onClick={() => void runSync()}
              disabled={syncing}
            >
              {syncing ? 'Saving…' : `Save ${deviceOrders.length === 1 ? 'it' : 'them'} to my account`}
            </button>
          </div>
        )}

        {communityAvailable && (
          <nav className={styles.tabs} aria-label="Order history filters">
            <button
              type="button"
              className={`${styles.tab} ${view === 'all' ? styles.tabActive : ''}`}
              aria-pressed={view === 'all'}
              onClick={() => setView('all')}
            >
              All activity <span className={styles.tabCount}>{history.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${view === 'mine' ? styles.tabActive : ''}`}
              aria-pressed={view === 'mine'}
              onClick={() => setView('mine')}
            >
              My orders <span className={styles.tabCount}>{orders.length}</span>
            </button>
            <button
              type="button"
              className={`${styles.tab} ${view === 'community' ? styles.tabActive : ''}`}
              aria-pressed={view === 'community'}
              onClick={() => setView('community')}
            >
              Community <span className={styles.tabCount}>{activity.length}</span>
            </button>
          </nav>
        )}

        {view !== 'mine' && communityAvailable && communityError && (
          <p className={styles.notice} title={communityError}>
            Community activity is temporarily unavailable. Your personal orders are still here.
          </p>
        )}

        {showSkeleton ? (
          <div className={common.stack}>
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </div>
        ) : visible.length === 0 ? (
          view === 'community' ? (
            <EmptyState
              icon={<Users size={28} strokeWidth={1.5} aria-hidden />}
              title="No community orders yet"
              action={
                <Link className="btn btn-primary" to="/social">
                  Open communities
                </Link>
              }
            >
              When someone checks out a shared cart, their items appear here with a private amount
              and address.
            </EmptyState>
          ) : (
            <EmptyState
              icon={<Package size={28} strokeWidth={1.5} aria-hidden />}
              title={view === 'mine' ? 'No personal orders yet' : 'No orders yet'}
              action={
                <Link className="btn btn-primary" to="/">
                  Start a basket
                </Link>
              }
            >
              Place an order and the per-store tracker appears here. Community checkouts from other
              members show up alongside it.
            </EmptyState>
          )
        ) : (
          visible.map((entry) =>
            entry.kind === 'mine' ? (
              <PersonalOrderCard
                key={`order-${entry.order.id}`}
                order={entry.order}
                communities={communities}
                stores={stores}
                nowOffset={nowOffset}
                onBuyAgain={(order) => void buyAgain(order)}
                onDelete={(order) => void removeOrder(order)}
                deleting={deletingId === entry.order.id}
              />
            ) : (
              <CommunityOrderCard
                key={`activity-${entry.activity.id}`}
                activity={entry.activity}
                community={communities.find((community) => community.id === entry.activity.communityId)}
                stores={stores}
              />
            ),
          )
        )}
      </div>
    </div>
  );
}
