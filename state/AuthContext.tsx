import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase, errorMessage, isMissingRelation } from '../lib/supabase';
import { clearDeviceUserData } from '../lib/storage';
import type { CommunityWithMembers } from '../types';

export interface Profile {
  id: string;
  email: string | null;
  fullName: string | null;
  avatarUrl: string | null;
}

interface AuthContextValue {
  user: User | null;
  profile: Profile | null;
  communities: CommunityWithMembers[];
  loading: boolean;
  communitiesLoading: boolean;
  signedIn: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string) => Promise<string>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  refreshCommunities: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [communities, setCommunities] = useState<CommunityWithMembers[]>([]);
  const [loading, setLoading] = useState(true);
  const [communitiesLoading, setCommunitiesLoading] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setUser(data.session?.user ?? null);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      return;
    }
    const { data, error } = await supabase
      .from('users')
      .select('id, email, full_name, avatar_url')
      .eq('id', user.id)
      .maybeSingle();
    if (error) {
      if (!isMissingRelation(error)) console.warn('[Tokri] profile:', error.message);
      setProfile({ id: user.id, email: user.email ?? null, fullName: null, avatarUrl: null });
      return;
    }
    setProfile({
      id: user.id,
      email: data?.email ?? user.email ?? null,
      fullName: data?.full_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
    });
  }, [user]);

  const refreshCommunities = useCallback(async () => {
    if (!user) {
      setCommunities([]);
      return;
    }
    setCommunitiesLoading(true);
    try {
      const { data: memberships, error: membershipError } = await supabase
        .from('community_members')
        .select('community_id, user_id, nickname')
        .eq('user_id', user.id);
      if (membershipError) {
        if (!isMissingRelation(membershipError)) console.warn('[Tokri] communities:', membershipError.message);
        setCommunities([]);
        return;
      }
      const ids = (memberships ?? []).map((row) => row.community_id);
      if (!ids.length) {
        setCommunities([]);
        return;
      }
      const [{ data: rows, error }, { data: memberRows }] = await Promise.all([
        supabase.from('communities').select('id, handle, display_name, type, leader_id').in('id', ids),
        supabase
          .from('community_members')
          .select('community_id, user_id, nickname')
          .in('community_id', ids),
      ]);
      if (error) {
        console.warn('[Tokri] community rows:', error.message);
        setCommunities([]);
        return;
      }
      const mapped = (rows ?? []).map((community) => ({
        id: community.id,
        name: community.display_name,
        handle: community.handle,
        type: community.type,
        leaderId: community.leader_id,
        members: (memberRows ?? [])
          .filter((member) => member.community_id === community.id)
          .map((member) => ({
            communityId: member.community_id,
            userId: member.user_id,
            nickname: member.nickname,
          })),
      }));
      mapped.sort((a, b) => a.name.localeCompare(b.name));
      setCommunities(mapped);
    } finally {
      setCommunitiesLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setCommunities([]);
      return;
    }
    void refreshProfile();
    void refreshCommunities();
  }, [user, refreshProfile, refreshCommunities]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (error) throw new Error(error.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        data: { full_name: fullName.trim() },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) throw new Error(error.message);
    return data.session ? 'Signed in.' : 'Check your email to confirm the account, then sign in.';
  }, []);

  const signOut = useCallback(async () => {
    // Shared-computer rule: wipe this device's cart mirror, addresses, watches
    // and unfinished drafts before the session goes away. Server rows stay.
    clearDeviceUserData();
    const { error } = await supabase.auth.signOut();
    if (error) throw new Error(error.message);
  }, []);

  const updateName = useCallback(
    async (name: string) => {
      if (!user) throw new Error('Sign in first.');
      const { error } = await supabase.from('users').update({ full_name: name }).eq('id', user.id);
      if (error) throw new Error(errorMessage(error, 'Could not save your name.'));
      setProfile((current) => (current ? { ...current, fullName: name } : current));
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      communities,
      loading,
      communitiesLoading,
      signedIn: Boolean(user),
      signIn,
      signUp,
      signOut,
      refreshProfile,
      refreshCommunities,
      updateName,
    }),
    [
      user,
      profile,
      communities,
      loading,
      communitiesLoading,
      signIn,
      signUp,
      signOut,
      refreshProfile,
      refreshCommunities,
      updateName,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
