'use client';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, Suspense } from 'react';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    // Check if we have the necessary tokens in the URL
    const accessToken = searchParams.get('access_token');
    const refreshToken = searchParams.get('refresh_token');
    
    if (accessToken && refreshToken) {
      // Set the session with the tokens
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      });
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password: password
    });
    
    if (error) {
      setError(error.message);
    } else {
      setMessage('Password updated successfully! Redirecting to dashboard...');
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    }
    
    setIsSubmitting(false);
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <Card className="w-full overflow-hidden">
              <div className="bg-gradient-to-b from-brand-50 to-white px-6 py-8 text-center">
                <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 grid place-content-center text-white shadow">
                  <span className="text-xl">🔑</span>
                </div>
                <h1 className="mt-4 text-3xl font-semibold">Set new password</h1>
                <p className="mt-1 text-sm text-slate-600">Enter your new password below</p>
              </div>

              <CardBody className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  {message && (
                    <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">
                      {message}
                    </div>
                  )}
                  <Input 
                    label="New Password" 
                    type="password" 
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <Input 
                    label="Confirm Password" 
                    type="password" 
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                  <Button size="lg" className="w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Updating...' : 'Update password'}
                  </Button>
                </form>
                <p className="mt-4 text-center text-xs text-slate-500">
                  Back to <Link href="/sign-in" className="underline underline-offset-4">Sign in</Link>
                </p>
              </CardBody>
        </Card>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}
