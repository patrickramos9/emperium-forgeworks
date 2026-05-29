import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  customerSignOut,
  getCustomerEmail,
  hasCustomerSession,
} from "@/lib/customerAuth";

export function AccountPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      if (!(await hasCustomerSession())) {
        navigate("/account/login?returnTo=/account", { replace: true });
        return;
      }
      setEmail(await getCustomerEmail());
      setLoading(false);
    }
    void load();
  }, [navigate]);

  async function handleSignOut() {
    await customerSignOut();
    navigate("/");
  }

  if (loading) {
    return (
      <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
        <p className="text-on-surface-variant">Loading account...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop mx-auto max-w-container-max">
      <h1 className="font-display-lg text-headline-lg uppercase text-primary">
        Your Account
      </h1>
      {email && (
        <p className="mt-2 text-on-surface-variant">
          Signed in as <span className="text-on-surface">{email}</span>
        </p>
      )}

      <nav className="mt-stack-lg flex flex-col gap-4 sm:flex-row sm:flex-wrap">
        <Link
          to="/account/notifications"
          className="border border-outline-variant/30 bg-surface-container-low px-6 py-4 font-label-md uppercase text-primary iron-bevel hover:border-primary"
        >
          Notifications
        </Link>
        <Link
          to="/account/orders"
          className="border border-outline-variant/30 bg-surface-container-low px-6 py-4 font-label-md uppercase text-primary iron-bevel hover:border-primary"
        >
          Order history
        </Link>
        <Link
          to="/shop"
          className="border border-outline-variant/30 bg-surface-container-low px-6 py-4 font-label-md uppercase text-on-surface iron-bevel hover:border-primary"
        >
          Continue shopping
        </Link>
      </nav>

      <button
        type="button"
        onClick={() => void handleSignOut()}
        className="mt-stack-lg font-label-sm uppercase text-on-surface-variant hover:text-error"
      >
        Sign out
      </button>
    </main>
  );
}
