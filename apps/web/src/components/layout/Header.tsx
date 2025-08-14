'use client';
import * as React from 'react';
import { Button } from '@/components/ui/Button';
import { useAuth } from '@/contexts/AuthContext';
import { useState } from 'react';

type HeaderProps = {
  title?: string;
  showSearch?: boolean;
  showActions?: boolean;
};

export function Header({ title = 'Pharmo', showSearch = false, showActions = false }: HeaderProps) {
  const { profile, signOut } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-white/60">
      <div className="flex items-center gap-3">
        <div className="h-8 w-8 rounded-full bg-gradient-to-b from-brand-500 to-brand-700" />
        <span className="font-semibold text-slate-800">{title}</span>
      </div>
      <div className="hidden md:flex items-center gap-3">
        {showSearch && (
          <div className="relative">
            <input
              placeholder="Search products, batches, sales..."
              className="w-72 rounded-md border border-gray-300 px-3 py-2 text-sm placeholder:text-slate-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
            />
          </div>
        )}
        {showActions && (
          <>
            <Button variant="secondary" size="sm">Invite</Button>
            <Button size="sm">New Sale</Button>
          </>
        )}

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-gray-50"
          >
            <div className="h-6 w-6 rounded-full bg-gradient-to-b from-brand-500 to-brand-700" />
            <span className="text-slate-700">{profile?.name}</span>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 top-full mt-1 w-48 rounded-md border border-gray-200 bg-white shadow-lg z-50">
              <div className="p-2 border-b border-gray-100">
                <div className="text-sm font-medium text-slate-900">{profile?.name}</div>
                <div className="text-xs text-slate-500 capitalize">{profile?.role}</div>
              </div>
              <div className="p-1">
                <button
                  onClick={() => {
                    setShowUserMenu(false);
                    signOut();
                  }}
                  className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-gray-50 rounded-md"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

