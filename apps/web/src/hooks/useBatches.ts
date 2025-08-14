import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useExpiringBatches(limit?: number) {
  return useQuery({
    queryKey: ['expiring-batches', limit],
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
    queryFn: async () => {
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

      let query = supabase
        .from('batches')
        .select(`
          *,
          products (generic_name, brand)
        `)
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('qty_available', 0)
        .order('expiry_date');

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return data.map(batch => {
        const daysUntilExpiry = Math.ceil(
          (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );

        const urgency = daysUntilExpiry <= 0 ? 'expired' :
                      daysUntilExpiry <= 7 ? 'critical' :
                      daysUntilExpiry <= 14 ? 'warning' : 'normal';

        return {
          label: `${batch.products?.generic_name} (Batch ${batch.batch_no})`,
          value: daysUntilExpiry <= 0 ? 'Expired' : `${daysUntilExpiry} days`,
          urgency,
          daysUntilExpiry
        };
      });
    },
  });
}

export function useLowStockBatches(threshold: number = 10, limit?: number) {
  return useQuery({
    queryKey: ['low-stock-batches', threshold, limit],
    refetchInterval: 30_000,
    refetchOnWindowFocus: 'always',
    queryFn: async () => {
      let query = supabase
        .from('batches')
        .select(`
          id,
          batch_no,
          qty_available,
          expiry_date,
          products (generic_name, brand, sku)
        `)
        .lte('qty_available', threshold)
        .gt('qty_available', -1) // guard
        .order('qty_available', { ascending: true });

      if (limit) query = query.limit(limit);

      const { data, error } = await query;
      if (error) throw error;

      return (data ?? []).map((b: any) => ({
        product: b.products?.generic_name + (b.products?.brand ? ` (${b.products.brand})` : ''),
        sku: b.products?.sku,
        batch: b.batch_no,
        stock: b.qty_available,
        urgency: b.qty_available === 0 ? 'critical' : b.qty_available <= threshold ? 'warning' : 'normal',
        expiry: b.expiry_date,
      }));
    },
  });
}

