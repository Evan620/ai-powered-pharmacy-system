import * as React from 'react';
import { Button } from '../ui/Button';

export interface PaymentModalProps {
  open: boolean;
  onClose: () => void;
  total: number;
  onSubmit: (data: { paymentType: string; tendered: number }) => void;
  loading?: boolean;
}

export function PaymentModal({ open, onClose, total, onSubmit, loading }: PaymentModalProps) {
  const [paymentType, setPaymentType] = React.useState('cash');
  const [tendered, setTendered] = React.useState<number>(total);
  const [error, setError] = React.useState('');
  const change = Math.max(0, tendered - total);

  React.useEffect(() => {
    if (open) {
      setTendered(total);
      setError('');
      setPaymentType('cash');
    }
  }, [open, total]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (tendered < total) {
      setError('Amount tendered must cover the total.');
      return;
    }
    setError('');
    onSubmit({ paymentType, tendered });
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm flex items-center justify-center animate-in fade-in">
      <div className="bg-white rounded-lg border shadow-xl w-full max-w-md mx-auto p-6 animate-in fade-in slide-in-from-bottom-2">
        <h2 className="text-lg font-semibold mb-3">Take Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Payment Method</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setPaymentType('cash')} className={`px-3 py-2 rounded ${paymentType === 'cash' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>💵 Cash</button>
              <button type="button" onClick={() => setPaymentType('card')} className={`px-3 py-2 rounded ${paymentType === 'card' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>💳 Card</button>
              <button type="button" onClick={() => setPaymentType('mobile')} className={`px-3 py-2 rounded ${paymentType === 'mobile' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600'}`}>📱 M-Pesa</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">
              Amount Tendered <span className="text-gray-400">(KES)</span>
            </label>
            <input
              type="number"
              step="any"
              min={0}
              value={tendered}
              onChange={(e) => setTendered(Number(e.target.value))}
              className="w-full rounded border px-3 py-2"
              required
              autoFocus
            />
            <div className="mt-2 text-xs text-gray-500">Change: <span className="font-medium">KES {change.toLocaleString()}</span></div>
          </div>
          {error && <div className="text-xs text-red-600 mt-1">{error}</div>}
          <div className="flex gap-2 mt-6">
            <Button type="button" variant="secondary" onClick={onClose} disabled={loading} className="flex-1">Cancel</Button>
            <Button type="submit" loading={loading} className="flex-1">Charge</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
