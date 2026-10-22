export type StoreId = 'blinkit' | 'zepto' | 'swiggy' | 'bigbasket' | 'jiomart' | 'flipkart';

export const STORE_IDS: StoreId[] = ['blinkit', 'zepto', 'swiggy', 'bigbasket', 'jiomart', 'flipkart'];

export interface Store {
  id: StoreId;
  name: string;
  deliveryMinutes: number;
  deliveryFee: number;
  freeAbove: number;
}

export interface ProductPrice {
  price: number;
  inStock: boolean;
}

export interface Product {
  id: number;
  name: string;
  category: string;
  weight: string;
  mrp: number;
  imageUrl: string | null;
  imageCreditUrl: string | null;
  barcode: string | null;
  unitQty: number | null;
  /** Base unit used for unit pricing: grams, millilitres, or pieces. */
  unit: string | null;
  prices: Partial<Record<StoreId, ProductPrice>>;
}

export interface CartItem {
  productId: number;
  storeId: StoreId;
  quantity: number;
  /** Set for rows in a community cart so ownership-aware writes are possible. */
  rowId?: string;
  addedBy?: string;
  addedByName?: string;
  /** Present when the line's store went out of stock and a fallback is shown. */
  fallbackFrom?: StoreId;
}

export type ActiveCart = { type: 'personal' } | { type: 'community'; communityId: string };

export interface Community {
  id: string;
  name: string;
  handle: string;
  type: 'family' | 'friends';
  leaderId: string;
  createdAt?: string;
}

export interface CommunityMember {
  communityId: string;
  userId: string;
  nickname: string | null;
}

export interface CommunityWithMembers extends Community {
  members: CommunityMember[];
}

export interface Address {
  id: string;
  label: string;
  line: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  isDefault: boolean;
}

export interface Coupon {
  code: string;
  minimum: number;
  percent: number;
  maxDiscount: number;
}

export interface CartLine {
  product: Product;
  quantity: number;
  unitPrice: number;
  mrp: number;
}

export interface StoreGroup {
  store: Store;
  lines: CartLine[];
  subtotal: number;
  mrpTotal: number;
  deliveryFee: number;
}

export interface Totals {
  groups: StoreGroup[];
  itemCount: number;
  subtotal: number;
  mrpTotal: number;
  savings: number;
  delivery: number;
  discount: number;
  total: number;
  couponError: string | null;
}

export interface PricePoint {
  storeId: StoreId;
  price: number;
  recordedAt: string;
}

export interface PriceWatch {
  id: string;
  productId: number;
  storeId: StoreId | null;
  targetPrice: number;
}

export interface OrderItem {
  productId: number;
  name: string;
  weight?: string;
  quantity: number;
  storeId: StoreId;
  price: number;
}

export interface Shipment {
  id: string;
  storeId: StoreId;
  etaMinutes: number;
  subtotal: number;
  deliveryFee: number;
}

export type OrderSource = 'db' | 'local';

export interface Order {
  id: string;
  communityId: string | null;
  orderedBy: string;
  items: OrderItem[];
  amount: number;
  addressText: string | null;
  createdAt: string;
  shipments: Shipment[];
  source: OrderSource;
}
