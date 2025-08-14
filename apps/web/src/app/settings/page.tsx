'use client';
import { AppShell } from '@/components/layout/AppShell';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FadeIn } from '@/components/ui/PageTransition';
import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/contexts/ToastContext';
import { useState, useMemo } from 'react';
import { useSettings, useUpsertSetting } from '@/hooks/useSettings';

export default function SettingsPage() {
  const { profile } = useAuth();
  const toast = useToastContext();
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: '⚙️' },
    { id: 'pharmacy', label: 'Pharmacy', icon: '🏥' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];

  const { data: settings } = useSettings();
  const upsert = useUpsertSetting();

  const currency = settings?.currency || 'KES';
  const lowProduct = settings?.low_stock_product_threshold || '10';
  const lowBatch = settings?.low_stock_batch_threshold || '10';

  const handleSave = async () => {
    try {
      await Promise.all([
        upsert.mutateAsync({ key: 'currency', value: currency }),
        upsert.mutateAsync({ key: 'low_stock_product_threshold', value: lowProduct }),
        upsert.mutateAsync({ key: 'low_stock_batch_threshold', value: lowBatch }),
      ]);
      toast.success('Settings saved successfully!');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save settings');
    }
  };

  return (
    <ProtectedRoute>
      <AppShell>
        <div className="p-6 space-y-6">
          <FadeIn>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-lg font-semibold">Settings</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Manage your pharmacy system configuration
                </p>
              </div>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Sidebar Navigation */}
            <FadeIn delay={100}>
              <Card>
                <CardHeader>Settings</CardHeader>
                <CardBody className="p-0">
                  <nav className="space-y-1">
                    {tabs.map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                          activeTab === tab.id
                            ? 'bg-brand-50 text-brand-700 border-r-2 border-brand-600'
                            : 'text-slate-600 hover:bg-gray-50'
                        }`}
                      >
                        <span>{tab.icon}</span>
                        {tab.label}
                      </button>
                    ))}
                  </nav>
                </CardBody>
              </Card>
            </FadeIn>

            {/* Settings Content */}
            <FadeIn delay={150} className="lg:col-span-3">
              {activeTab === 'general' && (
                <Card>
                  <CardHeader>General Settings</CardHeader>
                  <CardBody>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="System Name"
                          value="Pharmo POS"
                          placeholder="Enter system name"
                        />
                        <Select
                          label="Currency"
                          value={settings?.currency || 'KES'}
                          onChange={(e) => upsert.mutate({ key: 'currency', value: e.target.value })}
                          options={[
                            { label: 'Kenyan Shilling (KES)', value: 'KES' },
                            { label: 'US Dollar (USD)', value: 'USD' },
                            { label: 'Euro (EUR)', value: 'EUR' },
                          ]}
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Select
                          label="Date Format"
                          value="DD/MM/YYYY"
                          options={[
                            { label: 'DD/MM/YYYY', value: 'DD/MM/YYYY' },
                            { label: 'MM/DD/YYYY', value: 'MM/DD/YYYY' },
                            { label: 'YYYY-MM-DD', value: 'YYYY-MM-DD' },
                          ]}
                        />
                        <Select
                          label="Time Zone"
                          value="Africa/Nairobi"
                          options={[
                            { label: 'Africa/Nairobi (EAT)', value: 'Africa/Nairobi' },
                            { label: 'UTC', value: 'UTC' },
                          ]}
                        />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {activeTab === 'pharmacy' && (
                <Card>
                  <CardHeader>Pharmacy Information</CardHeader>
                  <CardBody>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Pharmacy Name"
                          value="Pharmo Main Branch"
                          placeholder="Enter pharmacy name"
                        />
                        <Input
                          label="License Number"
                          placeholder="Enter license number"
                        />
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Phone Number"
                          value="0700 000 000"
                          placeholder="Enter phone number"
                        />
                        <Input
                          label="Email Address"
                          type="email"
                          value="owner@example.com"
                          placeholder="Enter email address"
                        />
                      </div>
                      <Input
                        label="Address"
                        value="123 Kimathi Street"
                        placeholder="Enter pharmacy address"
                      />
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <Input
                          label="Tax Rate (%)"
                          type="number"
                          value="16"
                          placeholder="16"
                        />
                        <Select
                          label="Receipt Template"
                          value="standard"
                          options={[
                            { label: 'Standard', value: 'standard' },
                            { label: 'Compact', value: 'compact' },
                            { label: 'Detailed', value: 'detailed' },
                          ]}
                        />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {activeTab === 'notifications' && (
                <Card>
                  <CardHeader>Notification Preferences</CardHeader>
                  <CardBody>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-3 rounded-md border border-gray-100">
                        <div>
                          <div className="font-medium text-sm">Low Stock Alerts</div>
                          <div className="text-xs text-slate-500">Get notified when products are running low</div>
                        </div>
                        <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-md border border-gray-100">
                        <div>
                          <div className="font-medium text-sm">Expiry Alerts</div>
                          <div className="text-xs text-slate-500">Get notified about expiring products</div>
                        </div>
                        <input type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                      </div>
                      <div className="flex items-center justify-between p-3 rounded-md border border-gray-100">
                        <div>
                          <div className="font-medium text-sm">Daily Reports</div>
                          <div className="text-xs text-slate-500">Receive daily sales and inventory reports</div>
                        </div>
                        <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-brand-600" />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}

              {activeTab === 'security' && (
                <Card>
                  <CardHeader>Security Settings</CardHeader>
                  <CardBody>
                    <div className="space-y-6">
                      <div>
                        <h3 className="font-medium text-sm mb-3">Password Requirements</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked disabled className="h-4 w-4 rounded border-gray-300" />
                            <span className="text-slate-600">Minimum 8 characters</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked disabled className="h-4 w-4 rounded border-gray-300" />
                            <span className="text-slate-600">Require uppercase letters</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <input type="checkbox" defaultChecked disabled className="h-4 w-4 rounded border-gray-300" />
                            <span className="text-slate-600">Require numbers</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <Select
                          label="Auto Logout After"
                          value="30"
                          options={[
                            { label: '15 minutes', value: '15' },
                            { label: '30 minutes', value: '30' },
                            { label: '1 hour', value: '60' },
                            { label: '2 hours', value: '120' },
                          ]}
                        />
                      </div>
                    </div>
                  </CardBody>
                </Card>
              )}
            </FadeIn>
          </div>
        </div>
      </AppShell>
    </ProtectedRoute>
  );
}

