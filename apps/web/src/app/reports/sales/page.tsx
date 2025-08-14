'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Table, Pagination } from '@/components/ui/Table';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import Link from 'next/link';

export default function SalesReportPage() {
  const [dateRange, setDateRange] = useState('7'); // days
  const [groupBy, setGroupBy] = useState('day');
  const [tpPage, setTpPage] = useState(1);
  const TP_PER_PAGE = 10;
  const [dsPage, setDsPage] = useState(1);
  const DS_PER_PAGE = 20;

  // Sales Summary Query
  const { data: salesSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['sales-summary', dateRange],
    queryFn: async () => {
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('sales')
        .select('total, date, payment_type')
        .gte('date', startDate.toISOString())
        .eq('status', 'completed');

      if (error) throw error;

      const totalRevenue = data.reduce((sum, sale) => sum + Number(sale.total), 0);
      const totalTransactions = data.length;
      const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;

      // Group by payment method
      const paymentMethods = data.reduce((acc, sale) => {
        acc[sale.payment_type] = (acc[sale.payment_type] || 0) + Number(sale.total);
        return acc;
      }, {} as Record<string, number>);

      return {
        totalRevenue,
        totalTransactions,
        avgTransaction,
        paymentMethods
      };
    },
  });

  // Top Selling Products Query
  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['top-selling-products', dateRange],
    queryFn: async () => {
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          qty,
          unit_price,
          discount,
          products (generic_name, brand, sku),
          sales!inner (date, status)
        `)
        .gte('sales.date', startDate.toISOString())
        .eq('sales.status', 'completed');

      if (error) throw error;

      // Group by product
      const productSales = data.reduce((acc, item) => {
        const productKey = item.products?.sku || 'unknown';
        if (!acc[productKey]) {
          acc[productKey] = {
            product: item.products?.generic_name || 'Unknown',
            brand: item.products?.brand,
            sku: item.products?.sku,
            totalQty: 0,
            totalRevenue: 0
          };
        }
        acc[productKey].totalQty += item.qty;
        acc[productKey].totalRevenue += (item.qty * item.unit_price) - (item.discount || 0);
        return acc;
      }, {} as Record<string, any>);

      return Object.values(productSales)
        .sort((a: any, b: any) => b.totalRevenue - a.totalRevenue)
        .slice(0, 10);
    },
  });

  // Daily Sales Query
  const { data: dailySales, isLoading: dailyLoading } = useQuery({
    queryKey: ['daily-sales', dateRange],
    queryFn: async () => {
      const daysBack = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data, error } = await supabase
        .from('sales')
        .select('total, date')
        .gte('date', startDate.toISOString())
        .eq('status', 'completed')
        .order('date');

      if (error) throw error;

      // Group by date
      const dailyTotals = data.reduce((acc, sale) => {
        const date = new Date(sale.date).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + Number(sale.total);
        return acc;
      }, {} as Record<string, number>);

      return Object.entries(dailyTotals).map(([date, total]) => ({
        date: new Date(date).toLocaleDateString(),
        total,
        transactions: data.filter(s => s.date.startsWith(date)).length
      }));
    },
  });

  const paginatedTopProducts = (topProducts || []).slice((tpPage - 1) * TP_PER_PAGE, tpPage * TP_PER_PAGE);
  const paginatedDailySales = (dailySales || []).slice((dsPage - 1) * DS_PER_PAGE, dsPage * DS_PER_PAGE);

  const topProductsColumns = [
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
      key: 'totalQty',
      header: 'Qty Sold',
      className: 'text-right',
    },
    {
      key: 'totalRevenue',
      header: 'Revenue',
      render: (item: any) => `KES ${item.totalRevenue.toLocaleString()}`,
      className: 'text-right',
    },
  ];

  const dailySalesColumns = [
    { key: 'date', header: 'Date' },
    { key: 'transactions', header: 'Transactions', className: 'text-right' },
    {
      key: 'total',
      header: 'Revenue',
      render: (item: any) => `KES ${item.total.toLocaleString()}`,
      className: 'text-right',
    },
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
              <h1 className="text-2xl font-semibold text-gray-900 mt-1">Sales Report</h1>
              <p className="text-sm text-gray-600">Analyze your sales performance and trends</p>
            </div>
            <Button>Export Report</Button>
          </div>

          {/* Filters */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Select
                  label="Time Period"
                  value={dateRange}
                  onChange={(e) => setDateRange(e.target.value)}
                  options={[
                    { label: 'Last 7 days', value: '7' },
                    { label: 'Last 30 days', value: '30' },
                    { label: 'Last 90 days', value: '90' },
                  ]}
                />
                <Select
                  label="Group By"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  options={[
                    { label: 'Daily', value: 'day' },
                    { label: 'Weekly', value: 'week' },
                    { label: 'Monthly', value: 'month' },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {summaryLoading ? '...' : `KES ${salesSummary?.totalRevenue.toLocaleString() || 0}`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Transactions</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {summaryLoading ? '...' : salesSummary?.totalTransactions.toLocaleString() || 0}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Avg Transaction</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {summaryLoading ? '...' : `KES ${salesSummary?.avgTransaction.toFixed(0) || 0}`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Payment Methods</div>
                <div className="text-sm text-gray-500 mt-1">
                  {summaryLoading ? '...' : Object.entries(salesSummary?.paymentMethods || {}).map(([method, amount]) => (
                    <div key={method} className="flex justify-between">
                      <span className="capitalize">{method}:</span>
                      <span>KES {(amount as number).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Top Selling Products</h3>
              </CardHeader>
              <CardBody className="p-0">
                <Table
                  data={paginatedTopProducts}
                  columns={topProductsColumns}
                  loading={productsLoading}
                  emptyMessage="No sales data available"
                />
                {!productsLoading && (topProducts?.length || 0) > TP_PER_PAGE && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <Pagination
                      currentPage={tpPage}
                      totalPages={Math.ceil((topProducts?.length || 0) / TP_PER_PAGE)}
                      onPageChange={setTpPage}
                      totalItems={topProducts?.length || 0}
                      itemsPerPage={TP_PER_PAGE}
                    />
                  </div>
                )}
              </CardBody>
            </Card>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Daily Sales</h3>
              </CardHeader>
              <CardBody className="p-0">
                <Table
                  data={paginatedDailySales}
                  columns={dailySalesColumns}
                  loading={dailyLoading}
                  emptyMessage="No sales data available"
                />
                {!dailyLoading && (dailySales?.length || 0) > DS_PER_PAGE && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <Pagination
                      currentPage={dsPage}
                      totalPages={Math.ceil((dailySales?.length || 0) / DS_PER_PAGE)}
                      onPageChange={setDsPage}
                      totalItems={dailySales?.length || 0}
                      itemsPerPage={DS_PER_PAGE}
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