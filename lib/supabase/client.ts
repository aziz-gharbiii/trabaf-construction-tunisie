import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** true quand les clés Supabase sont présentes au build (sinon : mode démo localStorage). */
export const supabaseConfigured = Boolean(url && anonKey && !url.includes('your-supabase'));

let client: SupabaseClient | null = null;

/** Client Supabase du navigateur (clé "anon" publique : la sécurité est assurée par les règles RLS). */
export function getSupabase(): SupabaseClient | null {
  if (!supabaseConfigured || typeof window === 'undefined') return null;
  if (!client) {
    client = createClient(url!, anonKey!, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'trabaf-admin-auth' }
    });
  }
  return client;
}
