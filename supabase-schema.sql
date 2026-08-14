-- ============================================================
--  TOKRI SOCIAL — SQL ADDITIONS (v3.2)
--  Run this in Supabase SQL Editor
-- ============================================================

-- 1. RPC: reassign_random_leader
CREATE OR REPLACE FUNCTION public.reassign_random_leader(community_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_leader_id uuid;
  remaining_count integer;
BEGIN
  SELECT COUNT(*) INTO remaining_count
  FROM public.community_members
  WHERE community_members.community_id = reassign_random_leader.community_id;

  IF remaining_count = 0 THEN
    DELETE FROM public.communities
    WHERE id = reassign_random_leader.community_id;
    RETURN;
  END IF;

  SELECT user_id INTO new_leader_id
  FROM public.community_members
  WHERE community_members.community_id = reassign_random_leader.community_id
  ORDER BY random()
  LIMIT 1;

  UPDATE public.communities
  SET leader_id = new_leader_id
  WHERE id = reassign_random_leader.community_id;
END;
$$;

-- 2. TRIGGER: enforce_10_community_cap
CREATE OR REPLACE FUNCTION public.check_community_cap()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  member_count integer;
BEGIN
  SELECT COUNT(*) INTO member_count
  FROM public.community_members
  WHERE user_id = NEW.user_id;

  IF member_count >= 10 THEN
    RAISE EXCEPTION 'User cannot join more than 10 communities'
      USING HINT = 'Leave an existing community before joining a new one.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_community_cap ON public.community_members;
CREATE TRIGGER enforce_community_cap
  BEFORE INSERT ON public.community_members
  FOR EACH ROW EXECUTE FUNCTION public.check_community_cap();

-- 3. Allow ALL authenticated users to discover communities
DROP POLICY IF EXISTS "Members can read their communities" ON public.communities;
DROP POLICY IF EXISTS "Members or leaders can read communities" ON public.communities;
DROP POLICY IF EXISTS "Authenticated users can read communities" ON public.communities;
DROP POLICY IF EXISTS "Allow community search" ON public.communities;

CREATE POLICY "Allow community search"
  ON public.communities FOR SELECT
  TO authenticated
  USING (true);

-- 4. Allow ALL authenticated users to see community members
DROP POLICY IF EXISTS "Members can read community members" ON public.community_members;
DROP POLICY IF EXISTS "Allow member discovery" ON public.community_members;

CREATE POLICY "Allow member discovery"
  ON public.community_members FOR SELECT
  TO authenticated
  USING (true);

-- 5. Allow leaders to delete their communities
DROP POLICY IF EXISTS "Leaders can delete their communities" ON public.communities;

CREATE POLICY "Leaders can delete their communities"
  ON public.communities FOR DELETE
  TO authenticated
  USING (leader_id = auth.uid());

-- 6. Ensure users can update their own full_name (nickname)
-- The original schema already has this policy but let's make sure
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;

CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

 -- last query done not all