import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// These should be stored in environment variables in production
// For development, you can use a .env file with Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

function noStoreFetch(input, init = {}) {
  const headers = new Headers(init.headers || undefined);

  if (!headers.has('Cache-Control')) {
    headers.set('Cache-Control', 'no-cache');
  }

  return fetch(input, {
    ...init,
    cache: 'no-store',
    headers
  });
}

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️ Supabase URL or Anon Key is missing. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: noStoreFetch
  },
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    storage: window.localStorage
  }
});

export const supabasePublic = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  global: {
    fetch: noStoreFetch
  },
  auth: {
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
    storageKey: 'obyava-public-client'
  }
});

// Helper to check if Supabase is configured
export function isSupabaseConfigured() {
  return !!(SUPABASE_URL && SUPABASE_ANON_KEY);
}
