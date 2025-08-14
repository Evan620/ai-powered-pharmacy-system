import * as React from 'react';
import { Button } from '../ui/Button';

export interface HeldCart {
  id: string;
  cart: any[];
  created: string; // ISO
  note?: string;
}

interface HoldDrawerProps {
  open: boolean;
  held: HeldCart[];
  onResume: (cart: HeldCart) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export function HoldDrawer({ open, held, onResume, onDelete, onClose }: HoldDrawerProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-end justify-center md:items-center md:justify-end animate-in fade-in">
      <div className="bg-white w-full max-w-md p-6 rounded-t-2xl md:rounded-none md:rounded-l-2xl shadow-lg md:h-full flex flex-col md:justify-center">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Held/Pending Sales</h2>
          <Button size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
        {held.length === 0 ? (
          <div className="text-sm text-gray-500 text-center py-10">No held sales found</div>
        ) : (
          <ul className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
            {held.map(cart => (
              <li key={cart.id} className="p-3 rounded bg-slate-50 border flex items-center justify-between gap-4">
                <div>
                  <div className="font-bold text-blue-700">{cart.note || `Hold (${cart.id.slice(-4)})`}</div>
                  <div className="text-xs text-gray-500">{cart.cart.length} lines, Created {new Date(cart.created).toLocaleString()}</div>
                </div>
                <div className="flex gap-1 ml-2">
                  <Button size="sm" variant="primary" onClick={() => onResume(cart)}>Resume</Button>
                  <Button size="sm" variant="secondary" onClick={() => onDelete(cart.id)}>Delete</Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
