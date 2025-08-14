import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export function useExpiringBatches(limit?: number) {
  return useQuery({
    queryKey: ['expiring-batches', limit],
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
