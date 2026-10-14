import { createClient } from "@supabase/supabase-js";

// Pleak's own Supabase project. Both values are public by design (the
// publishable key only grants what row-level security allows), so they're
// the defaults; VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY override them,
// e.g. to point a local build at another project.
const DEFAULT_SUPABASE_URL = "https://qtpeykoavfbdopbqigha.supabase.co";
const DEFAULT_SUPABASE_KEY = "sb_publishable_DBLWXTZFRPub039JtSlwfQ_DY-mf1Kc";

const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || DEFAULT_SUPABASE_URL;
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || DEFAULT_SUPABASE_KEY;

export const isSupabaseConfigured = !!SUPABASE_URL && !!SUPABASE_ANON_KEY;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
