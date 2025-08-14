'use client';
import Link from 'next/link';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FadeIn } from '@/components/ui/PageTransition';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="h-5 w-5" aria-hidden>
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.601 32.91 29.197 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.847 6.053 29.189 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.649-.389-3.917z"/>
      <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.641 16.052 18.961 12 24 12c3.059 0 5.842 1.153 7.961 3.039l5.657-5.657C33.847 6.053 29.189 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.137 0 9.742-1.97 13.234-5.166l-6.101-5.159C28.992 35.672 26.634 36.5 24 36c-5.177 0-9.568-3.07-11.284-7.417l-6.56 5.046C9.467 39.79 16.144 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.323 3.91-5.727 7-11.303 7-5.177 0-9.568-3.07-11.284-7.417l-6.56 5.046C9.467 39.79 16.144 44 24 44c8.822 0 16.328-5.993 18.611-14.083.463-1.715.722-3.53.722-5.417 0-1.341-.138-2.649-.389-3.917z"/>
    </svg>
  );
}

export default function SignInPage() {
  const { signIn, user, loading } = useAuth();
  const toast = useToastContext();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message);
      toast.error('Failed to sign in. Please check your credentials.');
    } else {
      toast.success('Welcome back!');
      setTimeout(() => {
        router.push('/dashboard');
      }, 500);
    }

    setIsSubmitting(false);
  };

  if (user && !loading) {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen">
      <div className="mx-auto max-w-lg p-6">
        <div className="rounded-frame shadow-frame bg-white p-2">
          <div className="min-h-[82vh] p-4 md:p-8 flex items-center justify-center">
            <FadeIn>
              <Card className="w-full overflow-hidden shadow-lg">
                {/* Top gradient header with emblem */}
                <div className="bg-gradient-to-b from-brand-50 to-white px-6 py-8 text-center">
                  <div className="mx-auto h-12 w-12 rounded-full bg-gradient-to-b from-brand-500 to-brand-700 grid place-content-center text-white shadow-md">
                    <span className="text-xl">💊</span>
                  </div>
                  <h1 className="mt-4 text-3xl font-semibold">Welcome Back</h1>
                  <p className="mt-1 text-sm text-slate-600">
                    Don&apos;t have an account?{' '}
                    <Link href="/create-account" className="underline underline-offset-4 hover:text-brand-600 transition-colors">Create now</Link>
                  </p>
                </div>

              <CardBody className="pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-700">
                      {error}
                    </div>
                  )}
                  <Input
                    placeholder="Enter your email"
                    label="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                  <Input
                    placeholder="Password"
                    label="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <div className="flex items-center justify-between text-xs">
                    <div />
                    <Link href="/forgot-password" className="underline underline-offset-4 text-slate-600 hover:text-slate-800">Forgot Password?</Link>
                  </div>
                  <Button size="lg" className="w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? 'Signing In...' : 'Sign In'}
                  </Button>
                </form>

                {/* Divider */}
                <div className="my-6 flex items-center gap-3 text-xs text-slate-500">
                  <div className="h-px flex-1 bg-gray-200" />
                  <span>Or</span>
                  <div className="h-px flex-1 bg-gray-200" />
                </div>

                <div className="grid grid-cols-1 gap-3">
                  <Button variant="secondary" className="w-full gap-2" disabled>
                    <GoogleIcon /> Continue with Google (Coming Soon)
                  </Button>
                </div>
              </CardBody>
            </Card>
            </FadeIn>
          </div>
        </div>
      </div>
    </main>
  );
}

