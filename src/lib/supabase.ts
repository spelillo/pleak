import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

// With env vars missing we still construct a client (against a placeholder
// URL) so imports don't throw at module load; api.ts checks
// isSupabaseConfigured and surfaces a clear error on the first request.
export const supabase = createClient(
  SUPABASE_URL ?? "http://localhost:54321",
  SUPABASE_ANON_KEY ?? "missing-anon-key",
);
