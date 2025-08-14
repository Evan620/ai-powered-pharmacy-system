'use client';

import { useState, useEffect } from 'react';
import { useSupabase } from '@/contexts/AuthContext';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { PlusIcon, AdjustmentsHorizontalIcon } from '@heroicons/react/24/outline';

interface Batch {
  id: string;
  batch_no: string;
  qty_available: number;
  expiry_date: string;
  product: {
    id: string;
    sku: string;
    generic_name: string;
    brand: string;
    form: string;
    unit: string;
  };
}

interface StockAdjustment {
  id: string;
  qty_before: number;
  qty_after: number;
  qty_change: number;
  reason: string;
  notes: string;
  created_at: string;
  performed_by: {
    name: string;
  };
  batch: {
    batch_no: string;
    product: {
      sku: string;
      generic_name: string;
    };
  };
}

const ADJUSTMENT_REASONS = [
  'Physical count discrepancy',
  'Damaged goods',
  'Expired products',
  'Theft/Loss',
  'System error correction',
  'Transfer between locations',
  'Other'
];

export default function StockAdjustmentsPage() {
  const { supabase } = useSupabase();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [newQty, setNewQty] = useState('');
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchBatches();
    fetchAdjustments();
  }, []);

  const fetchBatches = async () => {
    const { data, error } = await supabase
      .from('batches')
      .select(`
        id,
        batch_no,
        qty_available,
        expiry_date,
        product:products (
          id,
          sku,
          generic_name,
          brand,
          form,
          unit
        )
      `)
      .gt('qty_available', 0)
      .order('expiry_date', { ascending: true });

    if (error) {
      console.error('Error fetching batches:', error);
    } else {
      setBatches(data || []);
    }
  };

  const fetchAdjustments = async () => {
    const { data, error } = await supabase
      .from('stock_adjustments')
      .select(`
        id,
        qty_before,
        qty_after,
        qty_change,
        reason,
        notes,
        created_at,
        performed_by:profiles (name),
        batch:batches (
          batch_no,
          product:products (
            sku,
            generic_name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching adjustments:', error);
    } else {
      setAdjustments(data || []);
    }
  };

  const handleAdjustment = async () => {
    if (!selectedBatch || !newQty || !reason) {
      alert('Please fill in all required fields');
      return;
    }

    const qty = parseInt(newQty);
    if (isNaN(qty) || qty < 0) {
      alert('Please enter a valid quantity');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('perform_stock_adjustment', {
        p_batch_id: selectedBatch.id,
        p_new_qty: qty,
        p_reason: reason,
        p_notes: notes || null
      });

      if (error) throw error;

      if (data.success) {
        alert('Stock adjustment completed successfully');
        setSelectedBatch(null);
        setNewQty('');
        setReason('');
        setNotes('');
        fetchBatches();
        fetchAdjustments();
      } else {
        alert(`Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error performing adjustment:', error);
      alert('Failed to perform stock adjustment');
    } finally {
      setLoading(false);
    }
  };

  const filteredBatches = batches.filter(batch =>
    batch.product.generic_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    batch.batch_no.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Stock Adjustments</h1>
          <p className="text-slate-600">Manually adjust stock quantities with audit trail</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Adjustment Form */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium flex items-center gap-2">
              <AdjustmentsHorizontalIcon className="h-5 w-5" />
              New Stock Adjustment
            </h2>
          </CardHeader>
          <CardBody className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Search Product/Batch
              </label>
              <Input
                type="text"
                placeholder="Search by product name, SKU, or batch number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>

            {searchTerm && (
              <div className="max-h-48 overflow-y-auto border rounded-lg">
                {filteredBatches.map((batch) => (
                  <div
                    key={batch.id}
                    className={`p-3 border-b cursor-pointer hover:bg-gray-50 ${
                      selectedBatch?.id === batch.id ? 'bg-blue-50 border-blue-200' : ''
                    }`}
                    onClick={() => {
                      setSelectedBatch(batch);
                      setNewQty(batch.qty_available.toString());
                      setSearchTerm('');
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-sm">{batch.product.generic_name}</p>
                        <p className="text-xs text-slate-600">
                          SKU: {batch.product.sku} | Batch: {batch.batch_no}
                        </p>
                        <p className="text-xs text-slate-500">
                          Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="secondary">
                        {batch.qty_available} {batch.product.unit}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {selectedBatch && (
              <>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="font-medium text-sm">{selectedBatch.product.generic_name}</p>
                  <p className="text-xs text-slate-600">
                    SKU: {selectedBatch.product.sku} | Batch: {selectedBatch.batch_no}
                  </p>
                  <p className="text-sm text-blue-700 mt-1">
                    Current Quantity: {selectedBatch.qty_available} {selectedBatch.product.unit}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Quantity *
                  </label>
                  <Input
                    type="number"
                    min="0"
                    value={newQty}
                    onChange={(e) => setNewQty(e.target.value)}
                    placeholder="Enter new quantity"
                  />
                  {newQty && (
                    <p className="text-xs text-slate-600 mt-1">
                      Change: {parseInt(newQty) - selectedBatch.qty_available > 0 ? '+' : ''}
                      {parseInt(newQty) - selectedBatch.qty_available} {selectedBatch.product.unit}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Reason *
                  </label>
                  <Select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  >
                    <option value="">Select reason...</option>
                    {ADJUSTMENT_REASONS.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <Textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional notes about this adjustment..."
                    rows={3}
                  />
                </div>

                <Button
                  onClick={handleAdjustment}
                  disabled={loading || !newQty || !reason}
                  className="w-full"
                >
                  {loading ? 'Processing...' : 'Perform Adjustment'}
                </Button>
              </>
            )}
          </CardBody>
        </Card>

        {/* Recent Adjustments */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-medium">Recent Adjustments</h2>
          </CardHeader>
          <CardBody>
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {adjustments.map((adjustment) => (
                <div key={adjustment.id} className="p-3 border rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-sm">
                        {adjustment.batch.product.generic_name}
                      </p>
                      <p className="text-xs text-slate-600">
                        SKU: {adjustment.batch.product.sku} | Batch: {adjustment.batch.batch_no}
                      </p>
                    </div>
                    <Badge 
                      variant={adjustment.qty_change > 0 ? 'success' : 'destructive'}
                    >
                      {adjustment.qty_change > 0 ? '+' : ''}{adjustment.qty_change}
                    </Badge>
                  </div>
                  <div className="text-xs text-slate-600 space-y-1">
                    <p>
                      {adjustment.qty_before} → {adjustment.qty_after}
                    </p>
                    <p>Reason: {adjustment.reason}</p>
                    {adjustment.notes && <p>Notes: {adjustment.notes}</p>}
                    <p>
                      By: {adjustment.performed_by.name} | {' '}
                      {new Date(adjustment.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
              {adjustments.length === 0 && (
                <p className="text-center text-slate-500 py-8">
                  No stock adjustments yet
                </p>
              )}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}