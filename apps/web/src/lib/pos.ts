// Core POS utilities: FEFO allocation, cart types, and totals calculation
// This module provides pure functions and types to power the POS cart.

export type BatchLite = {
  id: string;
  expiry_date: string; // ISO date string (YYYY-MM-DD)
  qty_available: number;
};

export type Allocation = {
  batch_id: string;
  expiry_date: string; // ISO date string
  qty: number;
};

export type CartLine = {
  product_id: string;
  sku: string;
  product_name: string;
  unit_price: number; // selling price per unit
  discount: number; // absolute discount on the line
  qty: number; // total requested quantity for this line (sum of allocations)
  allocations: Allocation[]; // per-batch allocations (FEFO)
};

export type CartTotals = {
  subtotal: number;
  discountTotal: number; // sum of line discounts
  tax: number;
  total: number;
};

function isExpired(expiryISO: string, now: Date = new Date()): boolean {
  // Treat expiry as end-of-day of expiry date
  const exp = new Date(expiryISO + 'T23:59:59');
  return exp.getTime() < now.getTime();
}

export function fefoAllocate(
  batches: BatchLite[],
  requestedQty: number,
  now: Date = new Date()
): { allocations: Allocation[]; unallocatedQty: number } {
  if (requestedQty <= 0) return { allocations: [], unallocatedQty: 0 };

  // Filter to valid, in-stock, not expired batches
  const usable = batches
    .filter((b) => b.qty_available > 0 && !isExpired(b.expiry_date, now))
    .sort((a, b) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime());

  const allocations: Allocation[] = [];
  let remaining = requestedQty;

  for (const b of usable) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, b.qty_available);
    if (take > 0) {
      allocations.push({ batch_id: b.id, expiry_date: b.expiry_date, qty: take });
      remaining -= take;
    }
  }

  return { allocations, unallocatedQty: remaining };
}

export function mergeAllocations(existing: Allocation[], add: Allocation[]): Allocation[] {
  // Merge allocations by batch_id to keep list compact
  const map = new Map<string, Allocation>();
  for (const a of existing) {
    map.set(a.batch_id, { ...a });
  }
  for (const a of add) {
    const curr = map.get(a.batch_id);
    if (curr) {
      curr.qty += a.qty;
      map.set(a.batch_id, curr);
    } else {
      map.set(a.batch_id, { ...a });
    }
  }
  // Keep FEFO order by expiry date ascending
  return Array.from(map.values()).sort(
    (x, y) => new Date(x.expiry_date).getTime() - new Date(y.expiry_date).getTime()
  );
}

export function reduceAllocations(existing: Allocation[], reduceQty: number): Allocation[] {
  // Reduce quantity from the latest-expiring first to keep earlier expiries allocated
  if (reduceQty <= 0) return existing;
  const allocs = [...existing].sort(
    (x, y) => new Date(y.expiry_date).getTime() - new Date(x.expiry_date).getTime()
  );
  let remaining = reduceQty;

  for (const a of allocs) {
    if (remaining <= 0) break;
    const take = Math.min(a.qty, remaining);
    a.qty -= take;
    remaining -= take;
  }

  const cleaned = allocs.filter((a) => a.qty > 0);
  // Restore FEFO order
  return cleaned.sort((x, y) => new Date(x.expiry_date).getTime() - new Date(y.expiry_date).getTime());
}

export function computeLineTotals(line: CartLine): { lineSubtotal: number; lineDiscount: number; lineTotal: number } {
  const qty = Math.max(0, line.allocations.reduce((s, a) => s + a.qty, 0));
  const lineSubtotal = round2(qty * Number(line.unit_price || 0));
  const lineDiscount = round2(Number(line.discount || 0));
  const lineTotal = round2(Math.max(0, lineSubtotal - lineDiscount));
  return { lineSubtotal, lineDiscount, lineTotal };
}

export function computeCartTotals(lines: CartLine[], taxRate = 0.16): CartTotals {
  let subtotal = 0;
  let discountTotal = 0;
  for (const line of lines) {
    const t = computeLineTotals(line);
    subtotal += t.lineSubtotal;
    discountTotal += t.lineDiscount;
  }
  subtotal = round2(subtotal);
  discountTotal = round2(discountTotal);
  const taxable = Math.max(0, subtotal - discountTotal);
  const tax = round2(taxable * taxRate);
  const total = round2(taxable + tax);
  return { subtotal, discountTotal, tax, total };
}

export function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// Helper to build a new cart line from product and batches
export function buildCartLine(params: {
  product_id: string;
  sku: string;
  product_name: string;
  unit_price: number;
  discount?: number;
  qty: number;
  batches: BatchLite[];
  now?: Date;
}): { line: CartLine; unallocatedQty: number } {
  const { product_id, sku, product_name, unit_price, discount = 0, qty, batches, now } = params;
  const { allocations, unallocatedQty } = fefoAllocate(batches, qty, now);
  const line: CartLine = {
    product_id,
    sku,
    product_name,
    unit_price,
    discount,
    qty,
    allocations,
  };
  return { line, unallocatedQty };
}

// Adjust an existing line by deltaQty (+/-), using new batches snapshot
export function adjustLineQty(
  line: CartLine,
  deltaQty: number,
  batches: BatchLite[],
  now: Date = new Date()
): { line: CartLine; unallocatedQty: number } {
  if (deltaQty === 0) return { line, unallocatedQty: 0 };

  if (deltaQty > 0) {
    const { allocations, unallocatedQty } = fefoAllocate(batches, deltaQty, now);
    return {
      line: { ...line, qty: line.qty + (deltaQty - unallocatedQty), allocations: mergeAllocations(line.allocations, allocations) },
      unallocatedQty,
    };
  } else {
    const reduceQty = Math.min(line.qty, Math.abs(deltaQty));
    const newAllocs = reduceAllocations(line.allocations, reduceQty);
    return {
      line: { ...line, qty: Math.max(0, line.qty - reduceQty), allocations: newAllocs },
      unallocatedQty: 0,
    };
  }
}
