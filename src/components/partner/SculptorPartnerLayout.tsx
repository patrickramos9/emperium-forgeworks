import { useEffect, useState } from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { customerSignOut } from "@/lib/customerAuth";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { requireSculptorModel } from "@/lib/dataModels";
import { getSculptorForEditor } from "@/services/sculptorService";

async function currentUserId(): Promise<string | null> {
  try {
    const { fetchAuthSession } = await import("aws-amplify/auth");
    const session = await fetchAuthSession();
    const sub = session.tokens?.idToken?.payload?.sub;
    return typeof sub === "string" ? sub : null;
  } catch {
    return null;
  }
}

export function SculptorPartnerLayout() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [profileSlug, setProfileSlug] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    async function guard() {
      const client = await requireCustomerSession(
        navigate,
        "/partner/sculptor",
      );
      if (!client) return;

      try {
        requireSculptorModel(client);
        const userId = await currentUserId();
        if (!userId) {
          navigate("/account/login?returnTo=%2Fpartner%2Fsculptor");
          return;
        }
        const row = await getSculptorForEditor(client, userId);
        if (!row) {
          setProfileSlug(null);
          setReady(true);
          return;
        }
        setProfileSlug(row.slug);
        setReady(true);
      } catch {
        navigate("/account/login?returnTo=%2Fpartner%2Fsculptor");
      }
    }
    void guard();
  }, [navigate]);

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await customerSignOut();
      navigate("/");
    } finally {
      setSigningOut(false);
    }
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-background px-margin-mobile py-24 text-on-surface-variant md:px-margin-desktop">
        Loading...
      </div>
    );
  }

  if (!profileSlug) {
    return (
      <div className="min-h-screen bg-background px-margin-mobile py-24 md:px-margin-desktop">
        <div className="mx-auto max-w-lg border border-outline-variant/20 bg-surface-container-low p-6 iron-bevel">
          <h1 className="font-headline-md text-on-surface">Partner access required</h1>
          <p className="mt-3 text-on-surface-variant">
            Your account is not assigned to edit a sculptor profile. Contact
            Emperium Forgeworks admin to request access.
          </p>
          <Link to="/" className="mt-6 inline-block text-primary hover:underline">
            ← Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-outline-variant/20 bg-surface-container-low">
        <div className="mx-auto flex max-w-container-max flex-wrap items-center justify-between gap-4 px-margin-mobile py-4 md:px-margin-desktop">
          <div>
            <p className="font-label-sm uppercase text-secondary">Partner portal</p>
            <Link to="/" className="font-headline-md text-primary hover:underline">
              Emperium Forgeworks
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Link
              to={`/sculptors/${profileSlug}`}
              className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
            >
              View public profile
            </Link>
            <button
              type="button"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="font-label-sm uppercase text-on-surface-variant hover:text-primary disabled:opacity-50"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-2xl px-margin-mobile py-stack-lg md:px-margin-desktop">
        <Outlet context={{ profileSlug }} />
      </main>
    </div>
  );
}
