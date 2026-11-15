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

// Supabase Auth's English error strings, reworded for the sign-in screen.
function friendlyAuthError(message: string): string {
  if (/invalid login credentials/i.test(message)) return "That email and PIN don't match.";
  if (/email not confirmed/i.test(message)) {
    return "Confirm your email first using the email we sent you.";
  }
  if (/token has expired|otp.*(expired|invalid)|invalid.*otp/i.test(message)) {
    return "That code is wrong or has expired. Check the latest email, or resend it.";
  }
  if (/should be different/i.test(message)) return "That's already your PIN. Pick a different one.";
  if (/already registered|already been registered/i.test(message)) {
    return "There's already an account with that email. Sign in instead.";
  }
  if (/password should be at least/i.test(message)) return "Your PIN must be 6 digits.";
  if (/rate limit|too many/i.test(message)) return "Too many attempts. Wait a minute and try again.";
  if (/signups not allowed|signup.*disabled/i.test(message)) return "New sign-ups are turned off.";
  return message;
}

/**
 * Fetches (or creates, on first sign-in) the signed-in person's Pleak user
 * row. The pleak_login() database function checks the email allowlist and
 * links rows imported from Google Sheets by email.
 */
export async function fetchAppUser(): Promise<User> {
  requireConfig();
  const { data, error } = await supabase.rpc("pleak_login");
  if (error) {
    // PostgREST's "function/table not found" codes: the migration hasn't run.
    if (["PGRST202", "PGRST205", "42P01", "42883"].includes(error.code)) {
      throw new ApiError(
        "The database isn't set up yet. Run supabase/migrations/20261014000000_initial_schema.sql in the Supabase SQL editor.",
      );
    }
    // The database's allowlist error predates email sign-in and says "Google account".
    if (/not allowed to sign in/i.test(error.message)) {
      throw new ApiError("That email isn't on Pleak's invite list yet.");
    }
    throw new ApiError(error.message);
  }
  return rowToRecord<User>(data as Record<string, unknown>);
}

// After Supabase Auth accepts the person, load their Pleak row. If that
// fails (not on the allowlist, say), don't leave a half-signed-in session.
async function loadAppUserOrSignOut(): Promise<User> {
  try {
    return await fetchAppUser();
  } catch (err) {
    await supabase.auth.signOut();
    throw err;
  }
}

export async function signInWithPassword(email: string, password: string): Promise<User> {
  requireConfig();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new ApiError(friendlyAuthError(error.message));
  return loadAppUserOrSignOut();
}

/**
 * Creates an account. Returns the user when Supabase signs them straight in,
 * or null when it first wants the email confirmed (the default setting).
 */
export async function signUpWithPassword(name: string, email: string, password: string): Promise<User | null> {
  requireConfig();
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { full_name: name.trim() }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw new ApiError(friendlyAuthError(error.message));
  // With confirmations on, signing up an email that already has an account
  // returns a user with no identities instead of an error.
  if (data.user && data.user.identities?.length === 0) {
    throw new ApiError("There's already an account with that email. Sign in instead.");
  }
  if (!data.session) return null;
  return loadAppUserOrSignOut();
}

/** Confirms a new account with the 6-digit code from its confirmation email. */
export async function confirmSignUp(email: string, code: string): Promise<User> {
  requireConfig();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "signup" });
  if (error) throw new ApiError(friendlyAuthError(error.message));
  return loadAppUserOrSignOut();
}

export async function resendSignUpCode(email: string): Promise<void> {
  requireConfig();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: email.trim(),
    options: { emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
  });
  if (error) throw new ApiError(friendlyAuthError(error.message));
}

/** Emails a 6-digit reset code (and, depending on the email template, a link). */
export async function sendPasswordReset(email: string): Promise<void> {
  requireConfig();
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin + import.meta.env.BASE_URL,
  });
  if (error) throw new ApiError(friendlyAuthError(error.message));
}

/** Checks the emailed reset code, then sets the new PIN and signs in. */
export async function resetWithCode(email: string, code: string, newPin: string): Promise<User> {
  requireConfig();
  const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token: code, type: "recovery" });
  if (error) throw new ApiError(friendlyAuthError(error.message));
  return setNewPassword(newPin);
}

export async function setNewPassword(password: string): Promise<User> {
  requireConfig();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) throw new ApiError(friendlyAuthError(error.message));
  return loadAppUserOrSignOut();
}

export async function signOutOfSupabase(): Promise<void> {
  await supabase.auth.signOut();
}
