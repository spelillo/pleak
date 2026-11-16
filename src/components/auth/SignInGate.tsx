import { useState } from "react";
import type { FormEvent } from "react";
import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { useAuth } from "@/contexts/auth-context";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PinPad } from "./PinPad";

// sign-in: email + PIN. sign-up: name, email, PIN, then confirm (emailed
// code). forgot: email, then reset-code (emailed code + new PIN). "reset" is
// the older link-based path, where opening the link already signed them in.
// The PIN itself is typed on a full-screen keypad (PinPad) after the form:
// once to sign in, twice (enter + confirm) when choosing a new one.
type Mode = "sign-in" | "sign-up" | "confirm" | "forgot" | "reset-code";
type View = Mode | "reset";
type PinStep = "enter" | "confirm";

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

// Remember who signed in last, so the next visit opens straight on the
// keypad like a lock screen. Storage can be unavailable (private mode).
const LAST_EMAIL_KEY = "pleak-last-email";
function readLastEmail(): string {
  try {
    return localStorage.getItem(LAST_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}
function saveLastEmail(email: string) {
  try {
    localStorage.setItem(LAST_EMAIL_KEY, email.trim());
  } catch {
    // Not remembering is fine.
  }
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : "Something went wrong. Check your connection and try again.";
}

const COPY: Record<View, { title: string; subtitle: string; submit: string; busy: string }> = {
  "sign-in": {
    title: "Sign in to Pleak",
    subtitle: "Log and track your workouts.",
    submit: "Continue",
    busy: "Signing in…",
  },
  "sign-up": {
    title: "Create your account",
    subtitle: "Pleak is invite-only: use the email you were invited with.",
    submit: "Continue",
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
    subtitle: "Open the link in the email, or type its code here.",
    submit: "Continue",
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
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function SignInGate() {
  const auth = useAuth();
  const { setupError, isRecoveringPassword } = auth;
  const [mode, setMode] = useState<Mode>("sign-in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState(readLastEmail);
  const [pin, setPin] = useState("");
  const [firstPin, setFirstPin] = useState("");
  const [code, setCode] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialLinkError);
  const [notice, setNotice] = useState<string | null>(null);
  // Returning users (and anyone without a link error to read) land on the pad.
  const [pinStep, setPinStep] = useState<PinStep | null>(() =>
    readLastEmail() && !initialLinkError ? "enter" : null,
  );
  const [pinError, setPinError] = useState<string | null>(null);
  const [shakeKey, setShakeKey] = useState(0);

  const view: View = isRecoveringPassword ? "reset" : mode;
  const copy = COPY[view];
  const needsEmail = view === "sign-in" || view === "sign-up" || view === "forgot";
  const needsCode = view === "confirm" || view === "reset-code";
  // A link-based reset has nothing to fill in but the new PIN.
  const activePinStep: PinStep | null = view === "reset" ? (pinStep ?? "enter") : pinStep;

  function switchMode(next: Mode, keepMessages = false) {
    setMode(next);
    if (!keepMessages) {
      setError(null);
      setNotice(null);
    }
    setPin("");
    setFirstPin("");
    setCode("");
    setPinStep(null);
    setPinError(null);
  }

  async function run(action: () => Promise<void>) {
    setError(null);
    setNotice(null);
    setIsBusy(true);
    try {
      await action();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setIsBusy(false);
    }
  }

  function openPad(step: PinStep) {
    setPin("");
    setPinError(null);
    setPinStep(step);
  }

  function closePad() {
    setPin("");
    setFirstPin("");
    setPinError(null);
    setPinStep(null);
  }

  function rejectPin(message: string) {
    setPin("");
    setPinError(message);
    setShakeKey((k) => k + 1);
  }

  // The form collects everything except the PIN, then hands over to the pad.
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (view === "sign-up" && !name.trim()) {
      setError("Enter your name.");
      return;
    }
    if (needsEmail && !EMAIL_PATTERN.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    if (needsCode && code.length !== CODE_LENGTH) {
      setError(`Enter the ${CODE_LENGTH}-digit code from the email.`);
      return;
    }
    if (view === "sign-in" || view === "sign-up" || view === "reset-code") {
      setError(null);
      openPad("enter");
      return;
    }
    void run(async () => {
      if (view === "confirm") {
        await auth.confirmEmail(email, code);
      } else if (view === "forgot") {
        await auth.requestPasswordReset(email);
        switchMode("reset-code", true);
        setNotice(`If ${email.trim()} has an account, a reset email is on its way.`);
      }
    });
  }

  async function handlePin(entered: string) {
    // Choosing a new PIN: ask for it twice.
    if (view !== "sign-in" && activePinStep === "enter") {
      setFirstPin(entered);
      openPad("confirm");
      return;
    }
    if (view !== "sign-in" && entered !== firstPin) {
      setFirstPin("");
      setPinStep("enter");
      rejectPin("PINs didn't match. Try again.");
      return;
    }

    setPinError(null);
    setIsBusy(true);
    try {
      if (view === "sign-in") {
        await auth.signIn(email, entered);
        saveLastEmail(email);
      } else if (view === "sign-up") {
        const result = await auth.signUp(name, email, entered);
        saveLastEmail(email);
        if (result === "confirm-email") {
          switchMode("confirm", true);
          setNotice(`We sent a confirmation email to ${email.trim()}.`);
        }
      } else if (view === "reset-code") {
        await auth.resetPin(email, code, entered);
        saveLastEmail(email);
      } else {
        await auth.completePasswordReset(entered);
      }
    } catch (err) {
      // Never confirmed: take them to the code screen instead of a dead end.
      if (view === "sign-in" && err instanceof ApiError && /confirm your email/i.test(err.message)) {
        switchMode("confirm", true);
        setNotice(`Confirm ${email.trim()} first using the email we sent. No email? Send a new one.`);
      } else if (view === "sign-in" || view === "reset") {
        // Wrong PIN: shake and let them try again on the pad.
        rejectPin(errorMessage(err));
      } else {
        // Sign-up and code resets fail on the details in the form (email
        // not invited, code expired), so go back there to fix them.
        closePad();
        setError(errorMessage(err));
      }
    } finally {
      setIsBusy(false);
    }
  }

  function resendCode() {
    void run(async () => {
      if (view === "confirm") await auth.resendConfirmation(email);
      else await auth.requestPasswordReset(email);
      setNotice(`Sent a new email to ${email.trim()}.`);
    });
  }

  if (activePinStep) {
    const isNew = view !== "sign-in";
    return (
      <PinPad
        key={`${view}-${activePinStep}`}
        title={isNew ? (activePinStep === "enter" ? "Choose a 6-digit PIN" : "Confirm your PIN") : "Enter your PIN"}
        subtitle={
          isNew
            ? activePinStep === "enter"
              ? "You'll use it to sign in."
              : "Enter it again to make sure."
            : email.trim()
        }
        length={PIN_LENGTH}
        value={pin}
        onChange={(next) => {
          setPin(next);
          if (pinError && next) setPinError(null);
        }}
        onComplete={(entered) => void handlePin(entered)}
        error={setupError ?? pinError}
        shakeKey={shakeKey}
        busy={isBusy || !!setupError}
        onBack={activePinStep === "confirm" ? () => openPad("enter") : view === "reset" ? undefined : closePad}
        backLabel={view === "sign-in" ? "Email" : "Back"}
        footer={
          view === "sign-in" && (
            <button
              type="button"
              onClick={() => switchMode("forgot")}
              className="text-[15px] font-medium text-brand-blue transition-opacity active:opacity-50"
            >
              Forgot PIN?
            </button>
          )
        }
      />
    );
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
          {/* Messages sit in the form, right above the button they're about,
              where the eye already is, rather than at the bottom of the page. */}
          {notice && (
            <p className="flex items-start gap-2.5 rounded-md bg-surface-soft px-3.5 py-3 text-left text-sm text-ink" role="status">
              <CheckCircle size={18} weight="fill" className="mt-px shrink-0 text-brand-blue" />
              {notice}
            </p>
          )}
          {(setupError || error) && (
            <p className="flex items-start gap-2.5 rounded-md bg-surface-soft px-3.5 py-3 text-left text-sm text-ink" role="alert">
              <WarningCircle size={18} weight="fill" className="mt-px shrink-0 text-error" />
              {setupError ?? error}
            </p>
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

      </div>
    </div>
  );
}
