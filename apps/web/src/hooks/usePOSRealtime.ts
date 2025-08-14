import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToastContext } from '@/contexts/ToastContext';

/**
 * Specialized realtime hook for POS operations
 * Provides immediate feedback for sales, inventory changes, and stock updates
 */
export function usePOSRealtime() {
  const queryClient = useQueryClient();
  const toast = useToastContext();

  useEffect(() => {
    // Sales realtime subscription with notifications
    const salesChannel = supabase
      .channel('pos-sales')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sales'
        },
        (payload) => {
          console.log('New sale created:', payload);
          
          // Show success notification
          if (payload.new) {
            toast?.success(`New sale completed: ${payload.new.invoice_no}`);
          }
          
          // Invalidate relevant queries immediately
          queryClient.invalidateQueries({ queryKey: ['revenue-today-trend'] });
          queryClient.invalidateQueries({ queryKey: ['sales-bar'] });
          queryClient.invalidateQueries({ queryKey: ['top-selling'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
        }
      )
      .subscribe();

    // Batch quantity changes (for stock updates)
    const batchesChannel = supabase
      .channel('pos-batches')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'batches'
        },
        (payload) => {
          console.log('Batch quantity updated:', payload);
          
          // Check if quantity changed significantly
          if (payload.old && payload.new) {
            const oldQty = payload.old.qty_available;
            const newQty = payload.new.qty_available;
            
            if (oldQty !== newQty) {
              // Invalidate inventory-related queries
              queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
              queryClient.invalidateQueries({ queryKey: ['low-stock'] });
              queryClient.invalidateQueries({ queryKey: ['expiring-batches'] });
              queryClient.invalidateQueries({ queryKey: ['batches'] });
              
              // Show low stock warning if needed
              if (newQty <= 10 && newQty > 0) {
                toast?.warning(`Low stock alert: ${payload.new.batch_no} has ${newQty} units left`);
              } else if (newQty === 0) {
                toast?.error(`Out of stock: ${payload.new.batch_no} is now empty`);
              }
            }
          }
        }
      )
      .subscribe();

    // Payment confirmations
    const paymentsChannel = supabase
      .channel('pos-payments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments'
        },
        (payload) => {
          console.log('Payment processed:', payload);
          
          if (payload.new) {
            // Invalidate revenue queries
            queryClient.invalidateQueries({ queryKey: ['revenue-today-trend'] });
            queryClient.invalidateQueries({ queryKey: ['sales-bar'] });
          }
        }
      )
      .subscribe();

    // Stock adjustments (manual inventory changes)
    const adjustmentsChannel = supabase
      .channel('pos-adjustments')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_adjustments'
        },
        (payload) => {
          console.log('Stock adjustment made:', payload);
          
          if (payload.new) {
            toast?.info(`Stock adjusted: ${payload.new.reason}`);
            
            // Invalidate inventory queries
            queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
            queryClient.invalidateQueries({ queryKey: ['batches'] });
            queryClient.invalidateQueries({ queryKey: ['low-stock'] });
          }
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up POS realtime subscriptions');
      supabase.removeChannel(salesChannel);
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(paymentsChannel);
      supabase.removeChannel(adjustmentsChannel);
    };
  }, [queryClient, toast]);
}

/**
 * Hook for inventory-specific realtime updates
 * Use this on inventory pages for immediate stock level updates
 */
export function useInventoryRealtime() {
  const queryClient = useQueryClient();

  useEffect(() => {
    // Products table changes
    const productsChannel = supabase
      .channel('inventory-products')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'products'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['products'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
        }
      )
      .subscribe();

    // Batches table changes
    const batchesChannel = supabase
      .channel('inventory-batches')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'batches'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['batches'] });
          queryClient.invalidateQueries({ queryKey: ['expiring-batches'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
          queryClient.invalidateQueries({ queryKey: ['low-stock'] });
        }
      )
      .subscribe();

    // Suppliers table changes
    const suppliersChannel = supabase
      .channel('inventory-suppliers')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'suppliers'
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productsChannel);
      supabase.removeChannel(batchesChannel);
      supabase.removeChannel(suppliersChannel);
    };
  }, [queryClient]);
}
