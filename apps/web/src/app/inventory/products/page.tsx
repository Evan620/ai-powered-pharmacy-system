'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Table, Pagination } from '@/components/ui/Table';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useProducts } from '@/hooks/useProducts';
import { useState, useMemo } from 'react';
import Link from 'next/link';

const ITEMS_PER_PAGE = 20;

export default function ProductsPage() {
  const { data: products = [], isLoading, error } = useProducts();
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredProducts = useMemo(() => {
    if (!searchTerm) return products;

    const term = searchTerm.toLowerCase();
    return products.filter(product =>
      product.generic_name.toLowerCase().includes(term) ||
      product.brand?.toLowerCase().includes(term) ||
      product.sku.toLowerCase().includes(term)
    );
  }, [products, searchTerm]);

  const paginatedProducts = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  useMemo(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  const columns = [
    {
      key: 'sku',
      header: 'SKU',
      render: (product: any) => (
        <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded w-fit">
          {product.sku}
        </div>
      ),
    },
    {
      key: 'generic_name',
      header: 'Product Name',
      render: (product: any) => (
        <div>
          <div className="font-medium text-gray-900">{product.generic_name}</div>
          {product.brand && (
            <div className="text-sm text-gray-500">Brand: {product.brand}</div>
          )}
        </div>
      ),
    },
    {
      key: 'form',
      header: 'Form & Unit',
      render: (product: any) => (
        <div className="text-sm">
          <div className="capitalize">{product.form}</div>
          <div className="text-gray-500">{product.unit}</div>
        </div>
      ),
    },
    {
      key: 'sell_price',
      header: 'Price',
      render: (product: any) => (
        <div className="font-medium">
          KES {product.sell_price.toLocaleString()}
        </div>
      ),
      className: 'text-right',
    },
    {
      key: 'active',
      header: 'Status',
      render: (product: any) => (
        <div className={`inline-flex px-2 py-1 text-xs rounded-full ${
          product.active 
            ? 'bg-green-100 text-green-800' 
            : 'bg-red-100 text-red-800'
        }`}>
          {product.active ? 'Active' : 'Inactive'}
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (product: any) => (
        <div className="flex items-center gap-2">
          <Link href={`/inventory/products/${product.id}`}>
            <Button size="sm" variant="secondary">
              View
            </Button>
          </Link>
          <Link href={`/inventory/products/${product.id}/edit`}>
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
              <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
              <p className="text-sm text-gray-600 mt-1">
                Manage your pharmacy inventory
              </p>
            </div>
            <Link href="/inventory/products/new">
              <Button>Add Product</Button>
            </Link>
          </div>

          {/* Search and Filters */}
          <Card>
            <CardBody>
              <div className="flex items-center gap-4">
                <Input
                  placeholder="Search by name, brand, or SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="max-w-md"
                />
                {searchTerm && (
                  <div className="text-sm text-gray-500">
                    {filteredProducts.length} of {products.length} products
                  </div>
                )}
              </div>
            </CardBody>
          </Card>

          {/* Products Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">
                  {isLoading ? 'Loading...' : `${filteredProducts.length} Products`}
                </h2>
              </div>
            </CardHeader>
            <CardBody className="p-0">
              {error ? (
                <div className="text-center py-12">
                  <div className="text-red-600 mb-2">Failed to load products</div>
                  <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              ) : (
                <>
                  <Table
                    data={paginatedProducts}
                    columns={columns}
                    loading={isLoading}
                    emptyMessage={
                      searchTerm 
                        ? 'No products match your search.' 
                        : 'No products yet. Add your first product to get started.'
                    }
                  />
                  
                  {!isLoading && filteredProducts.length > ITEMS_PER_PAGE && (
                    <div className="px-6 py-4 border-t border-gray-200">
                      <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        totalItems={filteredProducts.length}
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

