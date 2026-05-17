import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { configureAmplify } from "@/lib/amplify";

export function AdminLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const ok = await configureAmplify();
    if (!ok) {
      setError(
        "Amplify is not configured. Run `npm run sandbox` and ensure amplify_outputs.json exists.",
      );
      setLoading(false);
      return;
    }

    try {
      const { signIn } = await import("aws-amplify/auth");
      await signIn({ username: email, password });
      navigate("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        onSubmit={(e) => void handleSubmit(e)}
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
