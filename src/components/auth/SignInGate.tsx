import { useEffect, useRef } from "react";
import { Barbell, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-context";
import { Card } from "@/components/ui/Card";

export function SignInGate() {
  const { isGoogleReady, isLoading, error, renderSignInButton } = useAuth();
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isGoogleReady && buttonRef.current) {
      renderSignInButton(buttonRef.current);
    }
  }, [isGoogleReady, renderSignInButton]);

  return (
    <div className="flex min-h-svh items-center justify-center bg-canvas px-4">
      <div className="flex w-full max-w-sm flex-col items-center gap-6 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-surface-card text-brand-blue">
          <Barbell size={26} weight="bold" />
        </div>
        <div>
          <h1 className="text-lg font-semibold text-ink">Sign in to Pleak</h1>
          <p className="mt-1 text-sm text-muted">
            Sign in with your Google account to log and track your workouts.
          </p>
        </div>

        <div ref={buttonRef} />
        {isLoading && <p className="text-sm text-muted">Signing in…</p>}

        {error && (
          <Card variant="outline" className="flex w-full items-start gap-3 border-error/30 text-left">
            <WarningCircle size={20} className="mt-0.5 shrink-0 text-error" />
            <p className="text-sm text-muted">{error}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
