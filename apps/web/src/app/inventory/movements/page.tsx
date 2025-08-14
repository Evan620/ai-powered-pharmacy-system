'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Table } from '@/components/ui/Table';
import { FadeIn } from '@/components/ui/PageTransition';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useState } from 'react';
import { useStockMovements, MovementType } from '@/hooks/useStockMovements';

function toISODate(d: Date) {
  const copy = new Date(d);
  copy.setHours(0,0,0,0);
  return copy.toISOString();
}

export default function MovementsPage() {
  const [type, setType] = useState<MovementType | 'ALL'>('ALL');
  const [from, setFrom] = useState<string>(() => toISODate(new Date(Date.now() - 7*24*3600*1000)));
  const [to, setTo] = useState<string>(() => new Date().toISOString());

  const { data = [], isLoading } = useStockMovements({ from, to, type });

  const columns = [
    { key: 'performed_at', header: 'Date', render: (r: any) => new Date(r.performed_at).toLocaleString() },
    { key: 'movement_type', header: 'Type' },
    { key: 'product', header: 'Product', render: (r: any) => (
      <div>
        <div className='font-medium'>{r.products?.generic_name || '—'}</div>
        <div className='text-xs text-slate-400'>{r.products?.sku || ''}</div>
      </div>
    )},
    { key: 'batch', header: 'Batch', render: (r: any) => r.batches?.batch_no || '—' },
    { key: 'qty', header: 'Qty', className: 'text-right' },
    { key: 'reason', header: 'Reason' },
    { key: 'performed_by', header: 'By', render: (r: any) => r.profiles?.name || '—' },
  ];

  const csvHeaders = ['Date','Type','Product','SKU','Batch','Qty','Reason','By'];
  const csvRows = data.map(r => [
    new Date(r.performed_at).toLocaleString(),
    r.movement_type,
    r.products?.generic_name || '',
    r.products?.sku || '',
    r.batches?.batch_no || '',
    String(r.qty),
    r.reason || '',
    r.profiles?.name || ''
  ]);

  const downloadCSV = () => {
    const csv = [csvHeaders, ...csvRows].map(row => row.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stock-movements-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className='p-6 space-y-6'>
          <FadeIn>
            <div className='flex items-center justify-between'>
              <div>
                <h1 className='text-lg font-semibold'>Stock Movements</h1>
                <p className='text-sm text-slate-500'>IN, OUT, ADJUST, RETURN with filters and export</p>
              </div>
              <Button variant='secondary' onClick={downloadCSV}>Export CSV</Button>
            </div>
          </FadeIn>

          <Card>
            <CardBody>
              <div className='grid grid-cols-1 md:grid-cols-4 gap-4'>
                <Select
                  label='Type'
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  options={[
                    { label: 'All', value: 'ALL' },
                    { label: 'IN', value: 'IN' },
                    { label: 'OUT', value: 'OUT' },
                    { label: 'ADJUST', value: 'ADJUST' },
                    { label: 'RETURN', value: 'RETURN' },
                  ]}
                />
                <Input
                  label='From'
                  type='datetime-local'
                  value={new Date(from).toISOString().slice(0,16)}
                  onChange={(e) => setFrom(new Date(e.target.value).toISOString())}
                />
                <Input
                  label='To'
                  type='datetime-local'
                  value={new Date(to).toISOString().slice(0,16)}
                  onChange={(e) => setTo(new Date(e.target.value).toISOString())}
                />
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>Recent Movements</CardHeader>
            <CardBody className='p-0'>
              <Table
                data={data}
                columns={columns as any}
                loading={isLoading}
                emptyMessage='No movements in this period'
              />
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

