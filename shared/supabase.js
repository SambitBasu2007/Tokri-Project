// ============================================================
//  shared/supabase.js  |  Supabase Client Singleton
//  Uses ES-module CDN import (no build step required).
//  Replace the two placeholders below with values from your
//  Supabase project → Project Settings → API.
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = window.__ENV__?.SUPABASE_URL || '';
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,   // handles OAuth redirect recovery
  },
  realtime: {
    timeout: 20000,
  },
});


if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('[Supabase] Missing SUPABASE_URL or SUPABASE_ANON_KEY in window.__ENV__');
}