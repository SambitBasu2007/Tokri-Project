export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type CommunityType = 'family' | 'friends';

type TableDef<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type StoreRow = {
  id: string;
  name: string;
  delivery_minutes: number;
  delivery_fee: number;
  free_above: number;
}

export type ProductRow = {
  id: number;
  name: string;
  category: string;
  weight: string;
  mrp: number;
  barcode: string | null;
  image_url: string | null;
  image_credit_url: string | null;
  unit_qty: number | null;
  unit: string | null;
}

export type PriceRow = {
  product_id: number;
  store_id: string;
  price: number;
  in_stock: boolean;
  updated_at: string;
}

export type PersonalCartRow = {
  user_id: string;
  product_id: number;
  store_id: string;
  quantity: number;
  updated_at: string;
}

export type OrderEventRow = {
  id: string;
  community_id: string | null;
  ordered_by: string;
  items: Json;
  amount: number;
  created_at: string;
  address_text: string | null;
  lat: number | null;
  lng: number | null;
}

export type OrderShipmentRow = {
  id: string;
  order_id: string;
  store_id: string;
  eta_minutes: number;
  subtotal: number;
  delivery_fee: number;
}

export type PriceSnapshotRow = {
  id: number;
  product_id: number;
  store_id: string;
  price: number;
  recorded_at: string;
}

export type PriceWatchRow = {
  id: string;
  user_id: string;
  product_id: number;
  store_id: string | null;
  target_price: number;
  created_at: string;
}

export type AddressRow = {
  id: string;
  user_id: string;
  label: string;
  line: string;
  pincode: string | null;
  lat: number | null;
  lng: number | null;
  is_default: boolean;
  created_at: string;
}

export type UserRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  created_at: string | null;
}

export type CommunityRow = {
  id: string;
  handle: string;
  display_name: string;
  type: CommunityType;
  leader_id: string;
  created_at: string | null;
}

export type CommunityMemberRow = {
  community_id: string;
  user_id: string;
  nickname: string | null;
  joined_at?: string | null;
}

export type JoinRequestRow = {
  id: string;
  community_id: string;
  user_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string | null;
}

export type SharedCartRow = {
  id: string;
  community_id: string;
  product_id: number;
  product_name: string;
  product_weight: string | null;
  product_emoji: string | null;
  selected_store: string;
  selected_price: number;
  mrp: number;
  qty: number;
  added_by: string;
  added_by_name: string | null;
  created_at: string;
  updated_at: string;
}

export type PlaceOrderArgs = {
  p_community_id: string | null;
  p_items: Json;
  p_amount: number;
  p_address_text: string | null;
  p_lat: number | null;
  p_lng: number | null;
}

export type Database = {
  public: {
    Tables: {
      stores: TableDef<StoreRow>;
      products: TableDef<ProductRow>;
      prices: TableDef<PriceRow>;
      personal_cart_items: TableDef<PersonalCartRow>;
      order_events: TableDef<OrderEventRow>;
      order_shipments: TableDef<OrderShipmentRow>;
      price_snapshots: TableDef<PriceSnapshotRow, Omit<PriceSnapshotRow, 'id' | 'recorded_at'>>;
      price_watches: TableDef<PriceWatchRow, Partial<PriceWatchRow>, Partial<PriceWatchRow>>;
      addresses: TableDef<AddressRow, Partial<AddressRow>, Partial<AddressRow>>;
      users: TableDef<UserRow>;
      communities: TableDef<CommunityRow, Omit<CommunityRow, 'id' | 'created_at'>, Partial<CommunityRow>>;
      community_members: TableDef<CommunityMemberRow>;
      join_requests: TableDef<JoinRequestRow, Omit<JoinRequestRow, 'id' | 'created_at'>, Partial<JoinRequestRow>>;
      shared_cart_items: TableDef<SharedCartRow, Partial<SharedCartRow>, Partial<SharedCartRow>>;
    };
    Views: {
      community_activity_feed: {
        Row: {
          id: string;
          community_id: string;
          ordered_by: string;
          items: Json;
          created_at: string;
        };
        Relationships: [];
      };
    };
    Functions: {
      place_order: {
        Args: PlaceOrderArgs;
        Returns: string;
      };
      server_now: {
        Args: Record<string, never>;
        Returns: string;
      };
      reassign_random_leader: {
        Args: { community_id: string };
        Returns: undefined;
      };
      delete_my_account: {
        Args: Record<string, never>;
        Returns: undefined;
      };
    };
    Enums: { [key: string]: never };
    CompositeTypes: { [key: string]: never };
  };
}
