import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

type Mode = "sign-in" | "sign-up" | "forgot";

const MIN_PASSWORD_LENGTH = 8;

const COPY: Record<Mode | "reset", { title: string; subtitle: string; submit: string; busy: string }> = {
  "sign-in": {
    title: "Sign in to Pleak",
    subtitle: "Log and track your workouts.",
    submit: "Sign in",
    busy: "Signing in…",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Pleak is invite-only: use the email you were invited with.",
    submit: "Create account",
    busy: "Creating account…",
  },
  forgot: {
    title: "Reset your password",
    subtitle: "We'll email you a link to choose a new one.",
    submit: "Send reset link",
    busy: "Sending…",
  },
  reset: {
    title: "Choose a new password",
    subtitle: "You'll be signed in once it's saved.",
    submit: "Save password",
    busy: "Saving…",
  },
};

export function SignInGate() {
  const { setupError, isRecoveringPassword, signIn, signUp, requestPasswordReset, completePasswordReset } =
    useAuth();
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const view = isRecoveringPassword ? "reset" : mode;
  const copy = COPY[view];
  const needsPassword = view !== "forgot";
  const needsEmail = view !== "reset";

  function switchMode(next: Mode) {
    setMode(next);
    setError(null);
    setNotice(null);
    setPassword("");
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    if (needsPassword && view !== "sign-in" && password.length < MIN_PASSWORD_LENGTH) {
      setError(`Use a password of at least ${MIN_PASSWORD_LENGTH} characters.`);
      return;
    }
    setIsBusy(true);
    try {
      if (view === "sign-in") {
        await signIn(email, password);
      } else if (view === "sign-up") {
        const result = await signUp(name, email, password);
        if (result === "confirm-email") {
          switchMode("sign-in");
          setNotice(`Check ${email.trim()} for a confirmation link, then sign in.`);
        }
      } else if (view === "forgot") {
        await requestPasswordReset(email);
        setNotice(`If ${email.trim()} has an account, a reset link is on its way.`);
      } else {
        await completePasswordReset(password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Check your connection and try again.");
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex min-h-svh items-start justify-center bg-page px-4 pb-10 pt-[max(4rem,calc(env(safe-area-inset-top)+2.5rem))] sm:items-center sm:pt-10">
      <div className="flex w-full max-w-sm animate-materialize flex-col items-center gap-7 text-center">
        <img
          src={`${import.meta.env.BASE_URL}icon-192.png`}
          alt=""
          className="size-20 rounded-[22.5%] shadow-[0_8px_24px_rgb(39_116_174/0.28),0_1px_3px_rgb(0_0_0/0.08)]"
        />
        <div>
          <h1 className="text-2xl font-bold text-ink">{copy.title}</h1>
          <p className="mt-1.5 text-sm text-muted">{copy.subtitle}</p>
        </div>

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 text-left">
          {view === "sign-up" && (
            <label className="flex flex-col gap-1.5">
              <span className="px-1 text-xs font-medium text-muted">Name</span>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                className="bg-canvas! shadow-[var(--shadow-sm)]"
                required
              />
            </label>
          )}
          {needsEmail && (
            <label className="flex flex-col gap-1.5">
              <span className="px-1 text-xs font-medium text-muted">Email</span>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                autoCapitalize="none"
                className="bg-canvas! shadow-[var(--shadow-sm)]"
                required
              />
            </label>
          )}
          {needsPassword && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 text-xs font-medium text-muted">
                <label htmlFor="pleak-password">{view === "reset" ? "New password" : "Password"}</label>
                {view === "sign-in" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="font-medium text-brand-blue transition-opacity active:opacity-50"
                  >
                    Forgot password?
                  </button>
                )}
              </div>
              <Input
                id="pleak-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={view === "sign-in" ? "current-password" : "new-password"}
                className="bg-canvas! shadow-[var(--shadow-sm)]"
                required
              />
            </div>
          )}

          <Button type="submit" variant="primary" className="mt-2 h-12 w-full text-base" disabled={isBusy || !!setupError}>
            {isBusy ? copy.busy : copy.submit}
          </Button>
        </form>

        {!isRecoveringPassword && (
          <p className="text-sm text-muted">
            {mode === "sign-in" ? (
              <>
                New here?{" "}
                <button
                  type="button"
                  onClick={() => switchMode("sign-up")}
                  className="font-semibold text-brand-blue transition-opacity active:opacity-50"
                >
                  Create an account
                </button>
              </>
            ) : (
              <>
                {mode === "sign-up" ? "Already have an account? " : "Remembered it? "}
                <button
                  type="button"
                  onClick={() => switchMode("sign-in")}
                  className="font-semibold text-brand-blue transition-opacity active:opacity-50"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        )}

        {notice && (
          <Card variant="outline" className="flex w-full items-start gap-3 text-left" role="status">
            <CheckCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-brand-blue" />
            <p className="text-sm text-ink">{notice}</p>
          </Card>
        )}

        {(setupError || error) && (
          <Card variant="outline" className="flex w-full items-start gap-3 text-left" role="alert">
            <WarningCircle size={20} weight="fill" className="mt-0.5 shrink-0 text-error" />
            <p className="text-sm text-ink">{setupError ?? error}</p>
          </Card>
        )}
      </div>
    </div>
  );
}
