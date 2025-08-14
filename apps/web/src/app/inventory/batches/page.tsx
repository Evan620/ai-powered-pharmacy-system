'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useState, useMemo } from 'react';
import Link from 'next/link';

const ITEMS_PER_PAGE = 15;

export default function BatchesPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: batches = [], isLoading, error } = useQuery({
    queryKey: ['batches'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select(`
          *,
          products (
            generic_name,
            brand,
            sku
          )
        `)
        .order('expiry_date');

      if (error) throw error;
      return data;
    },
  });

  const filteredBatches = useMemo(() => {
    if (!searchTerm) return batches;

    const term = searchTerm.toLowerCase();
    return batches.filter(batch =>
      batch.batch_no.toLowerCase().includes(term) ||
      batch.products?.generic_name.toLowerCase().includes(term) ||
      batch.products?.sku.toLowerCase().includes(term)
    );
  }, [batches, searchTerm]);

  const paginatedBatches = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredBatches.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredBatches, currentPage]);

  const totalPages = Math.ceil(filteredBatches.length / ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const getExpiryStatus = (expiryDate: string) => {
    const daysUntilExpiry = Math.ceil(
      (new Date(expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysUntilExpiry <= 0) return { status: 'expired', color: 'bg-red-100 text-red-800', label: 'Expired' };
    if (daysUntilExpiry <= 30) return { status: 'expiring', color: 'bg-orange-100 text-orange-800', label: 'Expiring Soon' };
    return { status: 'good', color: 'bg-green-100 text-green-800', label: 'Good' };
  };

  const columns = [
    {
      key: 'batch_no',
      header: 'Batch Number',
      render: (batch: any) => (
        <div className="font-mono text-sm font-medium">
          {batch.batch_no}
        </div>
      ),
    },
    {
      key: 'product',
      header: 'Product',
      render: (batch: any) => (
        <div>
          <div className="font-medium text-gray-900">
            {batch.products?.generic_name}
          </div>
          {batch.products?.brand && (
            <div className="text-sm text-gray-500">
              Brand: {batch.products.brand}
            </div>
          )}
          <div className="text-xs text-gray-500 font-mono">
            SKU: {batch.products?.sku}
          </div>
        </div>
      ),
    },
    {
      key: 'expiry_date',
      header: 'Expiry Date',
      render: (batch: any) => {
        const expiryStatus = getExpiryStatus(batch.expiry_date);
        const daysUntilExpiry = Math.ceil(
          (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
        );
        
        return (
          <div>
            <div className="text-sm font-medium">
              {new Date(batch.expiry_date).toLocaleDateString()}
            </div>
            <div className={`inline-flex px-2 py-1 text-xs rounded-full ${expiryStatus.color}`}>
              {expiryStatus.label}
            </div>
            {daysUntilExpiry > 0 && (
              <div className="text-xs text-gray-500 mt-1">
                {daysUntilExpiry} days left
              </div>
            )}
          </div>
        );
      },
    },
    {
      key: 'quantity',
      header: 'Quantity',
      render: (batch: any) => (
        <div className="text-sm">
          <div className="font-medium">
            {batch.qty_available} / {batch.qty_received}
          </div>
          <div className="text-gray-500">
            Available / Received
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className="bg-blue-600 h-2 rounded-full" 
              style={{ 
                width: `${(batch.qty_available / batch.qty_received) * 100}%` 
              }}
            />
          </div>
        </div>
      ),
    },
    {
      key: 'cost_price',
      header: 'Cost Price',
      render: (batch: any) => (
        <div className="font-medium">
          KES {batch.cost_price.toLocaleString()}
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (batch: any) => (
        <div className="flex items-center gap-2">
          <Link href={`/inventory/batches/${batch.id}`}>
            <Button size="sm" variant="secondary">
              View
            </Button>
          </Link>
        </div>
      ),
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
              <h1 className="text-2xl font-semibold text-gray-900">Batches</h1>
              <p className="text-sm text-gray-600 mt-1">
                Track inventory batches and expiry dates
              </p>
            </div>
            <Link href="/inventory/batches/new">
              <Button>Add Batch</Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search by batch number, product name, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
                {searchTerm && (
                  <div className="text-sm text-gray-500">
                    {filteredBatches.length} of {batches.length} batches
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Batches Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  {isLoading ? 'Loading...' : `${filteredBatches.length} Batches`}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {error ? (
                <div className="text-center py-12">
                  <div className="text-red-600 mb-2">Failed to load batches</div>
                  <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <Table
                    data={paginatedBatches}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage={
                      searchTerm 
                        ? 'No batches match your search.' 
                        : 'No batches yet. Add your first batch to get started.'
                    }
                  />
                  
                  {!isLoading && filteredBatches.length > ITEMS_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredBatches.length}
                        itemsPerPage={ITEMS_PER_PAGE}
                      />
                    </div>
                  )}
                </>
              )}
            </CardBody>
          </Card>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

