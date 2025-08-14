import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useProducts() {
  return useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('generic_name');

      if (error) {
        throw error;
      }

      return data?.filter(product => product.active) || [];
    },
  });
}

export function useTopSellingProducts() {
  return useQuery({
    queryKey: ['top-selling-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_top_selling_products_30d')
        .select('generic_name,total_qty,total_revenue')
        .order('total_qty', { ascending: false })
        .limit(3);

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        label: row.generic_name,
        value: String(row.total_qty),
        revenue: String(row.total_revenue),
      }));
    },
  });
}
