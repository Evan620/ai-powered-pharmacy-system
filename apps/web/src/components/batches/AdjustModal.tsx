import * as React from 'react';
import { Button } from '../ui/Button';

export interface AdjustModalProps {
  open: boolean;
  onClose: () => void;
  onAdjust: (data: { qty: number; movement_type: 'ADJUST' | 'RETURN'; reason: string }) => void;
  loading?: boolean;
}

export function AdjustModal({ open, onClose, onAdjust, loading }: AdjustModalProps) {
  const [qty, setQty] = React.useState(0);
  const [movementType, setMovementType] = React.useState<'ADJUST' | 'RETURN'>('ADJUST');
  const [reason, setReason] = React.useState('');
  const [error, setError] = React.useState('');

  React.useEffect(() => {
    if (open) {
      setQty(0);
      setMovementType('ADJUST');
      setReason('');
      setError('');
    }
  }, [open]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (qty === 0) return setError('Quantity cannot be zero!');
    onAdjust({ qty, movement_type: movementType, reason: reason.trim() });
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/30 flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-lg border shadow-lg w-full max-w-xs mx-auto p-6">
        <h2 className="text-lg font-semibold mb-3">Stock Adjustment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <select className="w-full rounded border p-2" value={movementType} onChange={e => setMovementType(e.target.value as any)}>
              <option value="ADJUST">Adjust</option>
              <option value="RETURN">Return</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Quantity</label>
            <input
              type="number"
              className="w-full rounded border p-2"
              min={-1000}
              max={1000}
              value={qty}
              onChange={e => setQty(Number(e.target.value))}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Reason</label>
            <textarea
              className="w-full rounded border p-2 min-h-[2em] max-h-16 resize-y"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Reason for adjustment"
              required
            />
          </div>
          {error && <div className="text-xs text-red-600">{error}</div>}
          <div className="flex gap-2 mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Save</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
