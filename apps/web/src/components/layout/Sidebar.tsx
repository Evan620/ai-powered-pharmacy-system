'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: '📊' },
  { href: '/pos', label: 'POS', icon: '🧾' },
  { href: '/inventory/products', label: 'Products', icon: '💊' },
  { href: '/inventory/batches', label: 'Batches', icon: '📦' },
  { href: '/suppliers', label: 'Suppliers', icon: '🤝' },
  { href: '/reports', label: 'Reports', icon: '📑' },
  { href: '/settings', label: 'Settings', icon: '⚙️' },
];

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-60 shrink-0 border-r border-gray-100 bg-white/70 rounded-l-frame p-3">
      <div className="mb-3 px-2">
        <div className="h-8 w-8 rounded-full bg-gradient-to-b from-brand-500 to-brand-700" />
      </div>
      <nav className="space-y-1">
        {NAV.map((item) => {
          const active = pathname?.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition ' +
                (active ? 'bg-brand-50 text-brand-700 font-medium' : 'text-slate-700 hover:bg-gray-50')
              }
            >
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

