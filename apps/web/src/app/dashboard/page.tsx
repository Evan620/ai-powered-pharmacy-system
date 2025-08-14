'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Header } from '@/components/layout/Header';
import { StatCard } from '@/components/ui/StatCard';
import { ListCard } from '@/components/ui/ListCard';
import { MiniTable } from '@/components/ui/MiniTable';
import { StatCardSkeleton } from '@/components/ui/LoadingSkeleton';
import { FadeIn } from '@/components/ui/PageTransition';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useTopSellingProducts } from '@/hooks/useProducts';
import { useExpiringBatches } from '@/hooks/useBatches';
import { useInventoryStats, useLowStockProducts } from '@/hooks/useInventoryAlerts';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import dynamic from 'next/dynamic';

const MiniBarCard = dynamic(() => import('@/components/charts/MiniBarCard').then(m => m.MiniBarCard), { ssr: false });
const LineChartCard = dynamic(() => import('@/components/charts/LineChartCard').then(m => m.LineChartCard), { ssr: false });

function RevenueTodayCard() {
  const { data, isLoading } = useQuery({
    queryKey: ["revenue-today-trend"],
    queryFn: async () => {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
      // Today
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const end = new Date();
      end.setHours(23, 59, 59, 999);
      const { data: todaySales, error: errToday } = await supabase
        .from('sales')
        .select('total,date', { count: 'exact' })
        .eq('status', 'completed')
        .gte('date', start.toISOString())
        .lte('date', end.toISOString());
      if (errToday) throw errToday;
      const todayTotal = (todaySales || []).reduce((sum, s) => sum + Number(s.total), 0);
      // Yesterday
      const ystart = new Date(start);
      ystart.setDate(start.getDate() - 1);
      const yend = new Date(end);
      yend.setDate(end.getDate() - 1);
      const { data: ysales, error: errY } = await supabase
        .from('sales')
        .select('total,date', { count: 'exact' })
        .eq('status', 'completed')
        .gte('date', ystart.toISOString())
        .lte('date', yend.toISOString());
      if (errY) throw errY;
      const yTotal = (ysales || []).reduce((sum, s) => sum + Number(s.total), 0);
      // Trend
      let trend = null;
      if (yTotal === 0 && todayTotal > 0) trend = '▲ New';
      else if (yTotal === 0 && todayTotal === 0) trend = null;
      else {
        const pct = ((todayTotal - yTotal) / Math.max(yTotal, 1)) * 100;
        trend = pct >= 0 ? `▲ ${pct.toFixed(1)}% vs yesterday` : `▼ ${Math.abs(pct).toFixed(1)}% vs yesterday`;
      }
      return { todayTotal, trend, pct: yTotal ? ((todayTotal - yTotal) / Math.abs(yTotal)) * 100 : null };
    },
  });
  return isLoading ? (
    <StatCardSkeleton />
  ) : (
    <StatCard
      label="Revenue Today"
      value={`KES ${data?.todayTotal?.toLocaleString() || '0'}`}
      trend={data?.trend || ''}
    />
  );
}

export default function DashboardPage() {
  const { profile } = useAuth();
  const { data: topSelling = [], isLoading: topSellingLoading } = useTopSellingProducts();
  const { data: expiringBatches = [], isLoading: expiringLoading } = useExpiringBatches(8); // Limit to 8 items
  const { data: inventoryStats, isLoading: statsLoading } = useInventoryStats();
  const { data: lowStockProducts = [], isLoading: lowStockLoading } = useLowStockProducts();

  return (
    <ProtectedRoute>
      <AppShell>
        <Header title="Dashboard" showSearch />

        {/* Hero intro */}
        <FadeIn className="px-6 py-4">
          <div className="card p-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Welcome back, {profile?.name}</div>
              <div className="mt-1 text-xl font-semibold">Pharmo Main Branch</div>
            </div>
            <div className="hidden sm:block h-14 w-40 rounded-md bg-gradient-to-r from-brand-100 to-white" />
          </div>
        </FadeIn>

      {/* KPIs */}
      <div className="px-6 grid grid-cols-12 gap-6">
        <FadeIn delay={100} className="col-span-12 sm:col-span-6 lg:col-span-3">
          <RevenueTodayCard />
        </FadeIn>
        <FadeIn delay={150} className="col-span-12 sm:col-span-6 lg:col-span-3">
          {statsLoading ? (
            <StatCardSkeleton />
          ) : (
            <StatCard label="Active Products" value={inventoryStats?.totalProducts.toString() || '0'} trend="in inventory" />
          )}
        </FadeIn>
        <FadeIn delay={200} className="col-span-12 sm:col-span-6 lg:col-span-3">
          {statsLoading ? (
            <StatCardSkeleton />
          ) : (
            <StatCard label="Low Stock" value={inventoryStats?.lowStockProducts.toString() || '0'} trend="items below threshold" />
          )}
        </FadeIn>
        <FadeIn delay={250} className="col-span-12 sm:col-span-6 lg:col-span-3">
          {statsLoading ? (
            <StatCardSkeleton />
          ) : (
            <StatCard label="Expiring Soon" value={inventoryStats?.expiringBatches.toString() || '0'} trend="next 30 days" />
          )}
        </FadeIn>
      </div>

      {/* Charts and lists */}
      <div className="p-6 grid grid-cols-12 gap-6">
        <FadeIn delay={300} className="col-span-12 lg:col-span-7">
          <LineChartCard />
        </FadeIn>
        <FadeIn delay={350} className="col-span-12 lg:col-span-5">
          <MiniBarCard title="Sales" />
        </FadeIn>
      </div>

      {/* Alerts + Top Selling */}
      <div className="px-6 pb-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <FadeIn delay={400}>
          <MiniTable
            title="Expiry Alerts"
            columns={[
              { key: 'product', header: 'Product', width: '2fr' },
              { key: 'batch', header: 'Batch', width: '1fr' },
              { key: 'days', header: 'Days Left', width: '80px', className: 'text-right' }
            ]}
            data={expiringBatches.map(batch => ({
              product: batch.label.split(' (Batch')[0],
              batch: batch.label.match(/Batch ([^)]+)/)?.[1] || 'N/A',
              days: batch.value,
              urgency: batch.urgency
            }))}
            isLoading={expiringLoading}
            viewAllLink="/inventory/batches"
            maxHeight="300px"
            emptyMessage="No batches expiring soon"
          />
        </FadeIn>
        <FadeIn delay={450} className="space-y-4">
          <ListCard
            title="Top Selling"
            items={topSelling}
            isLoading={topSellingLoading}
            maxHeight="112px"
          />
          <MiniTable
            title="Low Stock Alerts"
            columns={[
              { key: 'product', header: 'Product', width: '2fr' },
              { key: 'sku', header: 'SKU', width: '1fr' },
              { key: 'stock', header: 'Stock', width: '80px', className: 'text-right' }
            ]}
            data={lowStockProducts.slice(0, 8).map(product => ({
              product: product.generic_name + (product.brand ? ` (${product.brand})` : ''),
              sku: product.sku,
              stock: `${product.total_stock || product.totalStock}`,
              urgency: (product.total_stock || product.totalStock) === 0 ? 'critical' : 
                      (product.total_stock || product.totalStock) <= 10 ? 'warning' : 'normal'
            }))}
            isLoading={lowStockLoading}
            viewAllLink="/inventory/products"
            maxHeight="300px"
            emptyMessage="All products are well stocked"
          />
        </FadeIn>
      </div>
      </AppShell>
    </ProtectedRoute>
  );
}

