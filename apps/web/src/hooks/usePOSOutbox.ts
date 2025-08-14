import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface PosOutboxItem {
  id: string;
  payload: any;
  created_at: string;
  attempts: number;
  last_error?: string;
}

const KEY = 'pharmo_pos_outbox';

function readOutbox(): PosOutboxItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeOutbox(items: PosOutboxItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(KEY, JSON.stringify(items));
}

export function usePOSOutbox() {
  const [items, setItems] = useState<PosOutboxItem[]>([]);
  const [syncing, setSyncing] = useState(false);
  const mounted = useRef(false);

  useEffect(() => {
    setItems(readOutbox());
    mounted.current = true;
  }, []);

  const enqueue = useCallback((item: PosOutboxItem) => {
    setItems((prev) => {
      const next = [item, ...prev];
      writeOutbox(next);
      return next;
    });
  }, []);

  const remove = useCallback((id: string) => {
    setItems((prev) => {
      const next = prev.filter((i) => i.id !== id);
      writeOutbox(next);
      return next;
    });
  }, []);

  const update = useCallback((id: string, patch: Partial<PosOutboxItem>) => {
    setItems((prev) => {
      const next = prev.map((i) => (i.id === id ? { ...i, ...patch } : i));
      writeOutbox(next);
      return next;
    });
  }, []);

  const trySync = useCallback(async () => {
    if (syncing) return;
    const current = readOutbox();
    if (current.length === 0) return;
    setSyncing(true);
    try {
      for (const item of current) {
        try {
          const { data, error } = await supabase.rpc('create_pos_sale', { payload: item.payload });
          if (error) throw error;
          remove(item.id);
        } catch (e: any) {
          update(item.id, { attempts: (item.attempts || 0) + 1, last_error: e?.message || 'Sync failed' });
        }
      }
    } finally {
      setSyncing(false);
    }
  }, [remove, update, syncing]);

  useEffect(() => {
    function onOnline() {
      trySync();
    }
    window.addEventListener('online', onOnline);
    const iv = window.setInterval(() => trySync(), 30_000);
    return () => {
      window.removeEventListener('online', onOnline);
      window.clearInterval(iv);
    };
  }, [trySync]);

  return { items, enqueue, remove, update, trySync, syncing };
}

