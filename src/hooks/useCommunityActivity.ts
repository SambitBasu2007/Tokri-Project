import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase, isMissingRelation } from '../lib/supabase';
import { parseOrderItems } from '../lib/orders';
import type { CommunityActivity } from '../types';
import { useAuth } from '../state/AuthContext';

/**
 * Read-only activity for communities the signed-in user belongs to.
 *
 * The `community_activity_feed` view deliberately exposes only id, community,
 * orderer, items and time. Amounts, addresses and shipment trackers stay on the
 * owner-only `order_events` table. Own orders are excluded here because the
 * Orders page already has the richer personal row for them.
 */
export function useCommunityActivity() {
  const { user, communities } = useAuth();
  const [activity, setActivity] = useState<CommunityActivity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestRef = useRef(0);

  const load = useCallback(async () => {
    const request = ++requestRef.current;

    if (!user || communities.length === 0) {
      setActivity([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const { data, error: feedError } = await supabase
        .from('community_activity_feed')
        .select('id, community_id, ordered_by, items, created_at')
        .in(
          'community_id',
          communities.map((community) => community.id),
        )
        .neq('ordered_by', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (request !== requestRef.current) return;

      if (feedError) {
        if (!isMissingRelation(feedError)) {
          console.warn('[Tokri] community activity:', feedError.message);
          setError(feedError.message);
        } else {
          setError(null);
        }
        setActivity([]);
        return;
      }

      const rows = (data ?? []).flatMap((row) => {
        const items = parseOrderItems(row.items);
        if (!items.length) return [];
        return [
          {
            id: row.id,
            communityId: row.community_id,
            orderedBy: row.ordered_by,
            items,
            createdAt: row.created_at,
          },
        ];
      });

      // Nicknames are per community; fall back to the account name for members
      // who have not set one. A failed users lookup must not blank the feed.
      const accountNames = new Map<string, string>();
      const ordererIds = [...new Set(rows.map((row) => row.orderedBy))];
      if (ordererIds.length > 0) {
        const { data: userRows } = await supabase
          .from('users')
          .select('id, full_name, email')
          .in('id', ordererIds);
        for (const row of userRows ?? []) {
          accountNames.set(row.id, row.full_name?.trim() || row.email?.split('@')[0] || 'Member');
        }
      }

      if (request !== requestRef.current) return;

      const withNames: CommunityActivity[] = rows.map((row) => {
        const nickname = communities
          .flatMap((community) => community.members)
          .find((member) => member.userId === row.orderedBy && member.nickname?.trim())?.nickname;

        return {
          ...row,
          orderedByName: nickname?.trim() || accountNames.get(row.orderedBy) || 'Member',
        };
      });

      setActivity(withNames);
      setError(null);
    } catch (err) {
      if (request !== requestRef.current) return;
      const message = err instanceof Error ? err.message : 'Community activity is unavailable.';
      console.warn('[Tokri] community activity:', message);
      setError(message);
      setActivity([]);
    } finally {
      if (request === requestRef.current) setLoading(false);
    }
  }, [user, communities]);

  useEffect(() => {
    void load();
  }, [load]);

  return { activity, loading, error, refresh: load };
}
