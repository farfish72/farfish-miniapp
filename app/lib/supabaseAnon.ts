import { createClient, type SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    "Supabase anon env vars missing: set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local"
  );
}

/**
 * Public Supabase client with anonymous key.
 * Respects Row Level Security (RLS) policies.
 * Safe to use in client and server code.
 */
export const supabaseAnon: SupabaseClient = createClient(url, anonKey);

export default supabaseAnon;

