import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { configureAmplify } from "@/lib/amplify";
import {
  hasCustomerSession,
  validateCustomerPassword,
} from "@/lib/customerAuth";
import { PageFeedback } from "@/components/PageFeedback";

function isUsernameExistsError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const name = "name" in err ? String(err.name) : "";
  return name === "UsernameExistsException";
}

export function AccountRegisterPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
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

    const trimmedEmail = email.trim();

    try {
      const { signUp } = await import("aws-amplify/auth");
      await signUp({
        username: trimmedEmail,
        password,
        options: {
          userAttributes: { email: trimmedEmail },
        },
      });
      navigate(
        `/account/register/verify?email=${encodeURIComponent(trimmedEmail)}`,
        { state: { password } },
      );
    } catch (err) {
      if (isUsernameExistsError(err)) {
        setError(
          `An account with this email already exists. If you have not verified yet, complete verification below.`,
        );
      } else {
        setError(err instanceof Error ? err.message : "Sign up failed");
      }
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

  const verifyHref = email.trim()
    ? `/account/register/verify?email=${encodeURIComponent(email.trim())}`
    : "/account/register/verify";

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
          Optional — you can always check out as a guest. We will email a
          verification code; you can finish later from that email or{" "}
          <Link to={verifyHref} className="text-primary underline">
            this verification page
          </Link>
          .
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
        {error && (
          <>
            <PageFeedback tone="error">{error}</PageFeedback>
            {error.includes("already exists") && (
              <p className="mb-4 text-body-sm text-on-surface-variant">
                <Link to={verifyHref} className="text-primary underline">
                  Verify your email
                </Link>{" "}
                or{" "}
                <Link to="/account/login" className="text-primary underline">
                  sign in
                </Link>
                .
              </p>
            )}
          </>
        )}
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
