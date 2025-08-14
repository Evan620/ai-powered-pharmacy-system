'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import Link from 'next/link';

export default function NewSupplierPage() {
  const { profile } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();
  const toast = useToastContext();
  
  const [formData, setFormData] = useState({
    name: '',
    contact: '',
    lead_time_days: '7',
    min_order: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { error } = await supabase
        .from('suppliers')
        .insert({
          ...data,
          pharmacy_id: profile?.pharmacy_id,
          lead_time_days: parseInt(data.lead_time_days),
          min_order: parseFloat(data.min_order),
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Supplier created successfully!');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      
      setTimeout(() => {
        router.push('/suppliers');
      }, 500);
    },
    onError: (error: any) => {
      setErrors({ general: error.message });
      toast.error('Failed to create supplier. Please try again.');
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
    
    if (!formData.name.trim()) newErrors.name = 'Name is required';
    if (!formData.lead_time_days.trim()) newErrors.lead_time_days = 'Lead time is required';
    else if (isNaN(parseInt(formData.lead_time_days)) || parseInt(formData.lead_time_days) <= 0) {
      newErrors.lead_time_days = 'Lead time must be a positive number';
    }
    if (!formData.min_order.trim()) newErrors.min_order = 'Minimum order is required';
    else if (isNaN(parseFloat(formData.min_order)) || parseFloat(formData.min_order) < 0) {
      newErrors.min_order = 'Minimum order must be a non-negative number';
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
            <Link href="/suppliers" className="text-sm text-brand-700 hover:underline">
              ← Back to Suppliers
            </Link>
            <h1 className="text-lg font-semibold mt-1">Add New Supplier</h1>
          </div>

          <div className="max-w-2xl">
            <Card>
              <CardHeader>Supplier Information</CardHeader>
              <CardBody>
                <form onSubmit={handleSubmit} className="space-y-4">
                  {errors.general && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                      {errors.general}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Supplier Name *"
                      placeholder="e.g., Acme Pharma Ltd"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      error={errors.name}
                      required
                    />
                    <Input
                      label="Contact"
                      placeholder="Phone or email"
                      value={formData.contact}
                      onChange={(e) => handleChange('contact', e.target.value)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Input
                      label="Lead Time (Days) *"
                      type="number"
                      placeholder="7"
                      value={formData.lead_time_days}
                      onChange={(e) => handleChange('lead_time_days', e.target.value)}
                      error={errors.lead_time_days}
                      hint="How many days for delivery"
                      required
                    />
                    <Input
                      label="Minimum Order (KES) *"
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={formData.min_order}
                      onChange={(e) => handleChange('min_order', e.target.value)}
                      error={errors.min_order}
                      hint="Minimum order amount"
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4">
                    <Button
                      type="submit"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? 'Creating...' : 'Create Supplier'}
                    </Button>
                    <Link href="/suppliers">
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
