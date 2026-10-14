import { ApiError, rowToRecord } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

function requireConfig() {
  if (!isSupabaseConfigured) {
    throw new ApiError(
      "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in .env.local.",
    );
  }
}

/**
 * Fetches (or creates, on first sign-in) the signed-in person's Pleak user
 * row. The pleak_login() database function checks the email allowlist and
 * links rows imported from Google Sheets by email.
 */
export async function fetchAppUser(): Promise<User> {
  requireConfig();
  const { data, error } = await supabase.rpc("pleak_login");
  if (error) throw new ApiError(error.message);
  return rowToRecord<User>(data as Record<string, unknown>);
}

/**
 * Exchanges a Google Identity Services ID token for a Supabase session, then
 * loads the app user. `nonce` is the raw nonce whose SHA-256 was handed to
 * Google when the sign-in button was initialized.
 */
export async function loginWithGoogle(idToken: string, nonce: string): Promise<User> {
  requireConfig();
  const { error } = await supabase.auth.signInWithIdToken({ provider: "google", token: idToken, nonce });
  if (error) throw new ApiError(error.message);
  try {
    return await fetchAppUser();
  } catch (err) {
    // Not on the allowlist (or the profile lookup failed): don't leave a
    // half-signed-in Supabase session behind.
    await supabase.auth.signOut();
    throw err;
  }
}

export async function signOutOfSupabase(): Promise<void> {
  await supabase.auth.signOut();
}
