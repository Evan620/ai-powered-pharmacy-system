import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export type SettingKey = 'currency' | 'low_stock_product_threshold' | 'low_stock_batch_threshold';

export interface SettingItem {
  id: string;
  key: SettingKey | string;
  value: string;
}

export function useSettings() {
  return useQuery({
    queryKey: ['settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('settings')
        .select('id, key, value')
        .order('key');
      if (error) throw error;
      const map: Record<string, string> = {};
      (data || []).forEach((s) => (map[s.key] = s.value));
      return map as Record<SettingKey | string, string>;
    },
  });
}

export function useUpsertSetting() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, value }: { key: SettingKey | string; value: string }) => {
      const { error } = await supabase.from('settings').upsert({ key, value });
      if (error) throw error;
      return true;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}

