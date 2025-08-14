'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useToastContext } from '@/contexts/ToastContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';

function NewBatchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const toast = useToastContext();
  const preselectedProductId = searchParams.get('product_id');
  
  const [formData, setFormData] = useState({
    product_id: preselectedProductId || '',
    batch_no: '',
    expiry_date: '',
    qty_received: '',
    qty_available: '',
    supplier_id: '',
    cost_price: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load products for selection
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('id, generic_name, brand, sku')
        .eq('active', true)
        .order('generic_name');
      
      if (error) throw error;
      return data;
    },
  });

  // Load suppliers for selection
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('suppliers')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Auto-set qty_available when qty_received changes
  useEffect(() => {
    if (formData.qty_received && !formData.qty_available) {
      setFormData(prev => ({ ...prev, qty_available: prev.qty_received }));
    }
  }, [formData.qty_received, formData.qty_available]);

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('batches')
        .insert({
          ...data,
          qty_received: parseInt(data.qty_received),
          qty_available: parseInt(data.qty_available),
          cost_price: parseFloat(data.cost_price),
          supplier_id: data.supplier_id || null,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Batch created successfully!');
      queryClient.invalidateQueries({ queryKey: ['batches'] });
      queryClient.invalidateQueries({ queryKey: ['product-batches'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-stats'] });

      // Small delay to show the toast before navigating
      setTimeout(() => {
        router.push('/inventory/batches');
      }, 500);
    },
    onError: (error: any) => {
      setErrors({ general: error.message });
      toast.error('Failed to create batch. Please try again.');
    },
  });

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.product_id) newErrors.product_id = 'Product is required';
    if (!formData.batch_no.trim()) newErrors.batch_no = 'Batch number is required';
    if (!formData.expiry_date) newErrors.expiry_date = 'Expiry date is required';
    if (!formData.qty_received.trim()) newErrors.qty_received = 'Quantity received is required';
    else if (isNaN(parseInt(formData.qty_received)) || parseInt(formData.qty_received) <= 0) {
      newErrors.qty_received = 'Quantity received must be a positive number';
    }
    if (!formData.qty_available.trim()) newErrors.qty_available = 'Quantity available is required';
    else if (isNaN(parseInt(formData.qty_available)) || parseInt(formData.qty_available) < 0) {
      newErrors.qty_available = 'Quantity available must be a non-negative number';
    }
    if (!formData.cost_price.trim()) newErrors.cost_price = 'Cost price is required';
    else if (isNaN(parseFloat(formData.cost_price)) || parseFloat(formData.cost_price) <= 0) {
      newErrors.cost_price = 'Cost price must be a positive number';
    }
    
    // Check if expiry date is in the future
    if (formData.expiry_date && new Date(formData.expiry_date) <= new Date()) {
      newErrors.expiry_date = 'Expiry date must be in the future';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      createMutation.mutate(formData);
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-6 space-y-6">
          {/* Header */}
          <div>
            <Link href="/inventory/batches" className="text-sm text-brand-700 hover:underline">
              ← Back to Batches
            </Link>
            <h1 className="text-lg font-semibold mt-1">Add New Batch</h1>
          </div>

          <div className="max-w-2xl">
            <Card>
              <CardHeader>Batch Information</CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.general && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                      {errors.general}
                    </div>
                  )}

                  <Select
                    label="Product *"
                    value={formData.product_id}
                    onChange={(e) => handleChange('product_id', e.target.value)}
                    error={errors.product_id}
                    options={[
                      { label: 'Select product...', value: '' },
                      ...products.map(product => ({
                        label: `${product.generic_name} ${product.brand ? `(${product.brand})` : ''} - ${product.sku}`,
                        value: product.id
                      }))
                    ]}
                    required
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Batch Number *"
                      placeholder="e.g., A12345"
                      value={formData.batch_no}
                      onChange={(e) => handleChange('batch_no', e.target.value.toUpperCase())}
                      error={errors.batch_no}
                      required
                    />
                    <Input
                      label="Expiry Date *"
                      type="date"
                      value={formData.expiry_date}
                      onChange={(e) => handleChange('expiry_date', e.target.value)}
                      error={errors.expiry_date}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Quantity Received *"
                      type="number"
                      placeholder="0"
                      value={formData.qty_received}
                      onChange={(e) => handleChange('qty_received', e.target.value)}
                      error={errors.qty_received}
                      required
                    />
                    <Input
                      label="Quantity Available *"
                      type="number"
                      placeholder="0"
                      value={formData.qty_available}
                      onChange={(e) => handleChange('qty_available', e.target.value)}
                      error={errors.qty_available}
                      hint="Usually same as received quantity"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Cost Price (KES) *"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.cost_price}
                      onChange={(e) => handleChange('cost_price', e.target.value)}
                      error={errors.cost_price}
                      required
                    />
                    <Select
                      label="Supplier"
                      value={formData.supplier_id}
                      onChange={(e) => handleChange('supplier_id', e.target.value)}
                      options={[
                        { label: 'Select supplier...', value: '' },
                        ...suppliers.map(supplier => ({
                          label: supplier.name,
                          value: supplier.id
                        }))
                      ]}
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create Batch'}
                    </Button>
                    <Link href="/inventory/batches">
                      <Button variant="secondary">Cancel</Button>
                    </Link>
                  </div>
                </form>
              </CardBody>
            </Card>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

export default function NewBatchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <NewBatchContent />
    </Suspense>
  );
}
