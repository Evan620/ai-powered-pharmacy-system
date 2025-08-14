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
import { exportToCSV } from '@/lib/csv';
import Link from 'next/link';

export default function InventoryReportPage() {
  const [sortBy, setSortBy] = useState('value'); // value, quantity, name
  const [filterBy, setFilterBy] = useState('all'); // all, low-stock, out-of-stock
  const [invPage, setInvPage] = useState(1);
  const INV_PER_PAGE = 20;
  const [movPage, setMovPage] = useState(1);
  const MOV_PER_PAGE = 10;

  // Inventory Summary Query
  const { data: inventorySummary, isLoading: summaryLoading, error: summaryError } = useQuery({
    queryKey: ['inventory-summary'],
    queryFn: async () => {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select(`
          id,
          generic_name,
          brand,
          sku,
          sell_price,
          active,
          batches (
            qty_available,
            cost_price,
            expiry_date
          )
        `)
        .eq('active', true)
        .eq('pharmacy_id', (await supabase.rpc('current_user_pharmacy_id')).data);

      if (productsError) throw productsError;

      // Transform the data to handle array relationships
      const transformedProducts = transformSupabaseRelationships(products || [], ['batches']);

      let totalProducts = 0;
      let totalValue = 0;
      let totalCostValue = 0;
      let lowStockCount = 0;
      let outOfStockCount = 0;

      const inventoryData = transformedProducts.map((product: any) => {
        const totalQty = product.batches.reduce((sum, batch) => sum + batch.qty_available, 0);
        const avgCostPrice = product.batches.length > 0 
          ? product.batches.reduce((sum, batch) => sum + batch.cost_price, 0) / product.batches.length 
          : 0;
        
        const stockValue = totalQty * product.sell_price;
        const costValue = totalQty * avgCostPrice;

        totalProducts++;
        totalValue += stockValue;
        totalCostValue += costValue;

        if (totalQty === 0) outOfStockCount++;
        else if (totalQty <= 50) lowStockCount++; // Low stock threshold

        // Check for expiring batches (next 30 days)
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        const expiringBatches = product.batches.filter(batch => 
          new Date(batch.expiry_date) <= thirtyDaysFromNow && batch.qty_available > 0
        );

        return {
          id: product.id,
          product: product.generic_name,
          brand: product.brand,
          sku: product.sku,
          totalQty,
          sellPrice: product.sell_price,
          avgCostPrice,
          stockValue,
          costValue,
          profitMargin: avgCostPrice > 0 ? ((product.sell_price - avgCostPrice) / product.sell_price * 100) : 0,
          batchCount: product.batches.length,
          expiringBatches: expiringBatches.length,
          status: totalQty === 0 ? 'out-of-stock' : totalQty <= 50 ? 'low-stock' : 'in-stock'
        };
      });

      return {
        totalProducts,
        totalValue,
        totalCostValue,
        lowStockCount,
        outOfStockCount,
        profitMargin: totalCostValue > 0 ? ((totalValue - totalCostValue) / totalValue * 100) : 0,
        inventoryData
      };
    },
  });

  // Stock Movement Query (simplified - would need stock_movements table for full implementation)
  const { data: stockMovements, isLoading: movementsLoading } = useQuery({
    queryKey: ['stock-movements'],
    queryFn: async () => {
      // This is a simplified version - in a real app you'd have a stock_movements table
      const { data, error } = await supabase
        .from('sale_items')
        .select(`
          qty,
          created_at,
          products (generic_name, sku),
          sales (date)
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      // Transform the data to handle array relationships
      const transformedMovements = transformSupabaseRelationships(data || [], ['products', 'sales']);

      return transformedMovements.map((item: any) => ({
        date: new Date(item.sales?.date || item.created_at).toLocaleDateString(),
        product: item.products?.generic_name || 'Unknown',
        sku: item.products?.sku || 'N/A',
        type: 'OUT', // Sale
        quantity: item.qty,
        reason: 'Sale'
      }));
    },
  });

  // Filter and sort inventory data
  const filteredInventory = inventorySummary?.inventoryData
    ?.filter(item => {
      if (filterBy === 'low-stock') return item.status === 'low-stock';
      if (filterBy === 'out-of-stock') return item.status === 'out-of-stock';
      return true;
    })
    ?.sort((a, b) => {
      if (sortBy === 'value') return b.stockValue - a.stockValue;
      if (sortBy === 'quantity') return b.totalQty - a.totalQty;
      if (sortBy === 'name') return a.product.localeCompare(b.product);
      return 0;
    }) || [];

  const paginatedInventory = filteredInventory.slice((invPage - 1) * INV_PER_PAGE, invPage * INV_PER_PAGE);
  const paginatedMovements = (stockMovements || []).slice((movPage - 1) * MOV_PER_PAGE, movPage * MOV_PER_PAGE);

  const inventoryColumns = [
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
      header: 'Stock Qty',
      render: (item: any) => (
        <div className={`font-medium ${
          item.status === 'out-of-stock' ? 'text-red-600' :
          item.status === 'low-stock' ? 'text-orange-600' : 'text-green-600'
        }`}>
          {item.totalQty}
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'stockValue',
      header: 'Stock Value',
      render: (item: any) => `KES ${item.stockValue.toLocaleString()}`,
      className: 'text-right',
    },
    {
      key: 'profitMargin',
      header: 'Margin %',
      render: (item: any) => `${item.profitMargin.toFixed(1)}%`,
      className: 'text-right',
    },
    {
      key: 'batchCount',
      header: 'Batches',
      className: 'text-right',
    },
    {
      key: 'expiringBatches',
      header: 'Expiring',
      render: (item: any) => (
        <div className={item.expiringBatches > 0 ? 'text-orange-600 font-medium' : 'text-gray-500'}>
          {item.expiringBatches}
        </div>
      ),
      className: 'text-right',
    },
  ];

  const movementColumns = [
    { key: 'date', header: 'Date' },
    {
      key: 'product',
      header: 'Product',
      render: (item: any) => (
        <div>
          <div className="font-medium">{item.product}</div>
          <div className="text-xs text-gray-400">{item.sku}</div>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (item: any) => (
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.type === 'IN' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {item.type}
        </span>
      ),
    },
    { key: 'quantity', header: 'Qty', className: 'text-right' },
    { key: 'reason', header: 'Reason' },
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
              <h1 className="text-2xl font-semibold text-gray-900 mt-1">Inventory Report</h1>
              <p className="text-sm text-gray-600">Monitor stock levels, movements, and valuation</p>
            </div>
            <Button onClick={() => {
              const headers = ['Product','Brand','SKU','Qty','Stock Value','Profit Margin %','Batches','Expiring'];
              const rows = filteredInventory.map((item: any) => [
                item.product,
                item.brand || '',
                item.sku || '',
                item.totalQty,
                item.stockValue,
                item.profitMargin.toFixed(1),
                item.batchCount,
                item.expiringBatches,
              ]);
              exportToCSV(`inventory-report-${new Date().toISOString().slice(0,10)}`, headers, rows);
            }}>Export Report</Button>
          </div>

          {/* Filters */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Select
                  label="Filter By"
                  value={filterBy}
                  onChange={(e) => setFilterBy(e.target.value)}
                  options={[
                    { label: 'All Products', value: 'all' },
                    { label: 'Low Stock Only', value: 'low-stock' },
                    { label: 'Out of Stock Only', value: 'out-of-stock' },
                  ]}
                />
                <Select
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  options={[
                    { label: 'Stock Value', value: 'value' },
                    { label: 'Quantity', value: 'quantity' },
                    { label: 'Product Name', value: 'name' },
                  ]}
                />
              </div>
            </CardBody>
          </Card>

          {/* Error State */}
          {summaryError && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <h3 className="text-red-800 font-medium">Failed to load inventory data</h3>
              <p className="text-red-600 text-sm mt-1">{summaryError.message}</p>
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Total Products</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {summaryLoading ? '...' : inventorySummary?.totalProducts.toLocaleString() || 0}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Stock Value</div>
                <div className="text-2xl font-semibold text-gray-900">
                  {summaryLoading ? '...' : `KES ${inventorySummary?.totalValue.toLocaleString() || 0}`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Profit Margin</div>
                <div className="text-2xl font-semibold text-green-600">
                  {summaryLoading ? '...' : `${inventorySummary?.profitMargin.toFixed(1) || 0}%`}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Low Stock</div>
                <div className="text-2xl font-semibold text-orange-600">
                  {summaryLoading ? '...' : inventorySummary?.lowStockCount || 0}
                </div>
              </CardBody>
            </Card>
            <Card>
              <CardBody>
                <div className="text-sm text-gray-600">Out of Stock</div>
                <div className="text-2xl font-semibold text-red-600">
                  {summaryLoading ? '...' : inventorySummary?.outOfStockCount || 0}
                </div>
              </CardBody>
            </Card>
          </div>

          {/* Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <h3 className="text-lg font-medium">Current Inventory</h3>
                </CardHeader>
                <CardBody className="p-0">
                  <Table
                    data={paginatedInventory}
                    columns={inventoryColumns}
                    loading={summaryLoading}
                    emptyMessage="No inventory data available"
                  />
                  {!summaryLoading && filteredInventory.length > INV_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        currentPage={invPage}
                        totalPages={Math.ceil(filteredInventory.length / INV_PER_PAGE)}
                        onPageChange={setInvPage}
                        totalItems={filteredInventory.length}
                        itemsPerPage={INV_PER_PAGE}
                      />
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <h3 className="text-lg font-medium">Recent Stock Movements</h3>
              </CardHeader>
              <CardBody className="p-0">
                <Table
                  data={paginatedMovements}
                  columns={movementColumns}
                  loading={movementsLoading}
                  emptyMessage="No stock movements available"
                />
                {!movementsLoading && (stockMovements?.length || 0) > MOV_PER_PAGE && (
                  <div className="px-6 py-4 border-t border-gray-200">
                    <Pagination
                      currentPage={movPage}
                      totalPages={Math.ceil((stockMovements?.length || 0) / MOV_PER_PAGE)}
                      onPageChange={setMovPage}
                      totalItems={stockMovements?.length || 0}
                      itemsPerPage={MOV_PER_PAGE}
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