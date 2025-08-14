'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { transformSupabaseRelationships } from '@/lib/supabase-transforms';

function formatKES(v: number) {
  return `KES ${Number(v || 0).toLocaleString()}`;
}

const ExpiryBadge = ({ daysToExpiry, expiry_date }: { daysToExpiry: number, expiry_date: string }) => {
  let color = 'bg-green-100 text-green-700';
  let pill = `${daysToExpiry} days`;
  if (daysToExpiry < 0) { color = 'bg-red-100 text-red-700 border-red-200'; pill = 'Expired'; }
  else if (daysToExpiry === 0) { color = 'bg-orange-100 text-orange-700 border-orange-200'; pill = 'Expires Today'; }
  else if (daysToExpiry <= 7) color = 'bg-orange-100 text-orange-700 border-orange-200';
  else if (daysToExpiry <= 30) color = 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return (
    <span className="flex items-center gap-2">
      <span className="inline-flex items-center px-2 py-1 bg-slate-100 rounded font-mono text-xs text-slate-700 border border-slate-200">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10m-14 7a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2H6a2 2 0 00-2 2v10z" /></svg>
        {expiry_date}
      </span>
      <span className={`inline-block px-2 py-1 rounded-full text-xs font-semibold border ${color}`}>{pill}</span>
    </span>
  );
};

const QuantityBadge = ({ qty, label }: { qty: number, label: string }) => (
  <span className={`inline-block px-2 py-1 text-xs rounded-full font-semibold bg-gray-100 mr-2 min-w-[48px] text-center ${qty === 0 ? 'text-red-500' : qty < 10 ? 'text-orange-500' : 'text-green-600'}`}>{qty} {label}</span>
);

export default function BatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['batch-detail', id],
    enabled: !!id,
    queryFn: async () => {
      // 1. Get batch+product+supplier
      const { data: batch, error: err1 } = await supabase
        .from('batches')
        .select(`
          id, batch_no, expiry_date, qty_received, qty_available, created_at, cost_price, product_id, supplier_id,
          products ( generic_name, brand, sku, form, unit ),
          suppliers ( name )
        `)
        .eq('id', id)
        .single();
      if (err1) throw err1;

      // Transform the batch data to handle array relationships
      const transformedBatch = {
        ...batch,
        products: Array.isArray(batch.products) ? batch.products[0] : batch.products,
        suppliers: Array.isArray(batch.suppliers) ? batch.suppliers[0] : batch.suppliers
      };

      // 2. Get sale items for this batch
      const { data: sale_items, error: err2 } = await supabase
        .from('sale_items')
        .select(`
          sale_id, qty, unit_price, discount,
          sales ( date, invoice_no )
        `)
        .eq('batch_id', id);
      if (err2) throw err2;

      // Transform sale items data
      const transformedSaleItems = transformSupabaseRelationships(sale_items || [], ['sales']);

      return { ...transformedBatch, sale_items: transformedSaleItems };
    }
  });

  if (isLoading) return <div className="p-12 text-center">Loading batch...</div>;
  if (error || !data) return <div className="p-12 text-center text-red-600">Could not load batch.</div>;

  const {
    batch_no, expiry_date, qty_received, qty_available, created_at, cost_price,
    products, suppliers, sale_items
  } = data;

  const daysToExpiry = Math.ceil(
    (new Date(expiry_date).getTime() - new Date().setHours(0,0,0,0)) / (1000 * 60 * 60 * 24)
  );

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto mt-8 space-y-6">
        <div className="flex items-center justify-between">
          <Button size="sm" variant="secondary" onClick={() => router.back()}>&larr; Back</Button>
        </div>
        <Card>
          <CardBody className="px-6 py-5">
            <div className="grid grid-cols-1 sm:grid-cols-7 gap-6">
              <div className="col-span-3 flex flex-col gap-3 border-r pr-4">
                <div className="mb-1">
                  <div className="text-brand-600 text-xl font-bold">Batch {batch_no}</div>
                  <div className="mt-1">
                    <ExpiryBadge daysToExpiry={daysToExpiry} expiry_date={expiry_date} />
                  </div>
                </div>
                <div className="text-sm text-gray-600">
                  Added: <span className="font-normal">{created_at ? new Date(created_at).toLocaleDateString() : '-'}</span>
                </div>
                <div className="mt-2 flex gap-4">
                  <QuantityBadge qty={qty_received} label="Received" />
                  <QuantityBadge qty={qty_available} label="Available" />
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  <span className="font-medium">Cost price:</span> {formatKES(cost_price)}
                </div>
                <div className="text-sm mt-3 flex items-center gap-2">
                  <span className="font-medium">Supplier:</span>
                  <span className="bg-blue-50 px-2 py-1 rounded text-blue-700 font-semibold">{suppliers?.name || '-'}</span>
                </div>
              </div>
              <div className="col-span-4 flex flex-col gap-2 text-sm">
                <div className="mb-2">
                  <div className="font-semibold mb-1">Product Info</div>
                  <div>
                    <span className="text-lg text-gray-800 font-bold">{products?.generic_name}</span> {products?.brand ? <span className="text-slate-500">({products.brand})</span> : null}
                  </div>
                  <div className="text-slate-700 mt-1">SKU: {products?.sku} &mdash; {products?.form} {products?.unit}</div>
                </div>
                <div className="font-bold text-slate-900 mt-2">Batch UUID</div>
                <div className="font-mono text-xs text-gray-600 break-all">{id}</div>
              </div>
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="font-semibold text-base">Sales Allocations for This Batch</div>
          </CardHeader>
          <CardBody>
            {Array.isArray(sale_items) && sale_items.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-slate-200 rounded shadow md:min-w-[500px]">
                  <thead className="bg-slate-50">
                    <tr className="text-left text-gray-500 border-b border-slate-200 sticky top-0 z-10">
                      <th className="py-2 px-3">Invoice No</th>
                      <th>Date</th>
                      <th>Qty</th>
                      <th>Unit Price</th>
                      <th>Discount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale_items.map((item: any, idx: number) => (
                      <tr key={item.sale_id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                        <td className="py-1.5 px-3 font-mono text-blue-700">{item.sales?.invoice_no}</td>
                        <td>{item.sales?.date ? new Date(item.sales.date).toLocaleDateString() : ''}</td>
                        <td className="text-center">{item.qty}</td>
                        <td className="text-right">{formatKES(item.unit_price)}</td>
                        <td className="text-right">{formatKES(item.discount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : <div className="text-xs text-gray-500">No sales allocations for this batch.</div>}
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <div className="font-semibold text-base">Stock Movement / Audit Log</div>
          </CardHeader>
          <CardBody>
            <StockMovementAudit batchId={id} />
          </CardBody>
        </Card>
      </div>
    </AppShell>
  );
}

function StockMovementAudit({ batchId }: { batchId: string }) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["stock-movement", batchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('stock_movements')
        .select('id, qty, movement_type, reason, performed_by, performed_at, linked_id')
        .eq('batch_id', batchId)
        .order('performed_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });
  if (isLoading) return <div className="text-xs text-gray-500 py-4">Loading...</div>;
  if (error) return <div className="text-xs text-red-600 py-4">Could not load audit log.</div>;
  if (!data || !Array.isArray(data) || data.length === 0) return <div className="text-xs text-gray-500 py-4">No stock movements found for this batch.</div>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs border border-slate-200 rounded shadow">
        <thead className="bg-slate-50">
          <tr className="text-left text-gray-500 border-b border-slate-200">
            <th>Date/Time</th>
            <th>Type</th>
            <th>Qty</th>
            <th>Reason</th>
            <th>Ref ID</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row: any, idx: number) => (
            <tr key={row.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
              <td>{row.performed_at ? new Date(row.performed_at).toLocaleString() : ''}</td>
              <td className={`font-semibold ${row.movement_type === 'OUT' ? 'text-red-600' : row.movement_type === 'IN' ? 'text-green-600' : row.movement_type === 'ADJUST' ? 'text-yellow-600' : 'text-blue-500'}`}>{row.movement_type}</td>
              <td className={`text-right font-mono ${row.qty < 0 ? 'text-red-600' : row.qty > 0 ? 'text-green-600' : 'text-slate-700'}`}>{row.qty}</td>
              <td>{row.reason || '-'}</td>
              <td className="font-mono text-[10px] text-slate-400">{row.linked_id ? row.linked_id.slice(0, 8) : ''}</td>
              <td className="text-xs">{row.performed_by || '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
