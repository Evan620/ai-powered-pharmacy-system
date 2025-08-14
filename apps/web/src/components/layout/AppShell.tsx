import * as React from 'react';
import { Sidebar } from './Sidebar';
import { PageTransition } from '@/components/ui/PageTransition';

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen">
      <div className="mx-auto w-full max-w-screen-2xl lg:max-w-[1600px] px-4 lg:px-6 py-6">
        <div className="rounded-frame shadow-frame bg-white p-2">
          <div className="flex min-h-[82vh]">
            {/* Sidebar */}
            <div className="hidden md:block">
              <Sidebar />
            </div>
            {/* Content */}
            <div className="flex-1 rounded-r-[16px] overflow-hidden bg-white flex flex-col">
              <div className="flex-1">
                <PageTransition>
                  {children}
                </PageTransition>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

