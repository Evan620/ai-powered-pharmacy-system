import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useLowStockProducts() {
  return useQuery({
    queryKey: ['low-stock-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_low_stock_products')
        .select('*')
        .order('total_stock', { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useInventoryStats() {
  return useQuery({
    queryKey: ['inventory-stats'],
    queryFn: async () => {
      // Get total products
      const { count: totalProducts } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('active', true);

      // Get total batches
      const { count: totalBatches } = await supabase
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .gt('qty_available', 0);

      // Get expiring batches (next 30 days)
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
      
      const { count: expiringBatches } = await supabase
        .from('batches')
        .select('*', { count: 'exact', head: true })
        .lte('expiry_date', thirtyDaysFromNow.toISOString().split('T')[0])
        .gt('qty_available', 0);

      // Get low stock products count
      const { data: products } = await supabase
        .from('products')
        .select(`
          id,
          batches (
            qty_available
          )
        `)
        .eq('active', true);

      // threshold from settings (fallback to 10)
      const { data: settings } = await supabase
        .from('settings')
        .select('key,value')
        .in('key', ['low_stock_product_threshold'])
        .maybeSingle();
      const threshold = Number(settings?.value || 10);

      const lowStockCount = products?.filter(product => {
        const totalStock = product.batches.reduce((sum, batch) => sum + batch.qty_available, 0);
        return totalStock <= threshold;
      }).length || 0;

      return {
        totalProducts: totalProducts || 0,
        totalBatches: totalBatches || 0,
        expiringBatches: expiringBatches || 0,
        lowStockProducts: lowStockCount
      };
    },
  });
}
