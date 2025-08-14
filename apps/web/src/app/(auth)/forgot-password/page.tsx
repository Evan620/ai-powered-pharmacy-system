"use client";
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);

    try {
      const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;
      setMessage('Password reset email sent. Please check your inbox.');
    } catch (err: any) {
      setError(err?.message || 'Failed to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        <Card className="w-full overflow-hidden">
          <div className="bg-gradient-to-b from-brand-50 to-white px-6 py-8 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 grid place-content-center text-white shadow">
              <span className="text-xl">✉️</span>
            </div>
            <h1 className="mt-4 text-3xl font-semibold">Forgot password</h1>
            <p className="mt-1 text-sm text-slate-600">Enter your email and we will send a reset link</p>
          </div>

          <CardBody className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">{error}</div>
              )}
              {message && (
                <div className="p-3 rounded-md bg-green-50 border border-green-200 text-sm text-green-700">{message}</div>
              )}
              <Input
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <Button size="lg" className="w-full" type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Sending...' : 'Send reset link'}
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

