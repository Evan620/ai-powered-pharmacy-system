'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FadeIn } from '@/components/ui/PageTransition';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const MiniBarCard = dynamic(() => import('@/components/charts/MiniBarCard').then(m => m.MiniBarCard), { ssr: false });
const LineChartCard = dynamic(() => import('@/components/charts/LineChartCard').then(m => m.LineChartCard), { ssr: false });

export default function ReportsPage() {
  const reportTypes = [
    {
      title: 'Sales Report',
      description: 'Daily, weekly, and monthly sales analytics',
      icon: '📊',
      status: 'Available',
      href: '/reports/sales'
    },
    {
      title: 'Inventory Report',
      description: 'Stock levels, movements, and valuation',
      icon: '📦',
      status: 'Available',
      href: '/reports/inventory'
    },
    {
      title: 'Expiry Report',
      description: 'Products expiring in the next 30-90 days',
      icon: '⏰',
      status: 'Available',
      href: '/reports/expiry'
    },
    {
      title: 'Financial Report',
      description: 'Profit margins, costs, and revenue analysis',
      icon: '💰',
      status: 'Available',
      href: '/reports/financial'
    }
  ];

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-6 space-y-6">
          <FadeIn>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold">Reports & Analytics</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Generate insights from your pharmacy data
                </p>
              </div>
              <Button variant="secondary" size="sm">
                Export All
              </Button>
            </div>
          </FadeIn>

          {/* Charts */}
          <div className="grid grid-cols-12 gap-6">
            <FadeIn delay={100} className="col-span-12 lg:col-span-7">
              <LineChartCard title="Daily Sales (Last 30 days)" />
            </FadeIn>
            <FadeIn delay={150} className="col-span-12 lg:col-span-5">
              <MiniBarCard title="Stock on Hand (Top categories)" />
            </FadeIn>
          </div>

          {/* Report Types */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {reportTypes.map((report, index) => (
              <FadeIn key={report.title} delay={200 + index * 100}>
                <Card className="hover:shadow-md transition-shadow duration-200">
                  <CardBody className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="text-2xl">{report.icon}</div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        report.status === 'Available'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-900 mb-2">{report.title}</h3>
                    <p className="text-sm text-slate-500 mb-4">{report.description}</p>
                    {report.status === 'Available' ? (
                      <Link href={report.href}>
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                        >
                          Generate Report
                        </Button>
                      </Link>
                    ) : (
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled
                        className="w-full"
                      >
                        Generate Report
                      </Button>
                    )}
                  </CardBody>
                </Card>
              </FadeIn>
            ))}
          </div>

          {/* Export Options */}
          <FadeIn delay={600}>
            <Card>
              <CardHeader>Export Options</CardHeader>
              <CardBody>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-slate-900">Bulk Export</div>
                    <div className="text-sm text-slate-500">Export all reports in CSV or PDF format</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm">
                      Export CSV
                    </Button>
                    <Button variant="secondary" size="sm">
                      Export PDF
                    </Button>
                  </div>
                </div>
              </CardBody>
            </Card>
          </FadeIn>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

