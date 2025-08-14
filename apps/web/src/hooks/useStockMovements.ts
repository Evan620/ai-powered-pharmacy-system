import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { transformSupabaseRelationships } from '@/lib/supabase-transforms';

export type MovementType = 'IN' | 'OUT' | 'ADJUST' | 'RETURN';

export interface StockMovement {
  id: string;
  movement_type: MovementType;
  reason: string | null;
  qty: number;
  performed_at: string;
  products?: { generic_name?: string; sku?: string } | null;
  batches?: { batch_no?: string } | null;
  profiles?: { name?: string } | null;
}

export function useStockMovements(params: { from?: string; to?: string; type?: MovementType | 'ALL' }) {
  const { from, to, type } = params;
  return useQuery({
    queryKey: ['stock-movements', from, to, type],
    refetchOnWindowFocus: 'always',
    queryFn: async () => {
      let query = supabase
        .from('stock_movements')
        .select(`
          id, movement_type, reason, qty, performed_at,
          products:product_id ( generic_name, sku ),
          batches:batch_id ( batch_no ),
          profiles:performed_by ( name )
        `)
        .order('performed_at', { ascending: false })
        .limit(200);

      if (from) query = query.gte('performed_at', from);
      if (to) query = query.lte('performed_at', to);
      if (type && type !== 'ALL') query = query.eq('movement_type', type);

      const { data, error } = await query;
      if (error) throw error;

      return transformSupabaseRelationships<StockMovement>(data || [], ['products', 'batches', 'profiles']);
    },
  });
}

