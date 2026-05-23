import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { configureAmplify } from "@/lib/amplify";

type LoginMode = "signIn" | "newPassword";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<LoginMode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignIn(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const ok = await configureAmplify();
    if (!ok) {
      setError(
        "Amplify is not configured. Deploy the fullstack backend or run `npm run sandbox` locally.",
      );
      setLoading(false);
      return;
    }

    try {
      const { signIn } = await import("aws-amplify/auth");
      const result = await signIn({ username: email, password });

      if (result.isSignedIn) {
        navigate("/admin/products");
        return;
      }

      if (
        result.nextStep.signInStep ===
        "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED"
      ) {
        setMode("newPassword");
        setError(null);
        return;
      }

      setError(
        `Sign-in requires another step: ${result.nextStep.signInStep}. Contact support if this persists.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleNewPassword(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const { confirmSignIn } = await import("aws-amplify/auth");
      const result = await confirmSignIn({ challengeResponse: newPassword });

      if (result.isSignedIn) {
        navigate("/admin/products");
        return;
      }

      setError(
        `Could not finish sign-in: ${result.nextStep.signInStep ?? "unknown step"}.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Password update failed");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "newPassword") {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <form
          onSubmit={(e) => void handleNewPassword(e)}
          className="w-full max-w-md border border-outline-variant/30 bg-surface-container-low p-8 iron-bevel"
        >
          <h1 className="mb-2 font-display-lg text-headline-lg uppercase text-primary">
            Set New Password
          </h1>
          <p className="mb-6 text-body-sm text-on-surface-variant">
            Your account requires a new password before you can enter the
            admin area.
          </p>
          <label className="mb-4 block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              New password
            </span>
            <input
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container px-3 py-2 text-on-surface"
            />
          </label>
          {error && <p className="mb-4 text-error">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="molten-glow w-full bg-primary py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {loading ? "Saving..." : "Save & Enter"}
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => {
              setMode("signIn");
              setNewPassword("");
              setConfirmPassword("");
              setError(null);
            }}
            className="mt-3 w-full py-2 font-label-sm uppercase text-on-surface-variant hover:text-primary"
          >
            Back to sign in
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(e) => void handleSignIn(e)}
        className="w-full max-w-md border border-outline-variant/30 bg-surface-container-low p-8 iron-bevel"
      >
        <h1 className="mb-6 font-display-lg text-headline-lg uppercase text-primary">
          Admin Forge
        </h1>
        <label className="mb-4 block">
          <span className="font-label-sm uppercase text-on-surface-variant">
            Email
          </span>
          <input
            type="email"
            required
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
          {loading ? "Signing in..." : "Enter"}
        </button>
      </form>
    </main>
  );
}
