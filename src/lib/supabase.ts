/**
 * Supabase Client Singleton
 * Server-side only — used in API routes via service_role key (bypasses RLS)
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (client) return client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  });

  return client;
}
