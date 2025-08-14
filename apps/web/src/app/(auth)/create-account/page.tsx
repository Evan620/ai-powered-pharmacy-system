'use client';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FadeIn } from '@/components/ui/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function CreateAccountPage() {
  const { signUp, user, loading } = useAuth();
  const toast = useToastContext();
  const router = useRouter();
  const [formData, setFormData] = useState({
    pharmacyName: '',
    name: '',
    email: '',
    password: '',
    role: 'owner'
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && !loading) {
      router.push('/dashboard');
    }
  }, [user, loading, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    const result = await signUp(formData.email, formData.password, {
      name: formData.name,
      pharmacyName: formData.pharmacyName,
      role: formData.role
    });

    if (result.error) {
      setError(result.error.message);
      toast.error('Failed to create account. Please try again.');
    } else if ('needsEmailConfirmation' in result) {
      toast.success('Account created! Please check your email to confirm your account.');
      setError(''); // Clear any previous errors
      // Show success message instead of redirecting
      setTimeout(() => {
        router.push('/sign-in?message=Please check your email and click the confirmation link');
      }, 2000);
    } else {
      toast.success('Account created successfully! Welcome to Pharmo.');
      setTimeout(() => {
        router.push('/dashboard');
      }, 1000);
    }

    setIsSubmitting(false);
  };

  const handleChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (user && !loading) {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <Card className="w-full overflow-hidden">
              <div className="bg-gradient-to-b from-brand-50 to-white px-6 py-8 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 grid place-content-center text-white shadow">
                  <span className="text-xl">🏥</span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold">Create account</h1>
                <p className="mt-1 text-sm text-slate-600">Start your pharmacy management</p>
              </div>

              <CardBody className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <Input
                    label="Pharmacy name"
                    placeholder="e.g., CityCare Pharmacy"
                    value={formData.pharmacyName}
                    onChange={(e) => handleChange('pharmacyName', e.target.value)}
                    required
                  />
                  <Input
                    label="Your name"
                    placeholder="Full name"
                    value={formData.name}
                    onChange={(e) => handleChange('name', e.target.value)}
                    required
                  />
                  <Input
                    label="Email"
                    type="email"
                    placeholder="name@example.com"
                    value={formData.email}
                    onChange={(e) => handleChange('email', e.target.value)}
                    required
                  />
                  <Input
                    label="Password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => handleChange('password', e.target.value)}
                    required
                  />
                  <Select
                    label="Your role"
                    value={formData.role}
                    onChange={(e) => handleChange('role', e.target.value)}
                    options={[
                      { label: 'Owner', value: 'owner' },
                      { label: 'Manager', value: 'manager' },
                      { label: 'Cashier', value: 'cashier' }
                    ]}
                  />
                  <Button size="lg" className="w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Creating account...' : 'Create account'}
                  </Button>
                </form>
                <p className="mt-4 text-center text-xs text-slate-500">
                  Already have an account?{' '}
                  <Link href="/sign-in" className="underline underline-offset-4">Sign in</Link>
                </p>
              </CardBody>
        </Card>
      </div>
    </main>
  );
}

