// ============================================================
//  shared/supabase.js  |  Supabase Client Singleton
//  Uses ES-module CDN import (no build step required).
//  Replace the two placeholders below with values from your
//  Supabase project → Project Settings → API.
// ============================================================

// ============================================================
//  shared/supabase.js  |  Supabase Client Singleton
// ============================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const SUPABASE_URL = 'https://vukvxtmswgtlsnhgpoax.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ1a3Z4dG1zd2d0bHNuaGdwb2F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODY2MTkyNzQsImV4cCI6MjEwMjE5NTI3NH0.EtyZcMGOtvmYo2P8v3SG16mzu3DDY6K3rGja_qulsEc';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
  realtime: {
    timeout: 20000,
  },
});