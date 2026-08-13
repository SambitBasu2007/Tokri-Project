// ============================================================
//  shared/auth.js  |  Tokri Authentication Helpers
//  Email + Password — no OAuth, no email rate limits.
//
//  SUPABASE SETUP REQUIRED:
//  1. Authentication → Providers → Email → Toggle ON
//  2. Authentication → Providers → Email → Toggle OFF "Confirm email"
//     (This allows instant signup without waiting for verification.)
//  3. No SMTP provider needed.
//
//  USAGE:
//    import { signUp, signIn, getCurrentUser, signOut } from './shared/auth.js';
// ============================================================

import { supabase } from './supabase.js';

/**
 * Sign up a new user with email and password.
 * Returns the user session immediately — no email verification wait.
 * The public.users trigger auto-creates their profile row.
 */
export async function signUp(email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/index.html`,
    },
  });

  if (error) {
    console.error('Signup error:', error.message);
    throw error;
  }

  // data.user is set immediately when email confirmation is disabled
  return data;
}

/**
 * Sign in an existing user with email and password.
 */
export async function signIn(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    console.error('Sign-in error:', error.message);
    throw error;
  }

  return data;
}

/**
 * Returns the currently logged-in user (or null if none).
 * Safe to call on every page load.
 */
export async function getCurrentUser() {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error) {
    console.error('getCurrentUser error:', error.message);
    return null;
  }

  return user;
}

/**
 * Returns the current JWT session (includes access_token, refresh_token).
 */
export async function getSession() {
  const { data, error } = await supabase.auth.getSession();

  if (error) {
    console.error('getSession error:', error.message);
    return null;
  }

  return data.session;
}

/**
 * Signs the user out and clears the local session.
 */
export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) {
    console.error('Sign-out error:', error.message);
    throw error;
  }
}

/**
 * Subscribe to auth state changes (sign-in, sign-out, token refresh).
 * Returns an unsubscribe function. Call it on cleanup.
 */
export function onAuthStateChange(callback) {
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    callback(event, session);
  });

  return data.subscription;
}

/**
 * Fetch the user's public profile row from public.users.
 * Returns { id, email, full_name, avatar_url, created_at } or null.
 */
export async function getUserProfile() {
  const user = await getCurrentUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) {
    console.error('getUserProfile error:', error.message);
    return null;
  }

  return data;
}