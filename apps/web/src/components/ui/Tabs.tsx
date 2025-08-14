import * as React from 'react';
import clsx from 'clsx';

type TabsContextT = {
  value: string;
  setValue: (v: string) => void;
};
const TabsContext = React.createContext<TabsContextT | null>(null);

export function Tabs({ defaultValue, children }: { defaultValue: string; children: React.ReactNode }) {
  const [value, setValue] = React.useState(defaultValue);
  return <TabsContext.Provider value={{ value, setValue }}>{children}</TabsContext.Provider>;
}

export function TabsList({ children }: { children: React.ReactNode }) {
  return <div className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-white p-1">{children}</div>;
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  const active = ctx.value === value;
  return (
    <button
      className={clsx('px-3 py-1.5 text-sm rounded-md transition', active ? 'bg-brand-50 text-brand-700' : 'text-slate-700 hover:bg-gray-50')}
      onClick={() => ctx.setValue(value)}
      type="button"
    >
      {children}
    </button>
  );
}

export function TabsContent({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(TabsContext)!;
  if (ctx.value !== value) return null;
  return <div className="mt-3">{children}</div>;
}

