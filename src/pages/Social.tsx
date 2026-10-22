import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronDown, Crown, Plus, Users } from 'lucide-react';
import type { Json } from '../lib/database.types';
import { supabase, errorMessage } from '../lib/supabase';
import { timeAgo } from '../lib/format';
import { clearDraft, readDraft, writeDraft, type CommunityDraft } from '../lib/drafts';
import { useAuth } from '../state/AuthContext';
import { useCart } from '../state/CartContext';
import { useToast } from '../state/ToastContext';
import type { CommunityWithMembers } from '../types';
import { AuthForm } from '../components/AuthForm';
import { EmptyState } from '../components/EmptyState';
import styles from './Social.module.css';
import common from './common.module.css';

interface JoinRequest {
  id: string;
  communityId: string;
  userId: string;
}

interface DiscoveredCommunity {
  id: string;
  handle: string;
  displayName: string;
  type: 'family' | 'friends';
  leaderId: string;
}

interface ActivityEvent {
  id: string;
  orderedBy: string;
  itemCount: number;
  createdAt: string;
}

export default function SocialPage() {
  const { user, profile, communities, refreshCommunities, communitiesLoading, signedIn } = useAuth();
  const { setActive } = useCart();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [names, setNames] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<string | null>(null);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [feeds, setFeeds] = useState<Record<string, ActivityEvent[]>>({});
  const [feedErrors, setFeedErrors] = useState<Record<string, boolean>>({});
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DiscoveredCommunity[]>([]);
  const [searching, setSearching] = useState(false);
  const [requested, setRequested] = useState<Set<string>>(new Set());
  const [showCreate, setShowCreate] = useState(false);
  const [createName, setCreateName] = useState(() => readDraft<CommunityDraft>('community')?.name ?? '');
  const [createHandle, setCreateHandle] = useState(() => readDraft<CommunityDraft>('community')?.handle ?? '');
  const [createType, setCreateType] = useState<'family' | 'friends'>(
    () => readDraft<CommunityDraft>('community')?.type ?? 'family',
  );
  const [creating, setCreating] = useState(false);

  // Keep an unfinished "create community" form across navigation and refresh.
  useEffect(() => {
    if (!showCreate) return;
    const draft: CommunityDraft = { name: createName, handle: createHandle, type: createType };
    if (draft.name.trim() || draft.handle.trim()) writeDraft('community', draft);
    else clearDraft('community');
  }, [showCreate, createName, createHandle, createType]);

  const resetCreateForm = () => {
    setCreateName('');
    setCreateHandle('');
    setCreateType('family');
  };

  const memberIds = communities.flatMap((community) => community.members.map((member) => member.userId));

  useEffect(() => {
    const ids = new Set<string>([...memberIds, ...requests.map((request) => request.userId)]);
    if (user) ids.add(user.id);
    if (!ids.size) return;
    supabase
      .from('users')
      .select('id, full_name, email')
      .in('id', [...ids])
      .then(({ data, error }) => {
        if (error) return;
        const map: Record<string, string> = {};
        for (const row of data ?? []) {
          map[row.id] = row.full_name?.trim() || row.email?.split('@')[0] || 'Member';
        }
        setNames((current) => ({ ...current, ...map }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [communities, requests, user]);

  const loadRequests = useCallback(async () => {
    if (!user) {
      setRequests([]);
      return;
    }
    const led = communities.filter((community) => community.leaderId === user.id).map((community) => community.id);
    if (!led.length) {
      setRequests([]);
      return;
    }
    const { data, error } = await supabase
      .from('join_requests')
      .select('id, community_id, user_id')
      .in('community_id', led)
      .eq('status', 'pending');
    if (error) {
      console.warn('[Tokri] join requests:', error.message);
      return;
    }
    setRequests(
      (data ?? []).map((row) => ({
        id: row.id,
        communityId: row.community_id,
        userId: row.user_id,
      })),
    );
  }, [user, communities]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useEffect(() => {
    if (!user) {
      setRequested(new Set());
      return;
    }
    supabase
      .from('join_requests')
      .select('community_id, status')
      .eq('user_id', user.id)
      .then(({ data }) => {
        if (!data) return;
        setRequested(
          new Set(data.filter((row) => row.status === 'pending').map((row) => row.community_id)),
        );
      });
  }, [user]);

  const nameFor = (userId: string, fallback?: string | null) =>
    names[userId] ?? fallback ?? (userId === user?.id ? profile?.fullName ?? 'You' : 'Member');

  const toggleCommunity = async (community: CommunityWithMembers) => {
    if (expanded === community.id) {
      setExpanded(null);
      return;
    }
    setExpanded(community.id);
    if (feeds[community.id]) return;
    const { data, error } = await supabase
      .from('community_activity_feed')
      .select('id, ordered_by, items, created_at')
      .eq('community_id', community.id)
      .order('created_at', { ascending: false })
      .limit(6);
    if (error) {
      setFeedErrors((current) => ({ ...current, [community.id]: true }));
      return;
    }
    setFeeds((current) => ({
      ...current,
      [community.id]: (data ?? []).map((row) => ({
        id: row.id,
        orderedBy: row.ordered_by,
        itemCount: Array.isArray(row.items as Json) ? (row.items as Json[]).length : 0,
        createdAt: row.created_at,
      })),
    }));
  };

  const search = async () => {
    const value = query.trim().replace(/^@/, '');
    if (!value) return;
    setSearching(true);
    try {
      const { data, error } = await supabase
        .from('communities')
        .select('id, handle, display_name, type, leader_id')
        .ilike('handle', `%${value}%`)
        .limit(20);
      if (error) throw new Error(error.message);
      const joined = new Set(communities.map((community) => community.id));
      setResults(
        (data ?? [])
          .filter((row) => !joined.has(row.id))
          .map((row) => ({
            id: row.id,
            handle: row.handle,
            displayName: row.display_name,
            type: row.type,
            leaderId: row.leader_id,
          })),
      );
    } catch (err) {
      toast(errorMessage(err, 'Community search failed.'), 'error');
    } finally {
      setSearching(false);
    }
  };

  const sendRequest = async (communityId: string) => {
    if (!user) return;
    const { error } = await supabase.from('join_requests').insert({
      community_id: communityId,
      user_id: user.id,
      status: 'pending',
    });
    if (error) {
      toast(errorMessage(error, 'Could not send the request.'), 'error');
      return;
    }
    setRequested((current) => new Set(current).add(communityId));
    toast('Join request sent. The leader has to accept it.', 'success');
  };

  const createCommunity = async () => {
    if (!user) return;
    const handle = createHandle.trim().toLowerCase().replace(/^@/, '');
    if (!createName.trim()) {
      toast('Give the community a name.', 'error');
      return;
    }
    if (!/^[a-z0-9_]{3,20}$/.test(handle)) {
      toast('Handle must be 3–20 characters: letters, numbers or underscores.', 'error');
      return;
    }
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from('communities')
        .insert({
          handle,
          display_name: createName.trim(),
          type: createType,
          leader_id: user.id,
        })
        .select('id')
        .single();
      if (error) throw new Error(error.message);
      const { error: memberError } = await supabase.from('community_members').insert({
        community_id: data.id,
        user_id: user.id,
        nickname: profile?.fullName ?? 'Leader',
      });
      if (memberError) throw new Error(memberError.message);
      toast('Community created.', 'success');
      clearDraft('community');
      setShowCreate(false);
      resetCreateForm();
      await refreshCommunities();
    } catch (err) {
      toast(errorMessage(err, 'Could not create the community.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const acceptRequest = async (request: JoinRequest) => {
    const { error } = await supabase
      .from('join_requests')
      .update({ status: 'accepted' })
      .eq('id', request.id);
    if (error) {
      toast(errorMessage(error, 'Could not accept the request.'), 'error');
      return;
    }
    const { error: memberError } = await supabase.from('community_members').insert({
      community_id: request.communityId,
      user_id: request.userId,
      nickname: 'Member',
    });
    if (memberError) {
      toast(errorMessage(memberError, 'Request accepted, but the member insert failed (10-community cap?).'), 'error');
    } else {
      toast('Member added.', 'success');
    }
    await Promise.all([loadRequests(), refreshCommunities()]);
  };

  const rejectRequest = async (request: JoinRequest) => {
    const { error } = await supabase
      .from('join_requests')
      .update({ status: 'rejected' })
      .eq('id', request.id);
    if (error) {
      toast(errorMessage(error, 'Could not reject the request.'), 'error');
      return;
    }
    await loadRequests();
  };

  const removeMember = async (communityId: string, userId: string) => {
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', communityId)
      .eq('user_id', userId);
    if (error) {
      toast(errorMessage(error, 'Could not remove the member.'), 'error');
      return;
    }
    toast('Member removed.');
    await refreshCommunities();
  };

  const transferLeadership = async (communityId: string, userId: string) => {
    const { error } = await supabase
      .from('communities')
      .update({ leader_id: userId })
      .eq('id', communityId);
    if (error) {
      toast(errorMessage(error, 'Could not transfer leadership.'), 'error');
      return;
    }
    toast('Leadership transferred.', 'success');
    await refreshCommunities();
  };

  const leaveCommunity = async (community: CommunityWithMembers) => {
    if (!user) return;
    const { error } = await supabase
      .from('community_members')
      .delete()
      .eq('community_id', community.id)
      .eq('user_id', user.id);
    if (error) {
      toast(errorMessage(error, 'Could not leave the community.'), 'error');
      return;
    }
    if (community.leaderId === user.id) {
      const { error: reassignError } = await supabase.rpc('reassign_random_leader', {
        community_id: community.id,
      });
      if (reassignError) console.warn('[Tokri] reassign leader:', reassignError.message);
    }
    await supabase.from('join_requests').delete().eq('community_id', community.id).eq('user_id', user.id);
    toast('Left the community.');
    await refreshCommunities();
  };

  if (!signedIn) {
    return (
      <div className="page">
        <div className="container">
          <div className={common.pageHead}>
            <div>
              <h1>Communities</h1>
              <p className={common.lede}>
                Share one basket with family or friends, see who added what, and stop buying the
                same milk twice.
              </p>
            </div>
          </div>
          <div className={common.split}>
            <div className={common.panel}>
              <AuthForm />
            </div>
            <div className={common.panel}>
              <h2 className={common.panelTitle}>How shared carts work</h2>
              <ul className={common.prose} style={{ marginTop: '8px' }}>
                <li>Create a Family or Friends community and share its @handle.</li>
                <li>Members add items to the community cart; everyone sees the same basket live.</li>
                <li>The leader accepts join requests and can remove members.</li>
                <li>Checkout from the shared cart records the order without exposing the amount or address in the activity feed.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <div className="container">
        <div className={common.pageHead}>
          <div>
            <h1>Communities</h1>
            <p className={common.lede}>
              Up to 10 communities per person. Switch carts from the header to shop a shared basket.
            </p>
          </div>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowCreate((current) => !current)}>
            <Plus size={14} aria-hidden />
            New community
          </button>
        </div>

        {showCreate && (
          <section className={common.panel} style={{ marginBottom: '16px' }}>
            <div className={common.panelHead}>
              <h2 className={common.panelTitle}>Create a community</h2>
              <span className={common.panelMeta}>Handle is unique and searchable</span>
            </div>
            <div className={common.formGrid}>
              <div className={styles.createGrid}>
                <div className={common.formRow}>
                  <label className={common.label} htmlFor="community-name">
                    Display name
                  </label>
                  <input
                    id="community-name"
                    className="field"
                    value={createName}
                    onChange={(event) => setCreateName(event.target.value)}
                    placeholder="Sharma Family"
                  />
                </div>
                <div className={common.formRow}>
                  <label className={common.label} htmlFor="community-handle">
                    Handle
                  </label>
                  <input
                    id="community-handle"
                    className="field"
                    value={createHandle}
                    onChange={(event) => setCreateHandle(event.target.value)}
                    placeholder="sharma_family"
                  />
                </div>
                <div className={common.formRow}>
                  <label className={common.label} htmlFor="community-type">
                    Type
                  </label>
                  <select
                    id="community-type"
                    className="field"
                    value={createType}
                    onChange={(event) => setCreateType(event.target.value as 'family' | 'friends')}
                  >
                    <option value="family">Family</option>
                    <option value="friends">Friends</option>
                  </select>
                </div>
              </div>
              <div className={common.actions}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void createCommunity()}
                  disabled={creating}
                >
                  {creating ? 'Creating…' : 'Create community'}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() => {
                    clearDraft('community');
                    resetCreateForm();
                    setShowCreate(false);
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        )}

        <div className={common.split}>
          <div>
            {communitiesLoading ? (
              <p className={common.note}>Loading your communities…</p>
            ) : communities.length === 0 ? (
              <EmptyState
                icon={<Users size={28} strokeWidth={1.5} aria-hidden />}
                title="No communities yet"
                action={<button type="button" className="btn" onClick={() => setShowCreate(true)}>Create one</button>}
              >
                Join a community by its @handle, or create one for your household.
              </EmptyState>
            ) : (
              communities.map((community) => {
                const isLeader = community.leaderId === user?.id;
                const isOpen = expanded === community.id;
                const pending = requests.filter((request) => request.communityId === community.id);
                return (
                  <section key={community.id} className={styles.community}>
                    <div className={styles.communityHead}>
                      <div className={styles.communityTitleWrap}>
                        <h2 className={styles.communityName}>{community.name}</h2>
                        <p className={styles.communityMeta}>
                          @{community.handle} · {community.type === 'family' ? 'Family' : 'Friends'} ·{' '}
                          {community.members.length} member{community.members.length === 1 ? '' : 's'}
                          {isLeader ? ' · you lead this' : ''}
                        </p>
                      </div>
                      <div className={styles.communityActions}>
                        <button
                          type="button"
                          className="btn btn-sm"
                          onClick={() => {
                            setActive({ type: 'community', communityId: community.id });
                            navigate('/');
                          }}
                        >
                          Shop cart
                        </button>
                        <button
                          type="button"
                          className="btn btn-sm"
                          aria-expanded={isOpen}
                          onClick={() => void toggleCommunity(community)}
                        >
                          {isOpen ? 'Hide' : 'Open'}
                          <ChevronDown size={13} aria-hidden />
                        </button>
                      </div>
                    </div>

                    {isOpen && (
                      <div className={styles.communityBody}>
                        <div>
                          <h3 className={styles.subHead}>Members</h3>
                          <ul className={styles.members}>
                            {community.members.map((member) => (
                              <li key={member.userId} className={styles.member}>
                                <span className={styles.memberName}>
                                  {member.userId === community.leaderId && (
                                    <Crown size={12} strokeWidth={1.5} aria-label="Leader" />
                                  )}
                                  {nameFor(member.userId, member.nickname)}
                                  {member.userId === user?.id ? ' (you)' : ''}
                                </span>
                                {isLeader && member.userId !== user?.id && (
                                  <span className={styles.memberActions}>
                                    <button
                                      type="button"
                                      className={styles.textLink}
                                      onClick={() => void transferLeadership(community.id, member.userId)}
                                    >
                                      Make leader
                                    </button>
                                    <button
                                      type="button"
                                      className={styles.textLink}
                                      onClick={() => void removeMember(community.id, member.userId)}
                                    >
                                      Remove
                                    </button>
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>

                        {isLeader && (
                          <div>
                            <h3 className={styles.subHead}>Join requests</h3>
                            {pending.length === 0 ? (
                              <p className={common.smallNote}>No pending requests.</p>
                            ) : (
                              <ul className={styles.members}>
                                {pending.map((request) => (
                                  <li key={request.id} className={styles.member}>
                                    <span className={styles.memberName}>{nameFor(request.userId)}</span>
                                    <span className={styles.memberActions}>
                                      <button type="button" className="btn btn-sm" onClick={() => void acceptRequest(request)}>
                                        Accept
                                      </button>
                                      <button type="button" className="btn btn-sm" onClick={() => void rejectRequest(request)}>
                                        Reject
                                      </button>
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                        )}

                        <div>
                          <h3 className={styles.subHead}>Recent activity</h3>
                          {feedErrors[community.id] ? (
                            <p className={common.smallNote}>
                              Activity feed unavailable. Run the V2 migration to create the
                              privacy-safe view.
                            </p>
                          ) : feeds[community.id]?.length ? (
                            <ul className={styles.feed}>
                              {feeds[community.id].map((event) => (
                                <li key={event.id} className={styles.feedItem}>
                                  <span>{nameFor(event.orderedBy)} ordered {event.itemCount} item{event.itemCount === 1 ? '' : 's'}</span>
                                  <span className={styles.feedTime}>{timeAgo(event.createdAt)}</span>
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <p className={common.smallNote}>No community orders yet.</p>
                          )}
                          <p className={common.smallNote} style={{ marginTop: '6px' }}>
                            The feed deliberately omits order amounts and delivery addresses.
                          </p>
                        </div>

                        <div className={styles.leaveRow}>
                          <button type="button" className="btn btn-sm" onClick={() => void leaveCommunity(community)}>
                            Leave community
                          </button>
                        </div>
                      </div>
                    )}
                  </section>
                );
              })
            )}
          </div>

          <aside>
            <section className={common.panel}>
              <div className={common.panelHead}>
                <h2 className={common.panelTitle}>Join a community</h2>
              </div>
              <form
                className={styles.searchRow}
                onSubmit={(event) => {
                  event.preventDefault();
                  void search();
                }}
              >
                <input
                  className="field"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="@handle"
                  aria-label="Search communities by handle"
                />
                <button type="submit" className="btn btn-sm" disabled={searching}>
                  {searching ? '…' : 'Search'}
                </button>
              </form>
              <div className={styles.results}>
                {results.map((result) => (
                  <div key={result.id} className={styles.result}>
                    <div className={styles.resultMain}>
                      <p className={styles.resultName}>{result.displayName}</p>
                      <p className={styles.resultMeta}>
                        @{result.handle} · {result.type} · led by {nameFor(result.leaderId)}
                      </p>
                    </div>
                    <button
                      type="button"
                      className="btn btn-sm"
                      disabled={requested.has(result.id)}
                      onClick={() => void sendRequest(result.id)}
                    >
                      {requested.has(result.id) ? 'Requested' : 'Request to join'}
                    </button>
                  </div>
                ))}
                {!searching && query && !results.length && (
                  <p className={common.smallNote}>No matches. Handles are case-insensitive but partial.</p>
                )}
              </div>
              <p className={common.smallNote} style={{ marginTop: '8px' }}>
                A leader must accept the request before the shared cart unlocks.
              </p>
            </section>

            <section className={common.panel}>
              <h2 className={common.panelTitle}>Rules</h2>
              <ul className={common.prose} style={{ marginTop: '8px' }}>
                <li>10 communities per person, enforced by a database trigger.</li>
                <li>Leaders accept requests, remove members and transfer leadership.</li>
                <li>If a leader leaves, a random remaining member becomes leader.</li>
                <li>Community carts update live in other open tabs.</li>
              </ul>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
