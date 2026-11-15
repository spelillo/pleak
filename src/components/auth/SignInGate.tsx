import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

// sign-in: email + PIN. sign-up: name, email, PIN, then confirm (emailed
// code). forgot: email, then reset-code (emailed code + new PIN). "reset" is
// the older link-based path, where opening the link already signed them in.
type Mode = "sign-in" | "sign-up" | "confirm" | "forgot" | "reset-code";
type View = Mode | "reset";

const PIN_LENGTH = 6;
const CODE_LENGTH = 6;
const digitsOnly = (value: string, max: number) => value.replace(/\D/g, "").slice(0, max);

// Supabase sends people back with #error=...&error_code=otp_expired when a
// confirmation or reset link is stale or was already used. Read it once and
// clear it from the address bar.
function takeLinkError(): string | null {
  const params = new URLSearchParams(window.location.hash.slice(1));
  if (!params.get("error")) return null;
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
  if (params.get("error_code") === "otp_expired") {
    return "That email link has expired or was already used. Request a new one below.";
  }
  return params.get("error_description") ?? "That email link didn't work. Try again.";
}

// Read at load, before anything else can rewrite the address.
const initialLinkError = takeLinkError();

const COPY: Record<View, { title: string; subtitle: string; submit: string; busy: string }> = {
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
  confirm: {
    title: "Check your email",
    subtitle: "Open the link in the email we sent, or type its 6-digit code here.",
    submit: "Confirm",
    busy: "Confirming…",
  },
  forgot: {
    title: "Forgot your PIN?",
    subtitle: "We'll email you a link (or code) to set a new one.",
    submit: "Send code",
    busy: "Sending…",
  },
  "reset-code": {
    title: "Choose a new PIN",
    subtitle: "Open the link in the email, or type its code and a new PIN here.",
    submit: "Save PIN",
    busy: "Saving…",
  },
  reset: {
    title: "Choose a new PIN",
    subtitle: "You'll be signed in once it's saved.",
    submit: "Save PIN",
    busy: "Saving…",
  },
};

const fieldClass = "bg-canvas! shadow-[var(--shadow-sm)]";
const digitFieldClass = `${fieldClass} text-center text-lg font-semibold tracking-[0.5em] tabular-nums`;

export function SignInGate() {
  const auth = useAuth();
  const { setupError, isRecoveringPassword } = auth;
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pin, setPin] = useState("");
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialLinkError);
  const [notice, setNotice] = useState<string | null>(null);

  const view: View = isRecoveringPassword ? "reset" : mode;
  const copy = COPY[view];
  const needsEmail = view === "sign-in" || view === "sign-up" || view === "forgot";
  const needsCode = view === "confirm" || view === "reset-code";
  const needsPin = view !== "forgot" && view !== "confirm";
  const isNewPin = view !== "sign-in";

  function switchMode(next: Mode, keepMessages = false) {
    setMode(next);
    if (!keepMessages) {
      setError(null);
      setNotice(null);
    }
    setPin("");
    setCode("");
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setIsBusy(true);
    try {
      await action();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Check your connection and try again.");
    } finally {
      setIsBusy(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (needsPin && pin.length !== PIN_LENGTH) {
      setError(`Your PIN is ${PIN_LENGTH} digits.`);
      return;
    }
    if (needsCode && code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`);
      return;
    }
    void run(async () => {
      if (view === "sign-in") {
        try {
          await auth.signIn(email, pin);
        } catch (err) {
          // Never confirmed: take them to the code screen instead of a dead end.
          if (err instanceof ApiError && /confirm your email/i.test(err.message)) {
            switchMode("confirm", true);
            setNotice(`Confirm ${email.trim()} first using the email we sent. No email? Send a new one.`);
            return;
          }
          throw err;
        }
      } else if (view === "sign-up") {
        const result = await auth.signUp(name, email, pin);
        if (result === "confirm-email") {
          switchMode("confirm", true);
          setNotice(`We sent a confirmation email to ${email.trim()}.`);
        }
      } else if (view === "confirm") {
        await auth.confirmEmail(email, code);
      } else if (view === "forgot") {
        await auth.requestPasswordReset(email);
        switchMode("reset-code", true);
        setNotice(`If ${email.trim()} has an account, a reset email is on its way.`);
      } else if (view === "reset-code") {
        await auth.resetPin(email, code, pin);
      } else {
        await auth.completePasswordReset(pin);
      }
    });
  }

  function resendCode() {
    void run(async () => {
      if (view === "confirm") await auth.resendConfirmation(email);
      else await auth.requestPasswordReset(email);
      setNotice(`Sent a new email to ${email.trim()}.`);
    });
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

        <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4 text-left" noValidate>
          {view === "sign-up" && (
            <label className="flex flex-col gap-1.5">
              <span className="px-1 text-xs font-medium text-muted">Name</span>
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" className={fieldClass} required />
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
                className={fieldClass}
                required
              />
            </label>
          )}
          {needsCode && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 text-xs font-medium text-muted">
                <label htmlFor="pleak-code">Code from email</label>
                <button
                  type="button"
                  onClick={resendCode}
                  disabled={isBusy}
                  className="font-medium text-brand-blue transition-opacity active:opacity-50 disabled:opacity-50"
                >
                  Resend email
                </button>
              </div>
              <Input
                id="pleak-code"
                value={code}
                onChange={(e) => setCode(digitsOnly(e.target.value, CODE_LENGTH))}
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={CODE_LENGTH}
                className={digitFieldClass}
                required
              />
            </div>
          )}
          {needsPin && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between px-1 text-xs font-medium text-muted">
                <label htmlFor="pleak-pin">{isNewPin ? "New 6-digit PIN" : "PIN"}</label>
                {view === "sign-in" && (
                  <button
                    type="button"
                    onClick={() => switchMode("forgot")}
                    className="font-medium text-brand-blue transition-opacity active:opacity-50"
                  >
                    Forgot PIN?
                  </button>
                )}
              </div>
              <Input
                id="pleak-pin"
                type="password"
                value={pin}
                onChange={(e) => setPin(digitsOnly(e.target.value, PIN_LENGTH))}
                inputMode="numeric"
                autoComplete={isNewPin ? "new-password" : "current-password"}
                maxLength={PIN_LENGTH}
                className={digitFieldClass}
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
                {mode === "sign-up" || mode === "confirm" ? "Already have an account? " : "Remembered it? "}
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
