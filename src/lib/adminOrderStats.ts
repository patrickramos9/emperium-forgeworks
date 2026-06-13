import { formatPrice } from "@/data/seedProducts";
import type { OrderRecord } from "@/services/orderService";

export interface AdminOrderStats {
  orderCount: number;
  paidOrderCount: number;
  newOrderCount: number;
  revenueCents: number;
  averageOrderCents: number;
  mockOrderCount: number;
  recentOrders: OrderRecord[];
}

const RECENT_ORDER_LIMIT = 10;

export function isUnacknowledgedPaidOrder(order: OrderRecord): boolean {
  return order.status === "paid" && !order.adminAcknowledgedAt;
}

export function countUnacknowledgedPaidOrders(orders: OrderRecord[]): number {
  return orders.filter(isUnacknowledgedPaidOrder).length;
}

export function computeAdminOrderStats(orders: OrderRecord[]): AdminOrderStats {
  const paidOrders = orders.filter((order) => order.status === "paid");
  const revenueCents = paidOrders.reduce(
    (sum, order) => sum + order.totalCents,
    0,
  );
  const mockOrderCount = orders.filter(
    (order) => order.paymentProvider === "mock",
  ).length;

  return {
    orderCount: orders.length,
    paidOrderCount: paidOrders.length,
    newOrderCount: countUnacknowledgedPaidOrders(orders),
    revenueCents,
    averageOrderCents:
      paidOrders.length > 0
        ? Math.round(revenueCents / paidOrders.length)
        : 0,
    mockOrderCount,
    recentOrders: orders.slice(0, RECENT_ORDER_LIMIT),
  };
}

export function formatRevenueLabel(
  revenueCents: number,
  mockOrderCount: number,
  paidOrderCount: number,
): string {
  const base = formatPrice(revenueCents);
  if (paidOrderCount === 0) return base;
  if (mockOrderCount === paidOrderCount) {
    return `${base} (mock)`;
  }
  if (mockOrderCount > 0) {
    return `${base} (includes mock)`;
  }
  return base;
}
