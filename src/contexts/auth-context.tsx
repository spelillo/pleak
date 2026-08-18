import { createContext, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { loginWithGoogle } from "@/lib/auth-api";
import { ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

const STORAGE_KEY = "pleak-user";
const GIS_SCRIPT_SRC = "https://accounts.google.com/gsi/client";

interface GoogleCredentialResponse {
  credential: string;
}

interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
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
  renderSignInButton: (el: HTMLElement) => void;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? (JSON.parse(saved) as User) : null;
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGoogleReady, setIsGoogleReady] = useState(false);
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
  const initialized = useRef(false);

  useEffect(() => {
    if (!clientId || initialized.current) return;

    async function handleCredential(response: GoogleCredentialResponse) {
      setIsLoading(true);
      setError(null);
      try {
        const loggedInUser = await loginWithGoogle(response.credential);
        setUser(loggedInUser);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loggedInUser));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Sign-in failed.");
      } finally {
        setIsLoading(false);
      }
    }

    function initGoogle() {
      if (!window.google || initialized.current) return;
      window.google.accounts.id.initialize({ client_id: clientId!, callback: handleCredential });
      initialized.current = true;
      setIsGoogleReady(true);
    }

    if (window.google) {
      initGoogle();
      return;
    }

    const script = document.createElement("script");
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.onload = initGoogle;
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
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, error, isGoogleReady, renderSignInButton, signOut }}>
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
