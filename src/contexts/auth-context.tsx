import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { fetchAppUser, loginWithGoogle, signOutOfSupabase } from "@/lib/auth-api";
import { apiPost, ApiError } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

const STORAGE_KEY = "pleak-user";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

// OAuth client IDs aren't secret (Google puts them in every sign-in page),
// so the app's own ID is the fallback. Without it, a deploy missing the env
// var rendered a sign-in screen with no button and no explanation.
const DEFAULT_GOOGLE_CLIENT_ID = "899766933205-um8vmlar0c3jj443tqt9fhipt601gv1q.apps.googleusercontent.com";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
  nonce?: string;
}

interface GoogleIdApi {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: Record<string, unknown>) => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts: { id: GoogleIdApi } };
  }
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  isGoogleReady: boolean;
  setupError: string | null;
  renderSignInButton: (el: HTMLElement) => void;
  signOut: () => void;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
}

// null clears a field (undefined would just be left out of the update).
type ProfilePatch = {
  [K in "weight" | "height" | "age" | "sex" | "dateOfBirth"]?: User[K] | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Supabase verifies Google ID tokens against a nonce: Google gets the
// SHA-256 hash (it ends up in the token), Supabase gets the raw value.
async function createNonce(): Promise<{ raw: string; hashed: string }> {
  const raw = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))));
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const hashed = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return { raw, hashed };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const [googleLoadFailed, setGoogleLoadFailed] = useState(false);
  const clientId = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) || DEFAULT_GOOGLE_CLIENT_ID;
  const setupError = !isSupabaseConfigured
    ? "This deploy is missing its Supabase settings (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY), so sign-in can't work yet. Add them to the hosting project's environment variables and redeploy."
    : googleLoadFailed
      ? "Couldn't load Google sign-in. Check your connection or any content blocker, then reload."
      : null;
  const initialized = useRef(false);
  const nonceRef = useRef<string>("");

  // The cached user is only good while there's a live Supabase session
  // behind it (row-level security keys off that session). Drop it if the
  // session is gone (e.g. the first load after moving off Google Sheets),
  // otherwise refresh it from the database in the background.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    function clearUser() {
      setUser(null);
      localStorage.removeItem(STORAGE_KEY);
    }

    supabase.auth.getSession().then(async ({ data }) => {
      if (cancelled) return;
      if (!data.session) {
        clearUser();
        return;
      }
      try {
        const fresh = await fetchAppUser();
        if (cancelled) return;
        setUser(fresh);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
      } catch {
        // Offline or a transient error: keep the cached user.
      }
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") clearUser();
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!clientId || initialized.current) return;

    async function handleCredential(response: GoogleCredentialResponse) {
      setIsLoading(true);
      setError(null);
      try {
        const loggedInUser = await loginWithGoogle(response.credential, nonceRef.current);
        setUser(loggedInUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Sign-in failed.");
      } finally {
        setIsLoading(false);
      }
    }

    async function initGoogle() {
      if (!window.google || initialized.current) return;
      initialized.current = true;
      const nonce = await createNonce();
      nonceRef.current = nonce.raw;
      window.google.accounts.id.initialize({ client_id: clientId!, callback: handleCredential, nonce: nonce.hashed });
      setIsGoogleReady(true);
    }

    if (window.google) {
      void initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.onload = () => void initGoogle();
    script.onerror = () => setGoogleLoadFailed(true);
    document.head.appendChild(script);
  }, [clientId]);

  function renderSignInButton(el: HTMLElement) {
    if (!window.google || !isGoogleReady) return;
    window.google.accounts.id.renderButton(el, { theme: "outline", size: "large", width: 280 });
  }

  function signOut() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    window.google?.accounts.id.disableAutoSelect();
    void signOutOfSupabase();
  }

  async function updateProfile(patch: ProfilePatch) {
    if (!user) return;
    const updated = await apiPost<User>("users", "update", { id: user.id, ...patch });
    setUser(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  return (
    <AuthContext.Provider
      value={{ user, isLoading, error, isGoogleReady, setupError, renderSignInButton, signOut, updateProfile }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
