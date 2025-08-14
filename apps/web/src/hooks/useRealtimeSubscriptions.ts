import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

/**
 * Hook to set up realtime subscriptions that invalidate React Query caches
 * when database changes occur
 */
export function useRealtimeSubscriptions() {
  const queryClient = useQueryClient();
  const didSetup = useRef(false);

  useEffect(() => {
    if (didSetup.current) return;
    didSetup.current = true;
    // Sales table subscription
    const salesChannel = supabase
      .channel('sales-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
          schema: 'public',
          table: 'sales'
        },
        (payload) => {
          console.log('Sales change detected:', payload);
          // Invalidate all sales-related queries
          queryClient.invalidateQueries({ queryKey: ['revenue-today-trend'] });
          queryClient.invalidateQueries({ queryKey: ['sales-bar'] });
          queryClient.invalidateQueries({ queryKey: ['sales-trend'] });
          queryClient.invalidateQueries({ queryKey: ['top-selling-products'] });
          queryClient.invalidateQueries({ queryKey: ['sales-summary'] });
        }
      )
      .subscribe();

    // Sale items table subscription
    const saleItemsChannel = supabase
      .channel('sale-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sale_items'
        },
        (payload) => {
          console.log('Sale items change detected:', payload);
          // Invalidate queries that depend on sale items
          queryClient.invalidateQueries({ queryKey: ['top-selling-products'] });
          queryClient.invalidateQueries({ queryKey: ['revenue-today-trend'] });
          queryClient.invalidateQueries({ queryKey: ['sales-bar'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
        }
      )
      .subscribe();

    // Batches table subscription
    const batchesChannel = supabase
      .channel('batches-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches'
        },
        (payload) => {
          console.log('Batches change detected:', payload);
          // Invalidate batch and inventory related queries
          queryClient.invalidateQueries({ queryKey: ['expiring-batches'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
          queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
          queryClient.invalidateQueries({ queryKey: ['batch-detail'] });
        }
      )
      .subscribe();

    // Products table subscription
    const productsChannel = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          console.log('Products change detected:', payload);
          // Invalidate product-related queries
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['low-stock-products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
        }
      )
      .subscribe();

    // Stock adjustments table subscription
    const adjustmentsChannel = supabase
      .channel('adjustments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'stock_adjustments'
        },
        (payload) => {
          console.log('Stock adjustments change detected:', payload);
          // Invalidate adjustment and inventory related queries
          queryClient.invalidateQueries({ queryKey: ['stock-adjustments'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
          queryClient.invalidateQueries({ queryKey: ['batches'] });
        }
      )
      .subscribe();

    // Payments table subscription
    const paymentsChannel = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payments change detected:', payload);
          // Invalidate payment and revenue related queries
          queryClient.invalidateQueries({ queryKey: ['revenue-today-trend'] });
          queryClient.invalidateQueries({ queryKey: ['sales-bar'] });
          queryClient.invalidateQueries({ queryKey: ['sales-trend'] });
        }
      )
      .subscribe();

    // Cleanup function to unsubscribe from all channels
    return () => {
      console.log('Cleaning up realtime subscriptions');
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(saleItemsChannel);
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(adjustmentsChannel);
      supabase.removeChannel(paymentsChannel);
    };
  }, [queryClient]);
}

/**
 * Hook for specific table subscriptions with custom invalidation logic
 */
export function useTableSubscription(
  tableName: string,
  queryKeysToInvalidate: string[],
  options?: {
    event?: 'INSERT' | 'UPDATE' | 'DELETE' | '*';
    filter?: string;
  }
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const channel = (supabase as any)
      .channel(`${tableName}-subscription`)
      .on(
        'postgres_changes',
        {
          event: options?.event || '*',
          schema: 'public',
          table: tableName,
          filter: options?.filter
        },
        (payload) => {
          console.log(`${tableName} change detected:`, payload);
          // Invalidate specified query keys
          queryKeysToInvalidate.forEach(queryKey => {
            queryClient.invalidateQueries({ queryKey: [queryKey] });
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [tableName, queryKeysToInvalidate, queryClient, options?.event, options?.filter]);
}
