import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { configureAmplify } from "@/lib/amplify";
import {
  customerSignOut,
  hasCustomerSession,
  validateCustomerPassword,
} from "@/lib/customerAuth";

type ResetMode = "request" | "confirm";

export function AccountForgotPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/account/login";

  const [mode, setMode] = useState<ResetMode>("request");
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function init() {
      if (await hasCustomerSession()) {
        await customerSignOut(false);
      }
      setCheckingSession(false);
    }
    void init();
  }, []);

  async function handleRequestCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    const ok = await configureAmplify();
    if (!ok) {
      setError(
        "Amplify is not configured. Deploy the backend or run `npm run sandbox` locally.",
      );
      setLoading(false);
      return;
    }

    try {
      const { resetPassword } = await import("aws-amplify/auth");
      const result = await resetPassword({ username: email.trim() });

      if (
        result.nextStep.resetPasswordStep === "CONFIRM_RESET_PASSWORD_WITH_CODE"
      ) {
        setMode("confirm");
        setMessage("Check your email for a verification code.");
      } else {
        setError("Unexpected reset step. Contact support if this persists.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send reset code");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { resetPassword } = await import("aws-amplify/auth");
      await resetPassword({ username: email.trim() });
      setMessage("A new code has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmReset(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const passwordError = validateCustomerPassword(newPassword);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const { confirmResetPassword } = await import("aws-amplify/auth");
      await confirmResetPassword({
        username: email.trim(),
        confirmationCode: code.trim(),
        newPassword,
      });

      const loginUrl = new URL(returnTo, window.location.origin);
      loginUrl.searchParams.set("reset", "success");
      navigate(`${loginUrl.pathname}${loginUrl.search}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-on-surface-variant">Loading...</p>
      </main>
    );
  }

  if (mode === "confirm") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={(e) => void handleConfirmReset(e)}
          className="w-full max-w-md border border-outline-variant/30 bg-surface-container-low p-8 iron-bevel"
        >
          <h1 className="mb-2 font-display-lg text-headline-lg uppercase text-primary">
            Set New Password
          </h1>
          <p className="mb-6 text-body-sm text-on-surface-variant">
            {message ?? `Enter the code sent to ${email} and choose a new password.`}
          </p>
          <label className="mb-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Verification code
            </span>
            <input
              type="text"
              required
              inputMode="numeric"
              autoComplete="one-time-code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
            />
          </label>
          <label className="mb-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              New password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
            />
          </label>
          <label className="mb-6 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Confirm new password
            </span>
            <input
              type="password"
              required
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
            />
          </label>
          <p className="mb-4 font-label-sm text-on-surface-variant/80">
            At least 8 characters with uppercase, lowercase, number, and symbol.
          </p>
          {error && <p className="mb-4 text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="molten-glow w-full bg-primary py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {loading ? "Updating..." : "Update password"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void handleResendCode()}
            className="mt-3 w-full py-2 font-label-sm uppercase text-on-surface-variant hover:text-primary"
          >
            Resend code
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setMode("request");
              setCode("");
              setNewPassword("");
              setConfirmPassword("");
              setError(null);
            }}
            className="mt-2 w-full py-2 font-label-sm uppercase text-on-surface-variant hover:text-primary"
          >
            Use a different email
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(e) => void handleRequestCode(e)}
        className="w-full max-w-md border border-outline-variant/30 bg-surface-container-low p-8 iron-bevel"
      >
        <h1 className="mb-2 font-display-lg text-headline-lg uppercase text-primary">
          Reset Password
        </h1>
        <p className="mb-6 text-body-sm text-on-surface-variant">
          Enter your account email and we will send a verification code to reset
          your password.
        </p>
        <label className="mb-6 block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Email
          </span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
          />
        </label>
        {error && <p className="mb-4 text-error">{error}</p>}
        {message && <p className="mb-4 text-secondary">{message}</p>}
        <button
          type="submit"
          disabled={loading}
          className="molten-glow w-full bg-primary py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send reset code"}
        </button>
        <p className="mt-4 text-center text-label-sm text-on-surface-variant">
          <Link to={returnTo} className="text-primary underline">
            Back to sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
