import * as React from 'react';
import { Button } from '../ui/Button';

export interface OutboxItemView {
  id: string;
  created_at: string;
  attempts: number;
  last_error?: string;
}

interface Props {
  open: boolean;
  items: OutboxItemView[];
  onRetry: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function OutboxDrawer({ open, items, onRetry, onDelete, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center md:items-center md:justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-md p-6 rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-lg md:h-full flex flex-col md:justify-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">POS Outbox</h2>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
        {items.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-10">Outbox is empty</div>
        ) : (
          <ul className="space-y-3 max-h-96 overflow-y-auto">
            {items.map(it => (
              <li key={it.id} className="p-3 rounded bg-slate-50 border flex items-center justify-between gap-4">
                <div>
                  <div className="font-medium">{new Date(it.created_at).toLocaleString()}</div>
                  <div className="text-xs text-gray-500">Attempts: {it.attempts}{it.last_error ? ` • ${it.last_error}` : ''}</div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button size="sm" variant="primary" onClick={() => onRetry(it.id)}>Retry</Button>
                  <Button size="sm" variant="secondary" onClick={() => onDelete(it.id)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

