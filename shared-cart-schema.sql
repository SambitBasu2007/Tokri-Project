-- ============================================================
--  TOKRI SOCIAL — Shared Community Cart (v4.0)
--  Run this in Supabase SQL Editor
-- ============================================================

-- 1. Create shared_cart_items table
CREATE TABLE IF NOT EXISTS public.shared_cart_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  product_id integer NOT NULL,
  product_name text NOT NULL,
  product_weight text,
  product_emoji text DEFAULT '',
  selected_store text NOT NULL,
  selected_price integer NOT NULL,
  mrp integer NOT NULL DEFAULT 0,
  qty integer NOT NULL DEFAULT 1,
  added_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  added_by_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Enable RLS on shared_cart_items
ALTER TABLE public.shared_cart_items ENABLE ROW LEVEL SECURITY;

-- 3. Policy: Community members can read shared cart items
DROP POLICY IF EXISTS "Members can read shared cart" ON public.shared_cart_items;
CREATE POLICY "Members can read shared cart"
  ON public.shared_cart_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.community_id = shared_cart_items.community_id
      AND community_members.user_id = auth.uid()
    )
  );

-- 4. Policy: Authenticated users can insert into shared cart
DROP POLICY IF EXISTS "Members can add to shared cart" ON public.shared_cart_items;
CREATE POLICY "Members can add to shared cart"
  ON public.shared_cart_items FOR INSERT
  TO authenticated
  WITH CHECK (
    added_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.community_members
      WHERE community_members.community_id = shared_cart_items.community_id
      AND community_members.user_id = auth.uid()
    )
  );

-- 5. Policy: Users can update their own shared cart items
DROP POLICY IF EXISTS "Users can update own shared cart items" ON public.shared_cart_items;
CREATE POLICY "Users can update own shared cart items"
  ON public.shared_cart_items FOR UPDATE
  TO authenticated
  USING (added_by = auth.uid())
  WITH CHECK (added_by = auth.uid());

-- 6. Policy: Users can delete their own shared cart items, leaders can delete any in their community
DROP POLICY IF EXISTS "Users can delete shared cart items" ON public.shared_cart_items;
CREATE POLICY "Users can delete shared cart items"
  ON public.shared_cart_items FOR DELETE
  TO authenticated
  USING (
    added_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.communities
      WHERE communities.id = shared_cart_items.community_id
      AND communities.leader_id = auth.uid()
    )
  );

-- 7. Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_shared_cart_timestamp()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_shared_cart_timestamp ON public.shared_cart_items;
CREATE TRIGGER update_shared_cart_timestamp
  BEFORE UPDATE ON public.shared_cart_items
  FOR EACH ROW EXECUTE FUNCTION public.update_shared_cart_timestamp();