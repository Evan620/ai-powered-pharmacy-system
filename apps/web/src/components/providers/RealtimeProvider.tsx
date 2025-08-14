'use client';
import { useRealtimeSubscriptions } from '@/hooks/useRealtimeSubscriptions';

export function RealtimeProvider() {
  // Set up realtime listeners app-wide so products and batches auto-refresh
  useRealtimeSubscriptions();
  return null;
}

