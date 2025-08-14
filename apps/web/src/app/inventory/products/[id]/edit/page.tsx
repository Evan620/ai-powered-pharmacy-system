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
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import Link from 'next/link';

export default function EditProductPage({ params }: { params: { id: string } }) {
  const { id } = params;
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToastContext();
  
  const [formData, setFormData] = useState({
    sku: '',
    generic_name: '',
    brand: '',
    form: '',
    unit: '',
    barcode: '',
    sell_price: '',
    tax_code: '',
    active: true
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

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

  // Populate form when product loads
  useEffect(() => {
    if (product) {
      setFormData({
        sku: product.sku,
        generic_name: product.generic_name,
        brand: product.brand || '',
        form: product.form,
        unit: product.unit,
        barcode: product.barcode || '',
        sell_price: product.sell_price.toString(),
        tax_code: product.tax_code || '',
        active: product.active
      });
    }
  }, [product]);

  const updateMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('products')
        .update({
          ...data,
          sell_price: parseFloat(data.sell_price),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Product updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      setTimeout(() => {
        router.push(`/inventory/products/${id}`);
      }, 500);
    },
    onError: (error: any) => {
      if (error.code === '23505') {
        setErrors({ sku: 'SKU already exists' });
        toast.error('SKU already exists. Please use a different SKU.');
      } else {
        setErrors({ general: error.message });
        toast.error('Failed to update product. Please try again.');
      }
    },
  });

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.sku.trim()) newErrors.sku = 'SKU is required';
    if (!formData.generic_name.trim()) newErrors.generic_name = 'Generic name is required';
    if (!formData.form.trim()) newErrors.form = 'Form is required';
    if (!formData.unit.trim()) newErrors.unit = 'Unit is required';
    if (!formData.sell_price.trim()) newErrors.sell_price = 'Sell price is required';
    else if (isNaN(parseFloat(formData.sell_price)) || parseFloat(formData.sell_price) <= 0) {
      newErrors.sell_price = 'Sell price must be a positive number';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      updateMutation.mutate(formData);
    }
  };

  if (isLoading) {
    return (
      <ProtectedRoute>
        <AppShell>
          <div className="p-6">
            <div className="text-center py-12">Loading...</div>
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
          <div>
            <Link href={`/inventory/products/${id}`} className="text-sm text-brand-700 hover:underline">
              ← Back to Product
            </Link>
            <h1 className="text-lg font-semibold mt-1">Edit Product</h1>
          </div>

          <div className="max-w-2xl">
            <Card>
              <CardHeader>Product Information</CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.general && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                      {errors.general}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="SKU *"
                      placeholder="e.g., PARA500"
                      value={formData.sku}
                      onChange={(e) => handleChange('sku', e.target.value.toUpperCase())}
                      error={errors.sku}
                      required
                    />
                    <Input
                      label="Generic Name *"
                      placeholder="e.g., Paracetamol"
                      value={formData.generic_name}
                      onChange={(e) => handleChange('generic_name', e.target.value)}
                      error={errors.generic_name}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Brand"
                      placeholder="e.g., Panadol"
                      value={formData.brand}
                      onChange={(e) => handleChange('brand', e.target.value)}
                    />
                    <Select
                      label="Form *"
                      value={formData.form}
                      onChange={(e) => handleChange('form', e.target.value)}
                      error={errors.form}
                      options={[
                        { label: 'Select form...', value: '' },
                        { label: 'Tablet', value: 'tablet' },
                        { label: 'Capsule', value: 'capsule' },
                        { label: 'Syrup', value: 'syrup' },
                        { label: 'Injection', value: 'injection' },
                        { label: 'Cream', value: 'cream' },
                        { label: 'Ointment', value: 'ointment' },
                        { label: 'Drops', value: 'drops' },
                        { label: 'Inhaler', value: 'inhaler' },
                      ]}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Unit *"
                      placeholder="e.g., 500mg, 100ml"
                      value={formData.unit}
                      onChange={(e) => handleChange('unit', e.target.value)}
                      error={errors.unit}
                      required
                    />
                    <Input
                      label="Sell Price (KES) *"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.sell_price}
                      onChange={(e) => handleChange('sell_price', e.target.value)}
                      error={errors.sell_price}
                      required
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Barcode"
                      placeholder="Scan or enter barcode"
                      value={formData.barcode}
                      onChange={(e) => handleChange('barcode', e.target.value)}
                    />
                    <Input
                      label="Tax Code"
                      placeholder="e.g., VAT16"
                      value={formData.tax_code}
                      onChange={(e) => handleChange('tax_code', e.target.value)}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="active"
                      checked={formData.active}
                      onChange={(e) => handleChange('active', e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600"
                    />
                    <label htmlFor="active" className="text-sm text-slate-700">
                      Active (available for sale)
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={updateMutation.isPending}
                    >
                      {updateMutation.isPending ? 'Updating...' : 'Update Product'}
                    </Button>
                    <Link href={`/inventory/products/${id}`}>
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
