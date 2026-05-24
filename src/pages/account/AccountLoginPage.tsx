import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  customerSignOut,
  hasCustomerSession,
  isAlreadySignedInError,
} from "@/lib/customerAuth";
import { configureAmplify } from "@/lib/amplify";

export function AccountLoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const returnTo = searchParams.get("returnTo") ?? "/account";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    async function redirectIfSignedIn() {
      if (await hasCustomerSession()) {
        navigate(returnTo, { replace: true });
      }
      setCheckingSession(false);
    }
    void redirectIfSignedIn();
  }, [navigate, returnTo]);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
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
      const { signIn } = await import("aws-amplify/auth");
      const result = await signIn({ username: email, password });

      if (result.isSignedIn) {
        navigate(returnTo);
        return;
      }

      setError(
        `Sign-in requires another step: ${result.nextStep.signInStep}. Contact support if this persists.`,
      );
    } catch (err) {
      if (isAlreadySignedInError(err)) {
        navigate(returnTo, { replace: true });
        return;
      }
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleClearSession() {
    setLoading(true);
    setError(null);
    try {
      await customerSignOut();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear session");
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
        onSubmit={(e) => void handleSignIn(e)}
        className="w-full max-w-md border border-outline-variant/30 bg-surface-container-low p-8 iron-bevel"
      >
        <h1 className="mb-2 font-display-lg text-headline-lg uppercase text-primary">
          Sign In
        </h1>
        <p className="mb-6 text-body-sm text-on-surface-variant">
          Track orders and speed up future checkouts. Guest checkout always
          remains available.
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
        <label className="mb-6 block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Password
          </span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
          />
        </label>
        {error && <p className="mb-4 text-error">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="molten-glow w-full bg-primary py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
        >
          {loading ? "Signing in..." : "Sign in"}
        </button>
        <p className="mt-4 text-center text-label-sm text-on-surface-variant">
          New here?{" "}
          <Link to="/account/register" className="text-primary underline">
            Create an account
          </Link>
        </p>
        <button
          type="button"
          disabled={loading}
          onClick={() => void handleClearSession()}
          className="mt-3 w-full py-2 font-label-sm uppercase text-on-surface-variant hover:text-primary"
        >
          Clear saved session
        </button>
      </form>
    </main>
  );
}
