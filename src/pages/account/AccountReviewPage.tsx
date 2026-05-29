import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { StarRatingInput } from "@/components/ReviewCard";
import { requireCustomerSession } from "@/lib/amplifyDataClient";
import { getCustomerUserId } from "@/lib/customerAuth";
import { hasReviewModel } from "@/lib/dataModels";
import {
  createReview,
  getReviewForOrder,
} from "@/services/reviewService";
import {
  formatOrderDate,
  getOrderById,
  orderStatusLabel,
  type OrderRecord,
} from "@/services/orderService";

export function AccountReviewPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<OrderRecord | null>(null);
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      if (!orderId) {
        navigate("/account/orders");
        return;
      }

      const client = await requireCustomerSession(
        navigate,
        `/account/orders/${orderId}/review`,
      );
      if (!client) return;

      if (!hasReviewModel(client)) {
        setError(
          "Reviews are not available yet. Deploy backend changes and try again.",
        );
        setLoading(false);
        return;
      }

      try {
        const userId = await getCustomerUserId();
        const [orderRow, existingReview] = await Promise.all([
          getOrderById(client, orderId),
          getReviewForOrder(client, orderId),
        ]);

        if (!orderRow || orderRow.userId !== userId) {
          setError("Order not found.");
          setLoading(false);
          return;
        }

        if (orderRow.status !== "paid") {
          setError("Only paid orders can be reviewed.");
          setOrder(orderRow);
          setLoading(false);
          return;
        }

        if (existingReview) {
          navigate("/account/orders", { replace: true });
          return;
        }

        setOrder(orderRow);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not load order");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, [navigate, orderId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!orderId) return;

    setSaving(true);
    setError(null);

    const client = await requireCustomerSession(
      navigate,
      `/account/orders/${orderId}/review`,
    );
    if (!client) {
      setSaving(false);
      return;
    }

    try {
      await createReview(client, {
        orderId,
        rating,
        text,
        displayName: displayName.trim() || undefined,
      });
      navigate("/account/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review");
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen mx-auto max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
        <p className="text-on-surface-variant">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen mx-auto max-w-container-max px-margin-mobile pb-section-gap pt-32 md:px-margin-desktop">
      <Link
        to="/account/orders"
        className="font-label-sm uppercase text-on-surface-variant hover:text-primary"
      >
        ← Order history
      </Link>

      <h1 className="mt-4 font-display-lg text-headline-lg uppercase text-primary">
        Leave a Review
      </h1>

      {order && (
        <p className="mt-2 text-on-surface-variant">
          {formatOrderDate(order.createdAt)} · {orderStatusLabel(order.status)}
        </p>
      )}

      {error && !order && (
        <p className="mt-6 text-error">{error}</p>
      )}

      {order && order.status === "paid" && (
        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-stack-lg max-w-xl space-y-4"
        >
          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Rating
            </span>
            <div className="mt-2">
              <StarRatingInput value={rating} onChange={setRating} />
            </div>
          </label>

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Your review
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              required
              minLength={10}
              rows={6}
              placeholder="Tell other commanders about your experience..."
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
            />
          </label>

          <label className="block">
            <span className="font-label-sm uppercase text-on-surface-variant">
              Display name (optional)
            </span>
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={40}
              placeholder="First name or handle"
              className="mt-1 w-full border border-outline-variant/30 bg-surface-container-low px-3 py-2"
            />
          </label>

          <p className="text-label-sm text-on-surface-variant">
            Reviews are moderated before appearing on the storefront.
          </p>

          {error && <p className="text-error">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="bg-primary px-6 py-3 font-label-md uppercase text-on-primary disabled:opacity-50"
          >
            {saving ? "Submitting..." : "Submit review"}
          </button>
        </form>
      )}
    </main>
  );
}
