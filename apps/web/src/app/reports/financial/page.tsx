'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Table, Pagination } from '@/components/ui/Table';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import Link from 'next/link';

export default function FinancialReportPage() {
  const [period, setPeriod] = useState('30'); // days
  const [groupBy, setGroupBy] = useState('product'); // product, category, supplier
  const [profPage, setProfPage] = useState(1);
  const PROF_PER_PAGE = 20;
  const [expPage, setExpPage] = useState(1);
  const EXP_PER_PAGE = 10;
  const [cfPage, setCfPage] = useState(1);
  const CF_PER_PAGE = 20;

  // Financial Summary Query
  const { data: financialSummary, isLoading: summaryLoading } = useQuery({
    queryKey: ['financial-summary', period],
    queryFn: async () => {
      const daysBack = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      // Get sales data with cost information
      const { data: salesData, error: salesError } = await supabase
        .from('sale_items')
        .select(`
          qty,
          unit_price,
          discount,
          products (
            generic_name,
            brand,
            sku
          ),
          batches (
            cost_price
          ),
          sales!inner (
            date,
            status,
            payment_type
          )
        `)
        .gte('sales.date', startDate.toISOString())
        .eq('sales.status', 'completed');

      if (salesError) throw salesError;

      let totalRevenue = 0;
      let totalCOGS = 0;
      let totalDiscount = 0;
      const productProfitability: Record<string, any> = {};
      const categoryPerformance: Record<string, any> = {};

      salesData.forEach(item => {
        const revenue = item.qty * item.unit_price;
        const discount = item.discount || 0;
        const netRevenue = revenue - discount;
        const cogs = item.qty * (item.batches?.cost_price || 0);
        const grossProfit = netRevenue - cogs;

        totalRevenue += revenue;
        totalCOGS += cogs;
        totalDiscount += discount;

        // Product profitability
        const productKey = item.products?.sku || 'unknown';
        if (!productProfitability[productKey]) {
          productProfitability[productKey] = {
            product: item.products?.generic_name || 'Unknown',
            brand: item.products?.brand,
            sku: item.products?.sku,
            revenue: 0,
            cogs: 0,
            grossProfit: 0,
            quantity: 0,
            transactions: 0
          };
        }

        productProfitability[productKey].revenue += netRevenue;
        productProfitability[productKey].cogs += cogs;
        productProfitability[productKey].grossProfit += grossProfit;
        productProfitability[productKey].quantity += item.qty;
        productProfitability[productKey].transactions += 1;
      });

      // Calculate margins
      Object.values(productProfitability).forEach((product: any) => {
        product.grossMargin = product.revenue > 0 ? (product.grossProfit / product.revenue * 100) : 0;
        product.avgSellingPrice = product.quantity > 0 ? product.revenue / product.quantity : 0;
        product.avgCostPrice = product.quantity > 0 ? product.cogs / product.quantity : 0;
      });

      const netRevenue = totalRevenue - totalDiscount;
      const grossProfit = netRevenue - totalCOGS;
      const grossMargin = netRevenue > 0 ? (grossProfit / netRevenue * 100) : 0;

      return {
        totalRevenue,
        totalDiscount,
        netRevenue,
        totalCOGS,
        grossProfit,
        grossMargin,
        productProfitability: Object.values(productProfitability)
          .sort((a: any, b: any) => b.grossProfit - a.grossProfit)
      };
    },
  });

  // Cash Flow Analysis (simplified)
  const { data: cashFlow, isLoading: cashFlowLoading } = useQuery({
    queryKey: ['cash-flow', period],
    queryFn: async () => {
      const daysBack = parseInt(period);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - daysBack);

      const { data: sales, error } = await supabase
        .from('sales')
        .select('total, date, payment_type')
        .gte('date', startDate.toISOString())
        .eq('status', 'completed')
        .order('date');

      if (error) throw error;

      // Group by payment method
      const paymentMethods = sales.reduce((acc, sale) => {
        acc[sale.payment_type] = (acc[sale.payment_type] || 0) + Number(sale.total);
        return acc;
      }, {} as Record<string, number>);

      // Daily cash flow
      const dailyCashFlow = sales.reduce((acc, sale) => {
        const date = new Date(sale.date).toISOString().split('T')[0];
        acc[date] = (acc[date] || 0) + Number(sale.total);
        return acc;
      }, {} as Record<string, number>);

      return {
        paymentMethods,
        dailyCashFlow: Object.entries(dailyCashFlow).map(([date, amount]) => ({
          date: new Date(date).toLocaleDateString(),
          amount
        }))
      };
    },
  });

  // Operating Expenses (mock data - would need expense tracking)
  const { data: expenses, isLoading: expensesLoading } = useQuery({
    queryKey: ['operating-expenses'],
    queryFn: async () => {
      // Mock expense data - in real app would track actual expenses
      return [
        { category: 'Rent', amount: 50000, percentage: 25 },
        { category: 'Salaries', amount: 80000, percentage: 40 },
        { category: 'Utilities', amount: 15000, percentage: 7.5 },
        { category: 'Insurance', amount: 10000, percentage: 5 },
        { category: 'Marketing', amount: 8000, percentage: 4 },
        { category: 'Other', amount: 37000, percentage: 18.5 }
      ];
    },
  });

  const profitabilityColumns = [
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
      key: 'revenue',
      header: 'Revenue',
      render: (item: any) => `KES ${item.revenue.toLocaleString()}`,
      className: 'text-right',
    },
    {
      key: 'cogs',
      header: 'COGS',
      render: (item: any) => `KES ${item.cogs.toLocaleString()}`,
      className: 'text-right',
    },
    {
      key: 'grossProfit',
      header: 'Gross Profit',
      render: (item: any) => (
        <div className={`font-medium ${item.grossProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
          KES {item.grossProfit.toLocaleString()}
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'grossMargin',
      header: 'Margin %',
      render: (item: any) => (
        <div className={`font-medium ${item.grossMargin >= 20 ? 'text-green-600' : item.grossMargin >= 10 ? 'text-orange-600' : 'text-red-600'}`}>
          {item.grossMargin.toFixed(1)}%
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'quantity',
      header: 'Qty Sold',
      className: 'text-right',
    },
  ];

  const expenseColumns = [
    { key: 'category', header: 'Category' },
    {
      key: 'amount',
      header: 'Amount',
      render: (item: any) => `KES ${item.amount.toLocaleString()}`,
      className: 'text-right',
    },
    {
      key: 'percentage',
      header: '% of Total',
      render: (item: any) => `${item.percentage}%`,
      className: 'text-right',
    },
  ];

  const paginatedProfitability = (financialSummary?.productProfitability || []).slice((profPage - 1) * PROF_PER_PAGE, profPage * PROF_PER_PAGE);
  const paginatedExpenses = (expenses || []).slice((expPage - 1) * EXP_PER_PAGE, expPage * EXP_PER_PAGE);
  const paginatedCashFlow = (cashFlow?.dailyCashFlow || []).slice((cfPage - 1) * CF_PER_PAGE, cfPage * CF_PER_PAGE);

  const cashFlowColumns = [
    { key: 'date', header: 'Date' },
    {
      key: 'amount',
      header: 'Cash In',
      render: (item: any) => `KES ${item.amount.toLocaleString()}`,
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
              <h1 className="text-2xl font-semibold text-gray-900 mt-1">Financial Report</h1>
              <p className="text-sm text-gray-600">Analyze profitability, costs, and financial performance</p>
            </div>
            <Button>Export Report</Button>
          </div>

          {/* Filters */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Select
                  label="Period"
                  value={period}
                  onChange={(e) => setPeriod(e.target.value)}
                  options={[
                    { label: 'Last 30 days', value: '30' },
                    { label: 'Last 90 days', value: '90' },
                    { label: 'Last 180 days', value: '180' },
                    { label: 'Last 365 days', value: '365' },
                  ]}
                />
                <Select
                  label="Group By"
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  options={[
                    { label: 'Product', value: 'product' },
                    { label: 'Category', value: 'category' },
                    { label: 'Supplier', value: 'supplier' },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          {/* Financial Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Total Revenue</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {summaryLoading ? '...' : `KES ${financialSummary?.totalRevenue.toLocaleString() || 0}`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">COGS</div>
                <div className="text-2xl font-semibold text-red-600">
                  {summaryLoading ? '...' : `KES ${financialSummary?.totalCOGS.toLocaleString() || 0}`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Gross Profit</div>
                <div className="text-2xl font-semibold text-green-600">
                  {summaryLoading ? '...' : `KES ${financialSummary?.grossProfit.toLocaleString() || 0}`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Gross Margin</div>
                <div className="text-2xl font-semibold text-blue-600">
                  {summaryLoading ? '...' : `${financialSummary?.grossMargin.toFixed(1) || 0}%`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Total Discounts</div>
                <div className="text-2xl font-semibold text-orange-600">
                  {summaryLoading ? '...' : `KES ${financialSummary?.totalDiscount.toLocaleString() || 0}`}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Product Profitability</h3>
                </CardHeader>
                <CardBody className="p-0">
                  <Table
                    data={paginatedProfitability}
                    columns={profitabilityColumns}
                    loading={summaryLoading}
                    emptyMessage="No profitability data available"
                  />
                  {!summaryLoading && (financialSummary?.productProfitability?.length || 0) > PROF_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        currentPage={profPage}
                        totalPages={Math.ceil((financialSummary?.productProfitability?.length || 0) / PROF_PER_PAGE)}
                        onPageChange={setProfPage}
                        totalItems={financialSummary?.productProfitability?.length || 0}
                        itemsPerPage={PROF_PER_PAGE}
                      />
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Operating Expenses</h3>
                </CardHeader>
                <CardBody className="p-0">
                  <Table
                    data={paginatedExpenses}
                    columns={expenseColumns}
                    loading={expensesLoading}
                    emptyMessage="No expense data available"
                  />
                  {!expensesLoading && (expenses?.length || 0) > EXP_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        currentPage={expPage}
                        totalPages={Math.ceil((expenses?.length || 0) / EXP_PER_PAGE)}
                        onPageChange={setExpPage}
                        totalItems={expenses?.length || 0}
                        itemsPerPage={EXP_PER_PAGE}
                      />
                    </div>
                  )}
                </CardBody>
              </Card>

              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Payment Methods</h3>
                </CardHeader>
                <CardBody>
                  {cashFlowLoading ? (
                    <div>Loading...</div>
                  ) : (
                    <>
                      <div className="space-y-2 mb-4">
                        {Object.entries(cashFlow?.paymentMethods || {}).map(([method, amount]) => (
                          <div key={method} className="flex justify-between text-sm">
                            <span className="capitalize">{method}:</span>
                            <span className="font-medium">KES {(amount as number).toLocaleString()}</span>
                          </div>
                        ))}
                      </div>
                      <Table
                        data={paginatedCashFlow}
                        columns={cashFlowColumns}
                        loading={false}
                        emptyMessage="No cash flow data"
                      />
                      {(cashFlow?.dailyCashFlow?.length || 0) > CF_PER_PAGE && (
                        <div className="px-6 py-4 border-t border-gray-200">
                          <Pagination
                            currentPage={cfPage}
                            totalPages={Math.ceil((cashFlow?.dailyCashFlow?.length || 0) / CF_PER_PAGE)}
                            onPageChange={setCfPage}
                            totalItems={cashFlow?.dailyCashFlow?.length || 0}
                            itemsPerPage={CF_PER_PAGE}
                          />
                        </div>
                      )}
                    </>
                  )}
                </CardBody>
              </Card>
            </div>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}