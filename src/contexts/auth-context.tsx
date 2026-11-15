import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  confirmSignUp,
  fetchAppUser,
  resendSignUpCode,
  resetWithCode,
  sendPasswordReset,
  setNewPassword,
  signInWithPassword,
  signOutOfSupabase,
  signUpWithPassword,
} from "@/lib/auth-api";
import { apiPost } from "@/lib/api";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import type { User } from "@/lib/types";

const STORAGE_KEY = "pleak-user";

interface AuthContextType {
  user: User | null;
  setupError: string | null;
  // True after opening a password-reset link: the person has a session but
  // must choose a new password before going into the app.
  isRecoveringPassword: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  // Resolves to "signed-in", or "confirm-email" when Supabase wants the
  // address confirmed before the first sign-in.
  signUp: (name: string, email: string, password: string) => Promise<"signed-in" | "confirm-email">;
  confirmEmail: (email: string, code: string) => Promise<void>;
  resendConfirmation: (email: string) => Promise<void>;
  requestPasswordReset: (email: string) => Promise<void>;
  // From the emailed reset code.
  resetPin: (email: string, code: string, pin: string) => Promise<void>;
  // From a reset link (isRecoveringPassword), where the session already exists.
  completePasswordReset: (password: string) => Promise<void>;
  signOut: () => void;
  updateProfile: (patch: ProfilePatch) => Promise<void>;
}

// null clears a field (undefined would just be left out of the update).
type ProfilePatch = {
  [K in "weight" | "height" | "age" | "sex" | "dateOfBirth"]?: User[K] | null;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  });
  const [isRecoveringPassword, setIsRecoveringPassword] = useState(false);
  // Bumped on every sign-out, so a profile refresh that was already in
  // flight can't land afterwards and put the person back in the app.
  const signOutCount = useRef(0);
  const setupError = isSupabaseConfigured
    ? null
    : "This deploy is missing its Supabase settings (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY), so sign-in can't work yet.";

  function setUser(next: User | null) {
    setUserState(next);
    if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else localStorage.removeItem(STORAGE_KEY);
  }

  // The cached user is only good while there's a live Supabase session
  // behind it (row-level security keys off that session). Drop it if the
  // session is gone, otherwise refresh it from the database. This also
  // picks up the session from an email-confirmation link.
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;

    async function refresh() {
      const startedAt = signOutCount.current;
      try {
        const fresh = await fetchAppUser();
        if (!cancelled && startedAt === signOutCount.current) setUser(fresh);
      } catch {
        // Offline or a transient error: keep the cached user.
      }
    }

    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session) void refresh();
      else setUser(null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        signOutCount.current += 1;
        setUser(null);
      }
      if (event === "PASSWORD_RECOVERY") setIsRecoveringPassword(true);
      // Confirmation links sign the person in on load. Deferred so the
      // database call doesn't run inside Supabase's auth callback.
      if (event === "SIGNED_IN") setTimeout(() => void refresh(), 0);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setUser(await signInWithPassword(email, password));
  }

  async function signUp(name: string, email: string, password: string) {
    const created = await signUpWithPassword(name, email, password);
    if (!created) return "confirm-email" as const;
    setUser(created);
    return "signed-in" as const;
  }

  async function confirmEmail(email: string, code: string) {
    setUser(await confirmSignUp(email, code));
  }

  async function resetPin(email: string, code: string, pin: string) {
    setUser(await resetWithCode(email, code, pin));
    setIsRecoveringPassword(false);
  }

  async function completePasswordReset(password: string) {
    setUser(await setNewPassword(password));
    setIsRecoveringPassword(false);
  }

  function signOut() {
    signOutCount.current += 1;
    setUser(null);
    setIsRecoveringPassword(false);
    void signOutOfSupabase();
  }

  async function updateProfile(patch: ProfilePatch) {
    if (!user) return;
    setUser(await apiPost<User>("users", "update", { id: user.id, ...patch }));
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        setupError,
        isRecoveringPassword,
        signIn,
        signUp,
        confirmEmail,
        resendConfirmation: resendSignUpCode,
        requestPasswordReset: sendPasswordReset,
        resetPin,
        completePasswordReset,
        signOut,
        updateProfile,
      }}
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
