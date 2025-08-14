'use client';
import * as React from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FadeIn } from '@/components/ui/PageTransition';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { usePOSRealtime } from '@/hooks/usePOSRealtime';
import {
  BatchLite,
  CartLine,
  buildCartLine,
  adjustLineQty,
  computeCartTotals,
} from '@/lib/pos';
import { PaymentModal } from '@/components/pos/PaymentModal';
import { HoldDrawer, HeldCart } from '@/components/pos/HoldDrawer';
import { usePOSOutbox } from '@/hooks/usePOSOutbox';
import { OutboxDrawer } from '@/components/pos/OutboxDrawer';
import { nanoid } from 'nanoid';

function formatKES(n: number) {
  return `KES ${Number(n || 0).toLocaleString()}`;
}

export default function POSPage() {
  const router = useRouter();

  // Set up realtime subscriptions for POS operations
  usePOSRealtime();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Hold/Resume state
  const [holdOpen, setHoldOpen] = useState(false);
  const [held, setHeld] = useState<HeldCart[]>([]);

  // Payment modal state
  const [payOpen, setPayOpen] = useState(false);
  const { enqueue, trySync, items: outboxItems, remove: removeOutbox } = usePOSOutbox();
  const [outboxOpen, setOutboxOpen] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [payError, setPayError] = useState('');

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);

  // Product search with batches snapshot
  const { data: results = [], isLoading } = useQuery({
    queryKey: ['pos-search', searchTerm],
    enabled: searchTerm.trim().length >= 2,
    queryFn: async () => {
      const term = searchTerm.trim();
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, sku, generic_name, brand, sell_price, active,
          batches ( id, expiry_date, qty_available )
        `)
        .eq('active', true)
        .or(
          `generic_name.ilike.%${term}%,brand.ilike.%${term}%,sku.ilike.%${term}%`
        )
        .limit(50);

      if (error) throw error;

      // Filter batches client-side to valid availability and not expired, sort FEFO
      return (data || []).map((p: any) => ({
        ...p,
        batches: (p.batches || [])
          .filter(
            (b: any) => b.qty_available > 0 && new Date(b.expiry_date) >= new Date(todayISO)
          )
          .sort(
            (a: any, b: any) => new Date(a.expiry_date).getTime() - new Date(b.expiry_date).getTime()
          ),
      }));
    },
  });

  const totals = useMemo(() => computeCartTotals(cart, 0.16), [cart]);

  // Load held drafts from localStorage on mount
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const data = localStorage.getItem('pharmo_held_sales');
    if (data) setHeld(JSON.parse(data));
  }, []);
  function saveHeld(next: HeldCart[]) {
    setHeld(next);
    localStorage.setItem('pharmo_held_sales', JSON.stringify(next));
  }
  function handleHold(note?: string) {
    const draft: HeldCart = {
      id: nanoid(),
      cart,
      created: new Date().toISOString(),
      note: note || '',
    };
    const next = [draft, ...held];
    saveHeld(next);
    setCart([]);
  }
  function handleResume(cart: HeldCart) {
    setCart(cart.cart);
    saveHeld(held.filter(h => h.id !== cart.id));
    setHoldOpen(false);
  }
  function handleDelete(id: string) {
    const next = held.filter(cart => cart.id !== id);
    saveHeld(next);
  }

  function addProductToCart(product: any) {
    const batches: BatchLite[] = (product.batches || []).map((b: any) => ({
      id: b.id,
      expiry_date: b.expiry_date,
      qty_available: b.qty_available,
    }));

    if (batches.length === 0) return; // nothing to allocate

    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product_id === product.id);
      if (idx === -1) {
        const { line } = buildCartLine({
          product_id: product.id,
          sku: product.sku,
          product_name: product.generic_name,
          unit_price: Number(product.sell_price),
          qty: 1,
          batches,
        });
        return [...prev, line];
      } else {
        const updated = [...prev];
        const { line } = adjustLineQty(updated[idx], +1, batches);
        updated[idx] = line;
        return updated;
      }
    });
  }

  function decrementLine(productId: string) {
    setCart((prev) => {
      const idx = prev.findIndex((l) => l.product_id === productId);
      if (idx === -1) return prev;
      const line = prev[idx];
      // Use current allocations snapshot to reduce
      const { line: newLine } = adjustLineQty(line, -1, []);
      if (newLine.qty <= 0) {
        const clone = [...prev];
        clone.splice(idx, 1);
        return clone;
      }
      const clone = [...prev];
      clone[idx] = newLine;
      return clone;
    });
  }

  function incrementLine(product: any) {
    addProductToCart(product);
  }

  function removeLine(productId: string) {
    setCart((prev) => prev.filter((l) => l.product_id !== productId));
  }

  return (
    <>
      <ProtectedRoute>
        <AppShell>
          <div className="p-6 grid grid-cols-12 gap-6">
            {/* Left: Search & results */}
            <FadeIn className="col-span-12 lg:col-span-7">
              <Card>
                <CardHeader>
                  <Input
                    placeholder="Search by name, brand, SKU, or scan barcode..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="transition-all duration-200"
                  />
                </CardHeader>
                <CardBody>
                  {searchTerm.trim().length < 2 ? (
                    <div className="h-72 flex items-center justify-center text-slate-500">
                      Start typing at least 2 characters to search products
                    </div>
                  ) : isLoading ? (
                    <div className="h-72 flex items-center justify-center text-slate-500">
                      Searching...
                    </div>
                  ) : results.length === 0 ? (
                    <div className="h-72 flex items-center justify-center text-slate-500">
                      No matching products
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-72 overflow-y-auto">
                      {results.map((product: any, index: number) => (
                        <div
                          key={product.id}
                          className="p-3 border border-gray-200 rounded-md hover:bg-gray-50 hover:border-gray-300 cursor-pointer transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                          style={{ animationDelay: `${index * 30}ms` }}
                          onClick={() => addProductToCart(product)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-slate-900">
                                {product.generic_name}
                                {product.brand ? (
                                  <span className="text-slate-500"> ({product.brand})</span>
                                ) : null}
                              </div>
                              <div className="text-xs text-slate-500 mt-1">
                                {product.sku} • Stock:{' '}
                                {product.batches.reduce((s: number, b: any) => s + b.qty_available, 0)}
                              </div>
                              {product.batches[0] && (
                                <div className="text-[11px] text-slate-500 mt-1">
                                  FEFO: expires {new Date(product.batches[0].expiry_date).toLocaleDateString()}
                                </div>
                              )}
                            </div>
                            <div className="text-right ml-3">
                              <div className="font-medium text-sm text-slate-900">
                                {formatKES(product.sell_price)}
                              </div>
                              <Button size="sm" className="mt-1" onClick={(e) => { e.stopPropagation(); addProductToCart(product); }}>
                                Add
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardBody>
              </Card>
            </FadeIn>

            {/* Right: Cart */}
            <FadeIn delay={100} className="col-span-12 lg:col-span-5">
              <Card>
                <CardHeader className="text-sm text-slate-700">
                  Current Sale ({cart.reduce((s, l) => s + l.qty, 0)} units)
                </CardHeader>
                <CardBody>
                  {cart.length === 0 ? (
                    <div className="text-sm text-slate-500 py-8 text-center">
                      No items yet. Start adding products.
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {cart.map((line) => (
                        <div key={line.product_id} className="p-3 border border-gray-200 rounded-md">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="font-medium text-sm text-slate-900">
                                {line.product_name}
                              </div>
                              <div className="text-xs text-slate-500">{line.sku}</div>
                              {/* Allocations */}
                              <div className="flex flex-wrap gap-1 mt-2">
                                {line.allocations.map((a) => (
                                  <span key={a.batch_id} className="text-[11px] px-2 py-0.5 rounded-full bg-gray-100 text-slate-700">
                                    {a.batch_id.slice(0, 6)} • {a.qty} • {new Date(a.expiry_date).toLocaleDateString()}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <div className="text-right min-w-[150px]">
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => decrementLine(line.product_id)}
                                >
                                  −
                                </Button>
                                <span className="text-sm w-6 text-center">{line.qty}</span>
                                <Button
                                  size="sm"
                                  variant="secondary"
                                  onClick={() => {
                                    // find the product in results to provide fresh batches snapshot
                                    const p = results.find((r: any) => r.id === line.product_id);
                                    if (p) incrementLine(p);
                                  }}
                                >
                                  +
                                </Button>
                              </div>
                              <div className="mt-2 text-sm font-medium">
                                {formatKES(line.unit_price)} each
                              </div>
                              <Button
                                size="sm"
                                variant="secondary"
                                className="mt-2"
                                onClick={() => removeLine(line.product_id)}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Totals */}
                  <div className="mt-6 pt-4 border-t space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Subtotal</span>
                      <span className="tabular-nums">{formatKES(totals.subtotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Discount</span>
                      <span className="tabular-nums">{formatKES(totals.discountTotal)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Tax (16%)</span>
                      <span className="tabular-nums">{formatKES(totals.tax)}</span>
                    </div>
                    <div className="flex justify-between font-medium text-base pt-2 border-t">
                      <span>Total</span>
                      <span className="tabular-nums">{formatKES(totals.total)}</span>
                    </div>
                  </div>
                </CardBody>
                <CardFooter className="flex gap-2">
                <Button variant="secondary" className="flex-1" disabled={cart.length === 0} onClick={() => handleHold()}>
                Hold
                </Button>
                <Button
                className="flex-1"
                disabled={cart.length === 0}
                onClick={() => setPayOpen(true)}
                >
                Charge
                </Button>
                <Button variant="ghost" className="ml-2" onClick={() => setHoldOpen(true)}>
                Held Sales
                </Button>
                </CardFooter>
              </Card>
            </FadeIn>
          </div>

          {/* Quick Payment Methods */}
          <FadeIn delay={200} className="px-6 pb-6">
            <Card>
              <CardHeader>Payment Methods</CardHeader>
              <CardBody>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <Button
                    variant="secondary"
                    className="h-16 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors"
                    disabled
                  >
                    <span className="text-lg mb-1">💵</span>
                    <span className="text-xs">Cash</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-16 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors"
                    disabled
                  >
                    <span className="text-lg mb-1">💳</span>
                    <span className="text-xs">Card</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-16 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors"
                    disabled
                  >
                    <span className="text-lg mb-1">📱</span>
                    <span className="text-xs">M-Pesa</span>
                  </Button>
                  <Button
                    variant="secondary"
                    className="h-16 flex flex-col items-center justify-center hover:bg-gray-100 transition-colors"
                    onClick={() => setOutboxOpen(true)}
                  >
                    <span className="text-lg mb-1">📤</span>
                    <span className="text-xs">Outbox ({outboxItems.length})</span>
                  </Button>
                </div>
              </CardBody>
            </Card>
          </FadeIn>

          {/* Mobile sticky actions */}
          <div className="fixed inset-x-0 bottom-0 z-10 bg-white/90 backdrop-blur border-t border-gray-200 p-3 md:hidden">
            <div className="mx-auto max-w-7xl flex gap-2">
              <Button
                className="flex-1"
                disabled={cart.length === 0}
                onClick={() => setPayOpen(true)}
              >
                Charge {formatKES(totals.total)}
              </Button>
              <Button variant="secondary" className="flex-1" disabled={cart.length === 0}>
                Hold
              </Button>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
      {/* Payment modal overlay */}
      <HoldDrawer
      open={holdOpen}
      held={held}
      onClose={() => setHoldOpen(false)}
      onResume={handleResume}
      onDelete={handleDelete}
      />
      <OutboxDrawer
        open={outboxOpen}
        items={outboxItems.map(i => ({ id: i.id, created_at: i.created_at, attempts: i.attempts, last_error: i.last_error }))}
        onRetry={(id) => { trySync(); }}
        onDelete={(id) => removeOutbox(id)}
        onClose={() => setOutboxOpen(false)}
      />
      <PaymentModal
        open={payOpen}
        onClose={() => { setPayOpen(false); setPayError(''); }}
        total={totals.total}
        loading={payLoading}
        onSubmit={async ({ paymentType, tendered }) => {
          setPayLoading(true);
          setPayError('');
          try {
            // Compose the payload
            const payload = {
              payment_type: paymentType,
              tendered,
              lines: cart.map((l) => ({
                product_id: l.product_id,
                unit_price: l.unit_price,
                discount: l.discount,
                qty: l.qty,
                allocations: l.allocations.map((a) => ({
                  batch_id: a.batch_id,
                  qty: a.qty,
                })),
              })),
            };
            try {
              const { data, error } = await supabase.rpc('create_pos_sale', { payload: { ...payload, idempotency_key: payload.lines.map((l:any)=>l.product_id).join('-') + '-' + Date.now() } });
              if (error || !data) throw error || new Error('Unexpected error');
              // Success: navigate to receipt
              setPayOpen(false);
              setTimeout(() => {
                router.push("/pos/receipt/" + data.sale_id);
              }, 300);
            } catch (networkOrRlsError: any) {
              // Queue offline for retry
              enqueue({ id: nanoid(), payload, created_at: new Date().toISOString(), attempts: 0, last_error: networkOrRlsError?.message });
              setPayOpen(false);
              setTimeout(() => {
                // Try syncing in the background
                trySync();
                // Stay on POS but show toast via payError banner briefly
              }, 100);
              setPayError('Sale queued to outbox. Will sync when online.');
            }
          } catch (err: any) {
            setPayError(err?.message || 'Failed to charge. Please try again.');
          } finally {
            setPayLoading(false);
          }
        }}
      />
      {payError && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute top-10 left-1/2 -translate-x-1/2 bg-red-100 text-red-700 px-6 py-3 rounded shadow-lg animate-in fade-in">
            {payError}
          </div>
        </div>
      )}
    </>
  );
}
