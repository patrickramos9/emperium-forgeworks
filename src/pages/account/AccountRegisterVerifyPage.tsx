import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { configureAmplify } from "@/lib/amplify";
import {
  hasCustomerSession,
  validateCustomerPassword,
} from "@/lib/customerAuth";
import { PageFeedback } from "@/components/PageFeedback";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { useToast } from "@/context/ToastContext";
import { ensureNewAccountWelcomeGrant } from "@/services/newAccountPromoService";
import { mergeGuestIdentityOnSignIn } from "@/services/guestIdentityService";

type VerifyLocationState = {
  password?: string;
};

export function AccountRegisterVerifyPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { refreshNotificationBadge } = useNotificationBadge();
  const { showToast } = useToast();

  const initialEmail = searchParams.get("email")?.trim() ?? "";
  const initialPassword =
    (location.state as VerifyLocationState | null)?.password ?? "";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState(initialPassword);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function redirectIfSignedIn() {
      if (await hasCustomerSession()) {
        navigate("/account", { replace: true });
      }
      setCheckingSession(false);
    }
    void redirectIfSignedIn();
  }, [navigate]);

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Email is required.");
      return;
    }

    const passwordError = validateCustomerPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }

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
      const { confirmSignUp, signIn } = await import("aws-amplify/auth");
      await confirmSignUp({ username: trimmedEmail, confirmationCode: code.trim() });
      await signIn({ username: trimmedEmail, password });
      try {
        await mergeGuestIdentityOnSignIn();
      } catch (mergeErr) {
        console.error("Guest identity merge failed", mergeErr);
      }
      try {
        await ensureNewAccountWelcomeGrant();
      } catch (grantErr) {
        console.error("Welcome grant failed", grantErr);
      }
      showToast({
        title: "Welcome to the forge",
        description: "Check notifications for any welcome offer.",
        tone: "success",
        action: { label: "Notifications", href: "/account/notifications" },
      });
      window.setTimeout(() => refreshNotificationBadge(), 1500);
      navigate("/account");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Confirmation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError(null);
    setMessage(null);

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email before requesting a new code.");
      return;
    }

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
      const { resendSignUpCode } = await import("aws-amplify/auth");
      await resendSignUpCode({ username: trimmedEmail });
      setMessage("A new verification code has been sent to your email.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend code");
    } finally {
      setLoading(false);
    }
  }

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-on-surface-variant">Checking session...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(e) => void handleConfirm(e)}
        className="w-full max-w-md border border-outline-variant/30 bg-surface-container-low p-8 iron-bevel"
      >
        <h1 className="mb-2 font-display-lg text-headline-lg uppercase text-primary">
          Verify Email
        </h1>
        <p className="mb-6 text-body-sm text-on-surface-variant">
          Enter the verification code from your email and the password you chose
          when signing up.
        </p>
        {message && <PageFeedback tone="success">{message}</PageFeedback>}
        <label className="mb-4 block">
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
        <label className="mb-6 block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
          />
        </label>
        {error && <PageFeedback tone="error">{error}</PageFeedback>}
        <button
          type="submit"
          disabled={loading}
          className="molten-glow w-full bg-primary py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {loading ? "Verifying..." : "Verify & Sign in"}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleResendCode()}
          className="mt-3 w-full py-2 font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          Resend verification code
        </button>
        <p className="mt-4 text-center text-label-sm text-on-surface-variant">
          <Link to="/account/login" className="text-primary underline">
            Back to sign in
          </Link>
          {" · "}
          <Link to="/account/register" className="text-primary underline">
            Create account
          </Link>
        </p>
      </form>
    </main>
  );
}
