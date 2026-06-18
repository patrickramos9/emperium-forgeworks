import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { configureAmplify } from "@/lib/amplify";
import {
  hasCustomerSession,
  validateCustomerPassword,
} from "@/lib/customerAuth";
import { PageFeedback } from "@/components/PageFeedback";
import { useNotificationBadge } from "@/context/NotificationBadgeContext";
import { useToast } from "@/context/ToastContext";

type RegisterMode = "signUp" | "confirm";

export function AccountRegisterPage() {
  const navigate = useNavigate();
  const { refreshNotificationBadge } = useNotificationBadge();
  const { showToast } = useToast();
  const [mode, setMode] = useState<RegisterMode>("signUp");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    const passwordError = validateCustomerPassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
      const { signUp } = await import("aws-amplify/auth");
      await signUp({
        username: email,
        password,
        options: {
          userAttributes: { email },
        },
      });
      setMode("confirm");
      setMessage("Check your email for a verification code.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      const { confirmSignUp, signIn } = await import("aws-amplify/auth");
      await confirmSignUp({ username: email, confirmationCode: code });
      await signIn({ username: email, password });
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

  if (checkingSession) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-on-surface-variant">Checking session...</p>
      </main>
    );
  }

  if (mode === "confirm") {
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
            Enter the code we sent to your email.
          </p>
          {message && (
            <PageFeedback tone="success">{message}</PageFeedback>
          )}
          <label className="mb-6 block">
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
            onClick={() => {
              setMode("signUp");
              setCode("");
              setError(null);
            }}
            className="mt-3 w-full py-2 font-label-sm uppercase text-on-surface-variant hover:text-primary"
          >
            Back
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(e) => void handleSignUp(e)}
        className="w-full max-w-md border border-outline-variant/30 bg-surface-container-low p-8 iron-bevel"
      >
        <h1 className="mb-2 font-display-lg text-headline-lg uppercase text-primary">
          Create Account
        </h1>
        <p className="mb-6 text-body-sm text-on-surface-variant">
          Optional — you can always check out as a guest.
        </p>
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
            Password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
          />
        </label>
        <label className="mb-6 block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Confirm password
          </span>
          <input
            type="password"
            required
            minLength={8}
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
          />
        </label>
        {error && <PageFeedback tone="error">{error}</PageFeedback>}
        <button
          type="submit"
          disabled={loading}
          className="molten-glow w-full bg-primary py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {loading ? "Creating..." : "Create account"}
        </button>
        <p className="mt-4 text-center text-label-sm text-on-surface-variant">
          Already have an account?{" "}
          <Link to="/account/login" className="text-primary underline">
            Sign in
          </Link>
        </p>
      </form>
    </main>
  );
}
