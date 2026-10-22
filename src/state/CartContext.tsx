import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { supabase, errorMessage, isMissingRelation } from '../lib/supabase';
import { readRaw, writeRaw } from '../lib/storage';
import {
  CART_KEY,
  CART_OWNER_KEY,
  MAX_QUANTITY,
  addCartLine,
  mergeCartItems,
  normalizeCartItems,
  readLocalCart,
  readActiveCart,
  readStorePicks,
  selectCartLineStore,
  setCartLineQty,
  writeLocalCart,
  writeActiveCart,
  writeStorePicks,
} from '../lib/cart';
import { bestPrice, calculateTotals, selectedPrice } from '../lib/pricing';
import { inr } from '../lib/format';
import type { ActiveCart, CartItem, StoreId, Totals } from '../types';
import { useAuth } from './AuthContext';
import { useCatalog } from './CatalogContext';
import { useToast } from './ToastContext';

interface CartContextValue {
  items: CartItem[];
  active: ActiveCart;
  activeLabel: string;
  totals: Totals;
  loading: boolean;
  /** 'db' when Supabase rows back the cart, 'local' when the migration has not run. */
  storageMode: 'db' | 'local' | 'unknown';
  add: (productId: number, storeId?: StoreId, quantity?: number) => Promise<boolean>;
  setQty: (item: CartItem, quantity: number) => Promise<void>;
  remove: (item: CartItem) => Promise<void>;
  setStore: (item: CartItem, storeId: StoreId, options?: StoreMoveOptions) => Promise<void>;
  /** Product id → chosen store, persisted across reloads. */
  selectedStore: Record<number, StoreId>;
  /** The chosen store if it is in stock, else the line's store, else the cheapest. */
  storeFor: (productId: number) => StoreId | null;
  /** Selects a store. Moves an existing cart line to it, keeping the quantity. */
  selectStore: (productId: number, storeId: StoreId, options?: StoreMoveOptions) => Promise<void>;
  clear: () => Promise<void>;
  setActive: (active: ActiveCart) => void;
  quantityOf: (productId: number) => number;
  itemFor: (productId: number) => CartItem | undefined;
}

interface StoreMoveOptions {
  /** Skip the "Moved to …" toast (used by Undo and bulk actions). */
  silent?: boolean;
}

const CartContext = createContext<CartContextValue | null>(null);

function mapPersonalRows(rows: { product_id: number; store_id: string; quantity: number }[]): CartItem[] {
  return rows.map((row) => ({
    productId: row.product_id,
    storeId: row.store_id as StoreId,
    quantity: row.quantity,
  }));
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, signedIn, loading: authLoading, communities, communitiesLoading } = useAuth();
  const { products, stores, productById } = useCatalog();
  const { toast } = useToast();

  const [localItems, setLocalItems] = useState<CartItem[]>(() => readLocalCart());
  const [dbItems, setDbItems] = useState<CartItem[] | null>(null);
  const [storageMode, setStorageMode] = useState<'db' | 'local' | 'unknown'>('unknown');
  const [communityItems, setCommunityItems] = useState<Record<string, CartItem[]>>({});
  const [active, setActiveState] = useState<ActiveCart>(() => readActiveCart());
  const [selectedStore, setSelectedStore] = useState<Record<number, StoreId>>(() => readStorePicks());
  const [loading, setLoading] = useState(false);
  const mergingRef = useRef(false);
  /** Set when a signed-in user edits the cart before the first DB fetch lands. */
  const dirtyRef = useRef(false);
  /** Lets a toast's Undo call the latest selectStore without a circular dep. */
  const selectStoreRef = useRef<((productId: number, storeId: StoreId, options?: StoreMoveOptions) => Promise<void>) | null>(
    null,
  );

  const fetchPersonal = useCallback(
    async (userId: string, mergeLocal: boolean) => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('personal_cart_items')
          .select('product_id, store_id, quantity')
          .eq('user_id', userId);
        if (error) {
          if (isMissingRelation(error)) {
            setStorageMode('local');
            setDbItems(null);
          } else {
            toast(errorMessage(error, 'Could not load your cart.'), 'error');
          }
          return;
        }
        setStorageMode('db');
        let rows = mapPersonalRows(data ?? []);
        // A mirror that belongs to this account is a paint cache, not a guest
        // cart. Merging it upward would resurrect rows deleted in another tab.
        // The exception is an edit made while this first fetch was in flight.
        const mirrorIsGuest = readRaw('local', CART_OWNER_KEY) !== userId;
        const shouldMerge = mergeLocal && (mirrorIsGuest || dirtyRef.current);

        if (shouldMerge && !mergingRef.current) {
          const local = readLocalCart();
          if (local.length) {
            mergingRef.current = true;
            const merged = mergeCartItems(local, rows);
            const { error: upsertError } = await supabase.from('personal_cart_items').upsert(
              merged.map((item) => ({
                user_id: userId,
                product_id: item.productId,
                store_id: item.storeId,
                quantity: item.quantity,
              })),
              { onConflict: 'user_id,product_id' },
            );
            if (upsertError) {
              toast('Could not merge your local cart with the server copy.', 'error');
            } else {
              rows = merged;
              writeLocalCart([]);
              setLocalItems([]);
              if (local.length) toast('Local cart merged into your account.', 'success');
            }
            mergingRef.current = false;
          }
        }
        setDbItems(rows);
        setLocalItems(rows);
        // localStorage is the instant-paint mirror of the server cart, so a
        // refresh shows the items before Supabase answers.
        writeLocalCart(rows);
        writeRaw('local', CART_OWNER_KEY, userId);
        dirtyRef.current = false;
      } catch (err) {
        setStorageMode('local');
        setDbItems(null);
        console.warn('[Tokri] personal cart:', err);
      } finally {
        setLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    // Wait for session restoration, otherwise a persisted community cart is
    // reset to Personal on every reload before the user is known.
    if (authLoading) return;
    if (!user) {
      // Signing out is handled by AuthContext, which wipes the device copy.
      // Read it fresh so one person's cart never leaks to the next.
      setLocalItems(readLocalCart());
      setDbItems(null);
      setStorageMode('unknown');
      setCommunityItems({});
      setActiveState((current) => {
        if (current.type === 'personal') return current;
        writeActiveCart({ type: 'personal' });
        return { type: 'personal' };
      });
      return;
    }
    void fetchPersonal(user.id, true);
  }, [user, authLoading, fetchPersonal]);

  const fetchCommunity = useCallback(
    async (communityId: string) => {
      const { data, error } = await supabase
        .from('shared_cart_items')
        .select('id, product_id, selected_store, qty, added_by, added_by_name')
        .eq('community_id', communityId)
        .order('created_at', { ascending: true });
      if (error) {
        if (!isMissingRelation(error)) toast(errorMessage(error, 'Could not load the community cart.'), 'error');
        return;
      }
      setCommunityItems((current) => ({
        ...current,
        [communityId]: (data ?? []).map((row) => ({
          productId: row.product_id,
          storeId: row.selected_store as StoreId,
          quantity: row.qty,
          rowId: row.id,
          addedBy: row.added_by,
          addedByName: row.added_by_name ?? 'Member',
        })),
      }));
    },
    [toast],
  );

  useEffect(() => {
    if (active.type !== 'community') return;
    void fetchCommunity(active.communityId);
    const channel = supabase
      .channel(`cart-${active.communityId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shared_cart_items',
          filter: `community_id=eq.${active.communityId}`,
        },
        () => {
          void fetchCommunity(active.communityId);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [active, fetchCommunity]);

  useEffect(() => {
    if (!user || storageMode !== 'db') return;
    const channel = supabase
      .channel(`personal-cart-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'personal_cart_items',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          void fetchPersonal(user.id, false);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, storageMode, fetchPersonal]);

  // Leaving or being removed from the active community falls back to Personal.
  useEffect(() => {
    if (active.type !== 'community' || communitiesLoading) return;
    if (!communities.some((community) => community.id === active.communityId)) {
      setActiveState({ type: 'personal' });
      writeActiveCart({ type: 'personal' });
    }
  }, [active, communities, communitiesLoading]);

  // Cross-tab and back/forward-cache sync. React Router means Back does not
  // reload the page, but a second tab, a refresh and bfcache restore still do.
  useEffect(() => {
    const adoptLocal = () => setLocalItems(readLocalCart());
    const onStorage = (event: StorageEvent) => {
      if (event.key !== CART_KEY) return;
      adoptLocal();
      if (user && storageMode === 'db') void fetchPersonal(user.id, false);
    };
    const onPageShow = (event: PageTransitionEvent) => {
      if (!event.persisted) return;
      adoptLocal();
      if (user && storageMode === 'db') void fetchPersonal(user.id, false);
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('pageshow', onPageShow);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('pageshow', onPageShow);
    };
  }, [user, storageMode, fetchPersonal]);

  const items = useMemo<CartItem[]>(() => {
    const raw =
      active.type === 'community'
        ? communityItems[active.communityId] ?? []
        : user && storageMode === 'db' && dbItems
          ? dbItems
          : localItems;
    // One product, one line: legacy rows are merged before anything renders.
    return normalizeCartItems(raw).map((item) => {
      const product = productById(item.productId);
      if (!product || selectedPrice(product, item.storeId) != null) return item;
      const fallback = bestPrice(product);
      // The chosen store went out of stock: price and fulfil from the cheapest
      // in-stock store, and let the UI explain the swap.
      return fallback ? { ...item, storeId: fallback.storeId, fallbackFrom: item.storeId } : item;
    });
  }, [active, communityItems, user, storageMode, dbItems, localItems, productById]);

  // Sequential mutations (e.g. "Use the cheaper split", rapid taps) must not
  // each persist a snapshot taken before the previous write landed.
  const itemsRef = useRef<CartItem[]>(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const totals = useMemo(() => calculateTotals(items, products, stores), [items, products, stores]);

  const setLocal = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setLocalItems((current) => {
      const next = updater(current);
      writeLocalCart(next);
      return next;
    });
  }, []);

  const persistPersonal = useCallback(
    async (next: CartItem[], previous: CartItem[]) => {
      // 1. React state + localStorage mirror first (instant, works offline).
      // 2. The database write happens in the background; a failure rolls back.
      itemsRef.current = next;
      setLocal(() => next);
      if (!user || storageMode !== 'db') {
        if (user) dirtyRef.current = true;
        return true;
      }
      setDbItems(next);
      const removed = previous.filter(
        (old) => !next.some((item) => item.productId === old.productId),
      );
      if (removed.length) {
        const { error } = await supabase
          .from('personal_cart_items')
          .delete()
          .eq('user_id', user.id)
          .in('product_id', removed.map((item) => item.productId));
        if (error) {
          toast(errorMessage(error, 'Could not update your cart.'), 'error');
          itemsRef.current = previous;
          setDbItems(previous);
          setLocalItems(previous);
          writeLocalCart(previous);
          return false;
        }
      }
      if (next.length) {
        const { error } = await supabase.from('personal_cart_items').upsert(
          next.map((item) => ({
            user_id: user.id,
            product_id: item.productId,
            store_id: item.storeId,
            quantity: item.quantity,
          })),
          { onConflict: 'user_id,product_id' },
        );
        if (error) {
          toast(errorMessage(error, 'Could not save your cart.'), 'error');
          itemsRef.current = previous;
          setDbItems(previous);
          setLocalItems(previous);
          writeLocalCart(previous);
          return false;
        }
      }
      return true;
    },
    [user, storageMode, setLocal, toast],
  );

  const setPick = useCallback((productId: number, storeId: StoreId) => {
    setSelectedStore((current) => {
      if (current[productId] === storeId) return current;
      const next = { ...current, [productId]: storeId };
      writeStorePicks(next);
      return next;
    });
  }, []);

  /** The store the card and the Add button should use for a product. */
  const storeFor = useCallback(
    (productId: number): StoreId | null => {
      const product = productById(productId);
      const line = items.find((item) => item.productId === productId);
      if (!product) return line?.storeId ?? selectedStore[productId] ?? null;
      // An existing line is the source of truth: the card must not advertise a
      // store the cart is not actually using.
      if (line && selectedPrice(product, line.storeId) != null) return line.storeId;
      const pick = selectedStore[productId];
      if (pick && selectedPrice(product, pick) != null) return pick;
      return bestPrice(product)?.storeId ?? null;
    },
    [items, productById, selectedStore],
  );

  const add = useCallback(
    async (productId: number, storeId?: StoreId, quantity = 1): Promise<boolean> => {
      const product = productById(productId);
      if (!product) return false;
      const chosen = storeId ?? storeFor(productId) ?? bestPrice(product)?.storeId;
      if (!chosen || selectedPrice(product, chosen) == null) {
        toast('This item is out of stock at the selected store.', 'error');
        return false;
      }
      // Adding makes the choice explicit, so reloads keep showing this store.
      setPick(productId, chosen);

      if (active.type === 'community') {
        if (!user) {
          toast('Sign in to add items to a community cart.', 'error');
          return false;
        }
        const rows = communityItems[active.communityId] ?? [];
        const existing = rows.find((item) => item.productId === productId);
        const price = selectedPrice(product, chosen) ?? product.mrp;
        const amount = Math.max(1, Math.round(quantity));
        const nextQty = Math.min(MAX_QUANTITY, (existing?.quantity ?? 0) + amount);
        if (existing && nextQty === existing.quantity) {
          toast('Maximum 20 per item.', 'error');
          return false;
        }
        if (existing?.rowId) {
          const { error } = await supabase
            .from('shared_cart_items')
            .update({ qty: nextQty, selected_store: chosen, selected_price: price })
            .eq('id', existing.rowId);
          if (error) {
            toast(errorMessage(error, 'Could not update the shared cart.'), 'error');
            return false;
          }
        } else {
          // One row per product per community. 0003_one_line_per_product.sql
          // adds the unique index this upsert relies on; on older databases
          // Postgres returns 42P10 and a plain insert keeps the app usable.
          const payload = {
            community_id: active.communityId,
            product_id: product.id,
            product_name: product.name,
            product_weight: product.weight,
            selected_store: chosen,
            selected_price: price,
            mrp: product.mrp,
            qty: nextQty,
            added_by: user.id,
            added_by_name: displayNameOf(user.email, user.user_metadata),
          };
          const { error } = await supabase
            .from('shared_cart_items')
            .upsert(payload, { onConflict: 'community_id,product_id' });
          if (error) {
            if (error.code !== '42P10') {
              toast(errorMessage(error, 'Could not add to the shared cart.'), 'error');
              return false;
            }
            const { error: insertError } = await supabase.from('shared_cart_items').insert(payload);
            if (insertError) {
              toast(errorMessage(insertError, 'Could not add to the shared cart.'), 'error');
              return false;
            }
          }
        }
        await fetchCommunity(active.communityId);
        return true;
      }

      const current = itemsRef.current;
      const next = addCartLine(current, productId, chosen, quantity);
      return persistPersonal(next, current);
    },
    [active, communityItems, user, productById, toast, fetchCommunity, items, persistPersonal, storeFor, setPick],
  );

  const selectStore = useCallback(
    async (productId: number, storeId: StoreId, options?: StoreMoveOptions) => {
      const product = productById(productId);
      const price = product ? selectedPrice(product, storeId) : null;
      if (!product || price == null) {
        if (!options?.silent) toast('Not available at that store.', 'error');
        return;
      }

      const current = itemsRef.current;
      const line = current.find((item) => item.productId === productId);
      const previousStore = line?.storeId ?? selectedStore[productId] ?? null;
      setPick(productId, storeId);

      if (!line) {
        // Not in the cart: the card now points at this store. Tapping a row
        // in the picker must never add to the cart.
        return;
      }

      if (active.type === 'community') {
        if (!user || !line.rowId) return;
        const { error } = await supabase
          .from('shared_cart_items')
          .update({ selected_store: storeId, selected_price: price })
          .eq('id', line.rowId);
        if (error) {
          if (previousStore) setPick(productId, previousStore);
          toast(errorMessage(error, 'Could not switch stores.'), 'error');
          return;
        }
        await fetchCommunity(active.communityId);
      } else {
        // The same row moves; the quantity is untouched.
        const next = selectCartLineStore(current, productId, storeId);
        const saved = await persistPersonal(next, current);
        if (!saved) {
          if (previousStore) setPick(productId, previousStore);
          return;
        }
      }

      if (!options?.silent) {
        const storeName = stores.find((store) => store.id === storeId)?.name ?? storeId;
        toast(`Moved to ${storeName} · ${inr(price)}`, 'info', {
          label: 'Undo',
          onClick: () => {
            if (previousStore) {
              void selectStoreRef.current?.(productId, previousStore, { silent: true });
            }
          },
        });
      }
    },
    [active, items, productById, selectedStore, setPick, persistPersonal, toast, fetchCommunity, stores, user],
  );

  useEffect(() => {
    selectStoreRef.current = selectStore;
  }, [selectStore]);

  const setQty = useCallback(
    async (item: CartItem, quantity: number) => {
      const rounded = Math.round(quantity);
      const nextQty = Math.min(MAX_QUANTITY, Math.max(0, rounded));
      if (rounded > MAX_QUANTITY) toast('Maximum 20 per item.', 'error');
      if (active.type === 'community') {
        if (!user || !item.rowId) return;
        if (nextQty === 0) {
          const { error } = await supabase.from('shared_cart_items').delete().eq('id', item.rowId);
          if (error) {
            toast(errorMessage(error, 'Could not remove the item.'), 'error');
            return;
          }
        } else {
          const { error } = await supabase
            .from('shared_cart_items')
            .update({ qty: nextQty })
            .eq('id', item.rowId);
          if (error) {
            toast(errorMessage(error, 'Could not update the quantity.'), 'error');
            return;
          }
        }
        await fetchCommunity(active.communityId);
        return;
      }
      const current = itemsRef.current;
      // setCartLineQty keeps the line's store, so this only changes quantity.
      const next = setCartLineQty(current, item.productId, nextQty);
      await persistPersonal(next, current);
    },
    [active, user, toast, fetchCommunity, items, persistPersonal],
  );

  const remove = useCallback(
    async (item: CartItem) => {
      await setQty(item, 0);
    },
    [setQty],
  );

  const setStore = useCallback(
    async (item: CartItem, storeId: StoreId, options?: StoreMoveOptions) => {
      await selectStore(item.productId, storeId, options);
    },
    [selectStore],
  );

  const clear = useCallback(async () => {
    if (active.type === 'community') {
      if (!user) return;
      const { error } = await supabase
        .from('shared_cart_items')
        .delete()
        .eq('community_id', active.communityId);
      if (error) {
        toast(errorMessage(error, 'Could not clear the shared cart.'), 'error');
        return;
      }
      await fetchCommunity(active.communityId);
      return;
    }
    await persistPersonal([], itemsRef.current);
  }, [active, user, toast, fetchCommunity, persistPersonal, items]);

  const setActive = useCallback(
    (next: ActiveCart) => {
      if (next.type === 'community') {
        if (!signedIn) {
          toast('Sign in to use a community cart.', 'error');
          return;
        }
        if (!communities.some((community) => community.id === next.communityId)) {
          toast('You are not a member of that community.', 'error');
          return;
        }
      }
      writeActiveCart(next);
      setActiveState(next);
    },
    [signedIn, communities, toast],
  );

  const quantityOf = useCallback(
    (productId: number) => items.filter((item) => item.productId === productId).reduce((sum, item) => sum + item.quantity, 0),
    [items],
  );

  const itemFor = useCallback(
    (productId: number) => items.find((item) => item.productId === productId),
    [items],
  );

  const activeLabel =
    active.type === 'community'
      ? communities.find((community) => community.id === active.communityId)?.name ?? 'Community cart'
      : 'Personal cart';

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      active,
      activeLabel,
      totals,
      loading,
      storageMode,
      add,
      setQty,
      remove,
      setStore,
      selectedStore,
      storeFor,
      selectStore,
      clear,
      setActive,
      quantityOf,
      itemFor,
    }),
    [
      items,
      active,
      activeLabel,
      totals,
      loading,
      storageMode,
      add,
      setQty,
      remove,
      setStore,
      selectedStore,
      storeFor,
      selectStore,
      clear,
      setActive,
      quantityOf,
      itemFor,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

function displayNameOf(email?: string, metadata?: Record<string, unknown>): string {
  const name = metadata?.full_name;
  if (typeof name === 'string' && name.trim()) return name.trim();
  return email?.split('@')[0] ?? 'Member';
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used inside CartProvider');
  return context;
}
