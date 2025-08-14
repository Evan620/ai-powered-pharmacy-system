'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { CardSkeleton } from '@/components/ui/LoadingSkeleton';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useSupplier } from '@/hooks/useSuppliers';
import { useToastContext } from '@/contexts/ToastContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function SupplierDetailsPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const { data: supplier, isLoading, error } = useSupplier(id);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('suppliers')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Supplier deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });

      setTimeout(() => {
        router.push('/suppliers');
      }, 500);
    },
    onError: (error: any) => {
      toast.error('Failed to delete supplier. Please try again.');
    },
  });

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="p-6 space-y-6">
            <div>
              <Link href="/suppliers" className="text-sm text-brand-700 hover:underline">
                ← Back to Suppliers
              </Link>
              <div className="h-6 w-48 bg-slate-100 rounded mt-1 animate-pulse" />
            </div>
            <CardSkeleton />
          </div>
        </AppShell>
      </ProtectedRoute>
    );
  }

  if (error || !supplier) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="p-6 space-y-4">
            <div>
              <Link href="/suppliers" className="text-sm text-brand-700 hover:underline">
                ← Back to Suppliers
              </Link>
              <h1 className="text-lg font-semibold mt-1">Supplier Details</h1>
            </div>
            <Card>
              <CardBody>
                <div className="text-center py-8">
                  <div className="text-sm text-red-600 mb-2">
                    {error ? 'Failed to load supplier' : 'Supplier not found'}
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => window.location.reload()}>
                    Retry
                  </Button>
                </div>
              </CardBody>
            </Card>
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
              <Link href="/suppliers" className="text-sm text-brand-700 hover:underline">
                ← Back to Suppliers
              </Link>
              <h1 className="text-lg font-semibold mt-1">{supplier.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link href={`/suppliers/${id}/edit`}>
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

          {/* Supplier Details */}
          <Card>
            <CardHeader>Supplier Information</CardHeader>
            <CardBody>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
                <div>
                  <span className="text-slate-500">Name</span>
                  <div className="font-medium text-slate-900 mt-1">{supplier.name}</div>
                </div>
                <div>
                  <span className="text-slate-500">Contact</span>
                  <div className="font-medium text-slate-900 mt-1">
                    {supplier.contact || 'Not provided'}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Lead Time</span>
                  <div className="font-medium text-slate-900 mt-1">{supplier.lead_time_days} days</div>
                </div>
                <div>
                  <span className="text-slate-500">Minimum Order</span>
                  <div className="font-medium text-slate-900 mt-1">
                    KES {supplier.min_order.toLocaleString()}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Created</span>
                  <div className="font-medium text-slate-900 mt-1">
                    {new Date(supplier.created_at).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </CardBody>
          </Card>

          {/* Delete Confirmation Modal */}
          {showDeleteConfirm && (
            <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                <h3 className="text-lg font-semibold mb-2">Delete Supplier</h3>
                <p className="text-sm text-slate-600 mb-4">
                  Are you sure you want to delete "{supplier.name}"? This action cannot be undone.
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

