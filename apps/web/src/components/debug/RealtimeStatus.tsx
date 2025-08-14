'use client';
import { useState, useEffect } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { testRealtimeConnection, debugRealtimeEvents, getRealtimeInfo, REALTIME_SETUP_SQL } from '@/lib/supabase-realtime';

/**
 * Debug component to test and monitor Supabase realtime functionality
 * Add this to your dashboard temporarily to verify realtime is working
 */
export function RealtimeStatus() {
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'testing' | 'connected' | 'failed'>('unknown');
  const [activeChannels, setActiveChannels] = useState(0);
  const [debuggingTable, setDebuggingTable] = useState<string | null>(null);

  useEffect(() => {
    // Update active channels count periodically
    const interval = setInterval(() => {
      const channels = getRealtimeInfo();
      setActiveChannels(channels.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleTestConnection = async () => {
    setConnectionStatus('testing');
    try {
      await testRealtimeConnection();
      setConnectionStatus('connected');
    } catch (error) {
      console.error('Realtime test failed:', error);
      setConnectionStatus('failed');
    }
  };

  const handleDebugTable = (tableName: string) => {
    if (debuggingTable === tableName) {
      setDebuggingTable(null);
      return;
    }
    
    setDebuggingTable(tableName);
    debugRealtimeEvents(tableName, 30000); // Debug for 30 seconds
    
    // Stop debugging after 30 seconds
    setTimeout(() => {
      setDebuggingTable(null);
    }, 30000);
  };

  const copySetupSQL = () => {
    navigator.clipboard.writeText(REALTIME_SETUP_SQL);
    alert('SQL copied to clipboard! Run this in your Supabase SQL editor.');
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected': return 'text-green-600';
      case 'failed': return 'text-red-600';
      case 'testing': return 'text-yellow-600';
      default: return 'text-gray-600';
    }
  };

  const getStatusText = () => {
    switch (connectionStatus) {
      case 'connected': return '✅ Connected';
      case 'failed': return '❌ Failed';
      case 'testing': return '🔄 Testing...';
      default: return '❓ Unknown';
    }
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <h3 className="text-lg font-semibold">Realtime Status (Debug)</h3>
        <p className="text-sm text-gray-600">
          Use this panel to test and debug Supabase realtime functionality
        </p>
      </CardHeader>
      <CardBody className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <div>
            <span className="font-medium">Connection Status: </span>
            <span className={getStatusColor()}>{getStatusText()}</span>
          </div>
          <Button 
            size="sm" 
            onClick={handleTestConnection}
            disabled={connectionStatus === 'testing'}
          >
            Test Connection
          </Button>
        </div>

        {/* Active Channels */}
        <div>
          <span className="font-medium">Active Channels: </span>
          <span className="text-blue-600">{activeChannels}</span>
        </div>

        {/* Setup Instructions */}
        <div className="bg-yellow-50 p-3 rounded-lg">
          <p className="text-sm font-medium text-yellow-800 mb-2">
            ⚠️ If realtime isn't working, you may need to enable it:
          </p>
          <Button size="sm" variant="secondary" onClick={copySetupSQL}>
            Copy Setup SQL
          </Button>
          <p className="text-xs text-yellow-700 mt-1">
            Run the copied SQL in your Supabase SQL editor to enable realtime for all tables.
          </p>
        </div>

        {/* Debug Tables */}
        <div>
          <p className="font-medium mb-2">Debug Table Events (30s):</p>
          <div className="flex flex-wrap gap-2">
            {['sales', 'sale_items', 'batches', 'products', 'payments'].map((table) => (
              <Button
                key={table}
                size="sm"
                variant={debuggingTable === table ? "primary" : "secondary"}
                onClick={() => handleDebugTable(table)}
              >
                {debuggingTable === table ? `🔍 ${table}` : table}
              </Button>
            ))}
          </div>
          {debuggingTable && (
            <p className="text-sm text-blue-600 mt-2">
              🔍 Debugging {debuggingTable} events... Check console for logs.
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 p-3 rounded-lg">
          <p className="text-sm text-blue-800">
            <strong>How to test:</strong>
          </p>
          <ol className="text-sm text-blue-700 mt-1 list-decimal list-inside space-y-1">
            <li>Click "Test Connection" to verify realtime works</li>
            <li>Click a table name to debug its events</li>
            <li>Make changes in another tab/window (e.g., create a sale in POS)</li>
            <li>Watch the console for realtime events</li>
            <li>Check if dashboard data updates automatically</li>
          </ol>
        </div>

        {/* Remove Instructions */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> Remove this component from production. 
            It's only for debugging realtime functionality.
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
