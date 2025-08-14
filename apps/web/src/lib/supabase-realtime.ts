import { supabase } from './supabase';

/**
 * Utility functions for Supabase realtime functionality
 */

/**
 * Test realtime connection
 * Call this function to verify that realtime is working
 */
export async function testRealtimeConnection() {
  console.log('Testing Supabase realtime connection...');
  
  // Create a test channel
  const testChannel = supabase
    .channel('test-connection')
    .on('presence', { event: 'sync' }, () => {
      console.log('✅ Realtime connection is working!');
    })
    .subscribe((status) => {
      console.log('Realtime connection status:', status);
      if (status === 'SUBSCRIBED') {
        console.log('✅ Successfully subscribed to realtime');
      } else if (status === 'CHANNEL_ERROR') {
        console.error('❌ Realtime connection failed');
      }
    });

  // Clean up after 5 seconds
  setTimeout(() => {
    supabase.removeChannel(testChannel);
    console.log('Test channel cleaned up');
  }, 5000);
}

/**
 * Enable realtime for specific tables
 * This should be run in your Supabase SQL editor to enable realtime
 */
export const REALTIME_SETUP_SQL = `
-- Enable realtime for all relevant tables
ALTER PUBLICATION supabase_realtime ADD TABLE sales;
ALTER PUBLICATION supabase_realtime ADD TABLE sale_items;
ALTER PUBLICATION supabase_realtime ADD TABLE batches;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE stock_adjustments;
ALTER PUBLICATION supabase_realtime ADD TABLE payments;
ALTER PUBLICATION supabase_realtime ADD TABLE suppliers;

-- Verify realtime is enabled
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime';
`;

/**
 * Check if realtime is enabled for a table
 */
export async function checkRealtimeStatus(tableName: string) {
  try {
    const { data, error } = await supabase
      .from('pg_publication_tables')
      .select('tablename')
      .eq('pubname', 'supabase_realtime')
      .eq('tablename', tableName);

    if (error) {
      console.error('Error checking realtime status:', error);
      return false;
    }

    const isEnabled = data && data.length > 0;
    console.log(`Realtime for ${tableName}:`, isEnabled ? '✅ Enabled' : '❌ Disabled');
    return isEnabled;
  } catch (error) {
    console.error('Error checking realtime status:', error);
    return false;
  }
}

/**
 * Debug function to log all realtime events
 * Use this to troubleshoot realtime issues
 */
export function debugRealtimeEvents(tableName: string, duration: number = 30000) {
  console.log(`🔍 Debugging realtime events for ${tableName} for ${duration/1000} seconds...`);
  
  const debugChannel = supabase
    .channel(`debug-${tableName}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: tableName
      },
      (payload) => {
        console.log(`🔔 ${tableName} event:`, {
          event: payload.eventType,
          table: payload.table,
          old: payload.old,
          new: payload.new,
          timestamp: new Date().toISOString()
        });
      }
    )
    .subscribe((status) => {
      console.log(`Debug channel for ${tableName}:`, status);
    });

  // Stop debugging after specified duration
  setTimeout(() => {
    supabase.removeChannel(debugChannel);
    console.log(`🔍 Stopped debugging ${tableName} events`);
  }, duration);

  return debugChannel;
}

/**
 * Get realtime connection info
 */
export function getRealtimeInfo() {
  const channels = supabase.getChannels();
  console.log('Active realtime channels:', channels.length);
  channels.forEach((channel, index) => {
    console.log(`Channel ${index + 1}:`, {
      topic: channel.topic,
      state: channel.state,
      joinedAt: channel.joinedAt
    });
  });
  return channels;
}
