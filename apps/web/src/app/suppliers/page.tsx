'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSuppliers } from '@/hooks/useSuppliers';
import { useState, useMemo } from 'react';
import Link from 'next/link';

const ITEMS_PER_PAGE = 15;

export default function SuppliersPage() {
  const { data: suppliers = [], isLoading, error } = useSuppliers();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredSuppliers = useMemo(() => {
    if (!searchTerm) return suppliers;

    const term = searchTerm.toLowerCase();
    return suppliers.filter(supplier =>
      supplier.name.toLowerCase().includes(term) ||
      supplier.contact?.toLowerCase().includes(term)
    );
  }, [suppliers, searchTerm]);

  const paginatedSuppliers = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSuppliers.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredSuppliers, currentPage]);

  const totalPages = Math.ceil(filteredSuppliers.length / ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const columns = [
    {
      key: 'name',
      header: 'Supplier Name',
      render: (supplier: any) => (
        <div className="font-medium text-gray-900">
          {supplier.name}
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact Information',
      render: (supplier: any) => (
        <div className="text-sm">
          {supplier.contact ? (
            <div className="text-gray-900">{supplier.contact}</div>
          ) : (
            <div className="text-gray-500 italic">No contact provided</div>
          )}
        </div>
      ),
    },
    {
      key: 'lead_time_days',
      header: 'Lead Time',
      render: (supplier: any) => (
        <div className="text-sm">
          <span className="font-medium">{supplier.lead_time_days}</span>
          <span className="text-gray-500 ml-1">days</span>
        </div>
      ),
    },
    {
      key: 'min_order',
      header: 'Minimum Order',
      render: (supplier: any) => (
        <div className="font-medium">
          KES {supplier.min_order.toLocaleString()}
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'created_at',
      header: 'Added',
      render: (supplier: any) => (
        <div className="text-sm text-gray-500">
          {new Date(supplier.created_at).toLocaleDateString()}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (supplier: any) => (
        <div className="flex items-center gap-2">
          <Link href={`/suppliers/${supplier.id}`}>
            <Button size="sm" variant="secondary">
              View
            </Button>
          </Link>
          <Link href={`/suppliers/${supplier.id}/edit`}>
            <Button size="sm" variant="secondary">
              Edit
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
              <h1 className="text-2xl font-semibold text-gray-900">Suppliers</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your pharmacy suppliers and vendors
              </p>
            </div>
            <Link href="/suppliers/new">
              <Button>Add Supplier</Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search by name or contact information..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
                {searchTerm && (
                  <div className="text-sm text-gray-500">
                    {filteredSuppliers.length} of {suppliers.length} suppliers
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Suppliers Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  {isLoading ? 'Loading...' : `${filteredSuppliers.length} Suppliers`}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {error ? (
                <div className="text-center py-12">
                  <div className="text-red-600 mb-2">Failed to load suppliers</div>
                  <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <Table
                    data={paginatedSuppliers}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage={
                      searchTerm 
                        ? 'No suppliers match your search.' 
                        : 'No suppliers yet. Add your first supplier to get started.'
                    }
                  />
                  
                  {!isLoading && filteredSuppliers.length > ITEMS_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredSuppliers.length}
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

