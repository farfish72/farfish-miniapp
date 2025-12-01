import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _supabaseServer: SupabaseClient | null = null;

/**
 * Server-side Supabase client with service-role key.
 * WARNING: This client bypasses RLS and has full database access.
 * Only use in API routes and server-side code. Never expose to client.
 * 
 * Lazy initialization: Client is created only when first accessed.
 */
function getSupabaseServer(): SupabaseClient {
  if (_supabaseServer) {
    return _supabaseServer;
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Supabase server env vars missing: set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local (server-only)"
    );
  }

  _supabaseServer = createClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return _supabaseServer;
}

// Export lazy getter - client is only created when accessed
export function getSupabaseServerClient(): SupabaseClient {
  return getSupabaseServer();
}

// Export as a property that lazily initializes on first access
// This allows existing imports to work while delaying initialization
const supabaseServerProxy = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    const client = getSupabaseServer();
    const value = Reflect.get(client, prop, receiver);
    if (typeof value === "function") {
      return value.bind(client);
    }
    return value;
  },
});

export const supabaseServer = supabaseServerProxy;
export default supabaseServer;

