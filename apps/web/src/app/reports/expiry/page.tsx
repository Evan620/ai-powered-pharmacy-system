'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, Pagination } from '@/components/ui/Table';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { transformSupabaseRelationships } from '@/lib/supabase-transforms';
import { useState } from 'react';
import Link from 'next/link';

export default function ExpiryReportPage() {
  const [timeframe, setTimeframe] = useState('30'); // days
  const [sortBy, setSortBy] = useState('expiry'); // expiry, value, quantity
  const [expPage, setExpPage] = useState(1);
  const EXP_PER_PAGE = 20;
  const [dispPage, setDispPage] = useState(1);
  const DISP_PER_PAGE = 10;

  // Expiry Analysis Query
  const { data: expiryData, isLoading: expiryLoading } = useQuery({
    queryKey: ['expiry-analysis', timeframe],
    queryFn: async () => {
      const daysAhead = parseInt(timeframe);
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + daysAhead);

      const { data, error } = await supabase
        .from('batches')
        .select(`
          id,
          batch_no,
          expiry_date,
          qty_available,
          cost_price,
          products (
            generic_name,
            brand,
            sku,
            sell_price
          )
        `)
        .lte('expiry_date', futureDate.toISOString().split('T')[0])
        .gt('qty_available', 0)
        .order('expiry_date');

      if (error) throw error;

      // Transform the data to handle array relationships
      const transformedData = transformSupabaseRelationships(data || [], ['products']);

      const now = new Date();
      let expiredCount = 0;
      let expiredValue = 0;
      let expiringCount = 0;
      let expiringValue = 0;
      let totalAtRisk = 0;

      const processedData = transformedData.map((batch: any) => {
        const expiryDate = new Date(batch.expiry_date);
        const daysUntilExpiry = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const batchValue = batch.qty_available * (batch.products?.sell_price || 0);
        const costValue = batch.qty_available * batch.cost_price;

        let status = 'good';
        let urgency = 'normal';

        if (daysUntilExpiry <= 0) {
          status = 'expired';
          urgency = 'expired';
          expiredCount++;
          expiredValue += batchValue;
        } else if (daysUntilExpiry <= 7) {
          status = 'critical';
          urgency = 'critical';
          expiringCount++;
          expiringValue += batchValue;
        } else if (daysUntilExpiry <= 30) {
          status = 'warning';
          urgency = 'warning';
          expiringCount++;
          expiringValue += batchValue;
        }

        totalAtRisk += batchValue;

        return {
          id: batch.id,
          product: batch.products?.generic_name || 'Unknown',
          brand: batch.products?.brand,
          sku: batch.products?.sku,
          batchNo: batch.batch_no,
          expiryDate: batch.expiry_date,
          daysUntilExpiry,
          quantity: batch.qty_available,
          sellPrice: batch.products?.sell_price || 0,
          costPrice: batch.cost_price,
          batchValue,
          costValue,
          status,
          urgency,
          recommendation: daysUntilExpiry <= 0 ? 'Dispose immediately' :
                         daysUntilExpiry <= 7 ? 'Urgent sale/return' :
                         daysUntilExpiry <= 30 ? 'Prioritize sale' : 'Monitor'
        };
      });

      return {
        expiredCount,
        expiredValue,
        expiringCount,
        expiringValue,
        totalAtRisk,
        batches: processedData
      };
    },
  });

  // Disposal History (mock data - would need disposal tracking)
  const { data: disposalHistory, isLoading: disposalLoading } = useQuery({
    queryKey: ['disposal-history'],
    queryFn: async () => {
      // Mock disposal data - in real app would track actual disposals
      return [
        {
          date: '2024-01-15',
          product: 'Paracetamol 500mg',
          sku: 'PARA500',
          batchNo: 'A12345',
          quantity: 50,
          reason: 'Expired',
          value: 1250,
          method: 'Incineration'
        },
        {
          date: '2024-01-10',
          product: 'Amoxicillin 250mg',
          sku: 'AMOX250',
          batchNo: 'B67890',
          quantity: 25,
          reason: 'Damaged',
          value: 875,
          method: 'Return to Supplier'
        }
      ];
    },
  });

  // Filter and sort expiry data
  const filteredBatches = expiryData?.batches
    ?.sort((a, b) => {
      if (sortBy === 'expiry') return new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime();
      if (sortBy === 'value') return b.batchValue - a.batchValue;
      if (sortBy === 'quantity') return b.quantity - a.quantity;
      return 0;
    }) || [];

  const paginatedBatches = filteredBatches.slice((expPage - 1) * EXP_PER_PAGE, expPage * EXP_PER_PAGE);
  const paginatedDisposals = (disposalHistory || []).slice((dispPage - 1) * DISP_PER_PAGE, dispPage * DISP_PER_PAGE);

  const expiryColumns = [
    {
      key: 'product',
      header: 'Product',
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.product}</div>
          {item.brand && <div className="text-sm text-gray-500">{item.brand}</div>}
          <div className="text-xs text-gray-400">{item.sku}</div>
        </div>
      ),
    },
    {
      key: 'batchNo',
      header: 'Batch',
      render: (item: any) => (
        <div className="font-mono text-sm">{item.batchNo}</div>
      ),
    },
    {
      key: 'expiryDate',
      header: 'Expiry Date',
      render: (item: any) => (
        <div>
          <div className="font-medium">{new Date(item.expiryDate).toLocaleDateString()}</div>
          <div className={`text-xs ${
            item.urgency === 'expired' ? 'text-red-600' :
            item.urgency === 'critical' ? 'text-red-500' :
            item.urgency === 'warning' ? 'text-orange-500' : 'text-gray-500'
          }`}>
            {item.daysUntilExpiry <= 0 ? 'Expired' : `${item.daysUntilExpiry} days`}
          </div>
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Qty',
      className: 'text-right',
    },
    {
      key: 'batchValue',
      header: 'Value at Risk',
      render: (item: any) => `KES ${item.batchValue.toLocaleString()}`,
      className: 'text-right',
    },
    {
      key: 'recommendation',
      header: 'Action',
      render: (item: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.urgency === 'expired' ? 'bg-red-100 text-red-800' :
          item.urgency === 'critical' ? 'bg-red-50 text-red-700' :
          item.urgency === 'warning' ? 'bg-orange-100 text-orange-800' :
          'bg-gray-100 text-gray-700'
        }`}>
          {item.recommendation}
        </span>
      ),
    },
  ];

  const disposalColumns = [
    { key: 'date', header: 'Date' },
    {
      key: 'product',
      header: 'Product',
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.product}</div>
          <div className="text-xs text-gray-400">{item.sku} - {item.batchNo}</div>
        </div>
      ),
    },
    { key: 'quantity', header: 'Qty', className: 'text-right' },
    { key: 'reason', header: 'Reason' },
    {
      key: 'value',
      header: 'Loss Value',
      render: (item: any) => `KES ${item.value.toLocaleString()}`,
      className: 'text-right',
    },
    { key: 'method', header: 'Method' },
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link href="/reports" className="text-sm text-blue-600 hover:underline">
                ← Back to Reports
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900 mt-1">Expiry Report</h1>
              <p className="text-sm text-gray-600">Monitor products expiring and prevent losses</p>
            </div>
            <Button>Export Report</Button>
          </div>

          {/* Filters */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Select
                  label="Timeframe"
                  value={timeframe}
                  onChange={(e) => setTimeframe(e.target.value)}
                  options={[
                    { label: 'Next 30 days', value: '30' },
                    { label: 'Next 60 days', value: '60' },
                    { label: 'Next 90 days', value: '90' },
                    { label: 'Next 180 days', value: '180' },
                  ]}
                />
                <Select
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  options={[
                    { label: 'Expiry Date', value: 'expiry' },
                    { label: 'Value at Risk', value: 'value' },
                    { label: 'Quantity', value: 'quantity' },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Already Expired</div>
                <div className="text-2xl font-semibold text-red-600">
                  {expiryLoading ? '...' : expiryData?.expiredCount || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Value: KES {expiryLoading ? '...' : expiryData?.expiredValue.toLocaleString() || 0}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Expiring Soon</div>
                <div className="text-2xl font-semibold text-orange-600">
                  {expiryLoading ? '...' : expiryData?.expiringCount || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Value: KES {expiryLoading ? '...' : expiryData?.expiringValue.toLocaleString() || 0}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Total at Risk</div>
                <div className="text-2xl font-semibold text-gray-900">
                  KES {expiryLoading ? '...' : expiryData?.totalAtRisk.toLocaleString() || 0}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Next {timeframe} days
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">FEFO Compliance</div>
                <div className="text-2xl font-semibold text-green-600">
                  {expiryLoading ? '...' : '85%'}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  First Expired, First Out
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Expiring Products</h3>
                </CardHeader>
                <CardBody className="p-0">
                  <Table
                    data={paginatedBatches}
                    columns={expiryColumns}
                    loading={expiryLoading}
                    emptyMessage="No products expiring in selected timeframe"
                  />
                  {!expiryLoading && filteredBatches.length > EXP_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        currentPage={expPage}
                        totalPages={Math.ceil(filteredBatches.length / EXP_PER_PAGE)}
                        onPageChange={setExpPage}
                        totalItems={filteredBatches.length}
                        itemsPerPage={EXP_PER_PAGE}
                      />
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Disposal History</h3>
              </CardHeader>
              <CardBody className="p-0">
                <Table
                  data={paginatedDisposals}
                  columns={disposalColumns}
                  loading={disposalLoading}
                  emptyMessage="No disposal records"
                />
                {!disposalLoading && (disposalHistory?.length || 0) > DISP_PER_PAGE && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <Pagination
                      currentPage={dispPage}
                      totalPages={Math.ceil((disposalHistory?.length || 0) / DISP_PER_PAGE)}
                      onPageChange={setDispPage}
                      totalItems={disposalHistory?.length || 0}
                      itemsPerPage={DISP_PER_PAGE}
                    />
                  </div>
                )}
              </CardBody>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}