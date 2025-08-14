'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToastContext } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function ProductDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['product-batches', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('batches')
        .select('*')
        .eq('product_id', id)
        .order('expiry_date');
      
      if (error) throw error;
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });

      setTimeout(() => {
        router.push('/inventory/products');
      }, 500);
    },
    onError: (error: any) => {
      toast.error('Failed to delete product. Please try again.');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async (active: boolean) => {
      const { error } = await supabase
        .from('products')
        .update({ active })
        .eq('id', id);

      if (error) throw error;
      return active;
    },
    onSuccess: (active) => {
      toast.success(`Product ${active ? 'activated' : 'deactivated'} successfully!`);
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });
    },
    onError: (error: any) => {
      toast.error('Failed to update product status. Please try again.');
    },
  });

  const totalStock = batches.reduce((sum, batch) => sum + batch.qty_available, 0);
  const expiringBatches = batches.filter(batch => {
    const daysUntilExpiry = Math.ceil(
      (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="p-6 space-y-6">
            <div>
              <Link href="/inventory/products" className="text-sm text-brand-700 hover:underline">
                ← Back to Products
              </Link>
              <div className="h-6 w-48 bg-slate-100 rounded mt-1 animate-pulse" />
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <CardSkeleton />
                <CardSkeleton />
              </div>
              <div className="space-y-6">
                <CardSkeleton />
              </div>
            </div>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (!product) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="p-6">
            <div className="text-center py-12">Product not found</div>
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <Link href="/inventory/products" className="text-sm text-brand-700 hover:underline">
                ← Back to Products
              </Link>
              <h1 className="text-lg font-semibold mt-1">{product.generic_name}</h1>
              {product.brand && <p className="text-sm text-slate-500">{product.brand}</p>}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => toggleActiveMutation.mutate(!product.active)}
                disabled={toggleActiveMutation.isPending}
              >
                {product.active ? 'Deactivate' : 'Activate'}
              </Button>
              <Link href={`/inventory/products/${id}/edit`}>
                <Button variant="secondary" size="sm">Edit</Button>
              </Link>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-700"
              >
                Delete
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Product Details */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>Product Information</CardHeader>
                <CardBody>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">SKU</span>
                      <div className="font-medium">{product.sku}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Generic Name</span>
                      <div className="font-medium">{product.generic_name}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Brand</span>
                      <div className="font-medium">{product.brand || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Form</span>
                      <div className="font-medium">{product.form}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Unit</span>
                      <div className="font-medium">{product.unit}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Sell Price</span>
                      <div className="font-medium">KES {product.sell_price.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Barcode</span>
                      <div className="font-medium">{product.barcode || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-slate-500">Status</span>
                      <div className={`font-medium ${product.active ? 'text-green-600' : 'text-red-600'}`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </div>
                    </div>
                  </div>
                </CardBody>
              </Card>

              {/* Batches */}
              <Card>
                <CardHeader className="flex items-center justify-between">
                  <span>Batches ({batches.length})</span>
                  <Link href={`/inventory/batches/new?product_id=${id}`}>
                    <Button size="sm">Add Batch</Button>
                  </Link>
                </CardHeader>
                <CardBody>
                  {batches.length === 0 ? (
                    <div className="text-center py-8 text-sm text-slate-500">
                      No batches yet. Add a batch to track inventory.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {batches.map((batch) => {
                        const daysUntilExpiry = Math.ceil(
                          (new Date(batch.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                        );
                        const isExpiring = daysUntilExpiry <= 30 && daysUntilExpiry > 0;
                        const isExpired = daysUntilExpiry <= 0;
                        
                        return (
                          <Link
                            key={batch.id}
                            href={`/inventory/batches/${batch.id}`}
                            className="block p-3 rounded-md border border-gray-100 hover:bg-gray-50"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="font-medium">Batch {batch.batch_no}</div>
                                <div className="text-sm text-slate-500">
                                  Expires: {new Date(batch.expiry_date).toLocaleDateString()}
                                  {isExpired && <span className="text-red-600 ml-2">(Expired)</span>}
                                  {isExpiring && <span className="text-orange-600 ml-2">(Expiring Soon)</span>}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-medium">{batch.qty_available} units</div>
                                <div className="text-sm text-slate-500">
                                  Cost: KES {batch.cost_price.toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  )}
                </CardBody>
              </Card>
            </div>

            {/* Stock Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>Stock Summary</CardHeader>
                <CardBody>
                  <div className="space-y-4">
                    <div>
                      <div className="text-2xl font-bold text-slate-900">{totalStock}</div>
                      <div className="text-sm text-slate-500">Total Units Available</div>
                    </div>
                    <div>
                      <div className="text-lg font-semibold text-orange-600">{expiringBatches.length}</div>
                      <div className="text-sm text-slate-500">Batches Expiring Soon</div>
                    </div>
                  </div>
                </CardBody>
              </Card>
            </div>
          </div>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-2">Delete Product</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Are you sure you want to delete "{product.generic_name}"? This action cannot be undone.
                </p>
                <div className="flex items-center gap-2 justify-end">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => {
                      deleteMutation.mutate();
                      setShowDeleteConfirm(false);
                    }}
                    disabled={deleteMutation.isPending}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}
