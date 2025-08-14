'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { transformSupabaseRelationships } from '@/lib/supabase-transforms';

function formatKES(n: number) {
  return `KES ${Number(n || 0).toLocaleString()}`;
}

export default function ReceiptPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { data, isLoading, error } = useQuery({
    queryKey: ['pos-receipt', id],
    enabled: !!id,
    queryFn: async () => {
      // Fetch sale with items, batches, cashier, payments
      const { data: sale, error } = await supabase
        .from('sales')
        .select(`
          id, invoice_no, date, payment_type, total,
          status, created_at, cashier_id, pharmacy_id,
          profiles:cashier_id ( name ),
          sale_items (
            id, qty, unit_price, discount,
            products ( generic_name, brand, sku ),
            batch_id,
            batches:batch_id ( batch_no, expiry_date )
          ),
          payments (
            amount, method, created_at, status
          )
        `)
        .eq('id', id)
        .single();
      if (error) throw error;

      // Transform the sale data to handle array relationships
      const transformedSale = {
        ...sale,
        profiles: Array.isArray(sale.profiles) ? sale.profiles[0] : sale.profiles,
        sale_items: transformSupabaseRelationships(sale.sale_items || [], ['products', 'batches'])
      };

      return transformedSale;
    },
  });

  if (isLoading) return <div className='p-12 text-center'>Loading receipt...</div>;
  if (error || !data) return <div className='p-12 text-center text-red-600'>Could not load receipt.</div>;

  const { invoice_no, date, total, payment_type, profiles, sale_items, payments } = data;
  const cashier = profiles?.name || '—';
  const paid = payments?.length ? payments[0].amount : total;
  const method = payments?.length ? payments[0].method : payment_type;

  return (
    <AppShell>
      <div className="max-w-lg mx-auto mt-8 print:mt-0 print:p-0">
        <Card className='print:shadow-none print:border-0 print:rounded-none'>
          <CardBody className='print:p-4'>
            <div className='print:hidden flex justify-between items-center mb-4'>
              <Button size='sm' onClick={() => router.back()}>&larr; Back</Button>
              <Button size='sm' onClick={() => window.print()}>Print</Button>
            </div>

            <div className="text-center mb-6">
              <h2 className="text-lg font-bold">Pharmo Pharmacy</h2>
              <div className="text-sm text-slate-500">POS Receipt</div>
            </div>

            <div className="flex justify-between text-sm mb-2">
              <div>Invoice No: <span className="font-medium">{invoice_no}</span></div>
              <div>Date: <span>{date ? new Date(date).toLocaleString() : ''}</span></div>
            </div>
            <div className='flex justify-between text-sm mb-2'>
              <div>Cashier: <span>{cashier}</span></div>
              <div>Payment: <span className="capitalize">{method}</span></div>
            </div>

            <hr className="my-3" />

            <div className="w-full">
              <table className="w-full text-xs border-separate border-spacing-y-2">
                <thead>
                  <tr className="text-left text-slate-500">
                    <th>Product</th>
                    <th>Batch</th>
                    <th className="text-right">Qty</th>
                    <th className="text-right">Each</th>
                    <th className="text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody>
                  {sale_items?.map((item: any) => (
                    <tr key={item.id}>
                      <td className="pr-2">
                        <div>{item.products?.generic_name}</div>
                        {item.products?.sku && <div className="text-[11px] text-gray-400">{item.products.sku}</div>}
                      </td>
                      <td className="pr-2">
                        {item.batches?.batch_no}
                        <div className="text-[11px] text-gray-400">{item.batches?.expiry_date ? new Date(item.batches.expiry_date).toLocaleDateString() : ''}</div>
                      </td>
                      <td className="text-right pr-2">{item.qty}</td>
                      <td className="text-right pr-2">{formatKES(item.unit_price)}</td>
                      <td className="text-right pr-2 font-medium">{formatKES(item.qty * item.unit_price - (item.discount || 0))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <hr className="my-4" />
            <div className='space-y-1 text-sm'>
              <div className="flex justify-between">
                <span>Paid</span><span>{formatKES(paid)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg mt-2">
                <span>Total</span><span>{formatKES(total)}</span>
              </div>
            </div>

            <div className="my-4 text-xs text-center text-gray-500">
              Thank you for your purchase!
              <br />All sales subject to return within 7 days with receipt.
            </div>
          </CardBody>
        </Card>
      </div>
      <style>{`@media print{body{background:white}.print\:hidden{display:none!important}}`}</style>
    </AppShell>
  );
}
