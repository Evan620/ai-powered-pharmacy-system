'use client';
import * as React from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const timeFrames = [
  { label: 'This Month', key: 'mtd', group: 'day', days: 31 },
  { label: '6 Months', key: '6mo', group: 'month', months: 6 },
  { label: '12 Months', key: '12mo', group: 'month', months: 12 },
];

export function LineChartCard({ title = 'Revenue', defaultFrame = '6mo' }: { title?: string; defaultFrame?: string }) {
  const [frame, setFrame] = React.useState(defaultFrame);
  const { group, days, months } = React.useMemo(() => timeFrames.find(tf => tf.key === frame) || timeFrames[1], [frame]);

  const { data = [], isLoading } = useQuery({
    queryKey: ['revenue-chart', frame],
    queryFn: async () => {
      const now = new Date();
      let from;
      let groupFormat;
      if (frame === 'mtd') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        groupFormat = 'YYYY-MM-DD';
      } else if (frame === '6mo' || frame === '12mo') {
        from = new Date(now);
        from.setMonth(now.getMonth() - (frame === '6mo' ? 5 : 11));
        groupFormat = 'YYYY-MM';
      }
      // Query all completed sales in period
      const { data, error } = await supabase
        .from('sales')
        .select('total,date')
        .eq('status', 'completed')
        .gte('date', from.toISOString())
        .lte('date', now.toISOString());
      if (error) throw error;
      // Group by unit
      const fmt = (date: string) => {
        const d = new Date(date);
        if (frame === 'mtd') return `${d.getDate()}-${d.toLocaleString('default', { month: 'short' })}`;
        return `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`;
      };
      const groupMap = new Map<string, number>();
      (data || []).forEach(row => {
        const key = fmt(row.date);
        groupMap.set(key, (groupMap.get(key) || 0) + Number(row.total));
      });
      // Fill empty slots for time periods
      let labels = [];
      if (frame === 'mtd') {
        const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= days; ++i) {
          const label = `${i}-${now.toLocaleString('default', { month: 'short' })}`;
          labels.push(label);
        }
      } else {
        let d = new Date(from);
        d.setDate(1);
        for (let i = 0; i < (months || 6); ++i) {
          const label = `${d.toLocaleString('default', { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`;
          labels.push(label);
          d.setMonth(d.getMonth() + 1);
        }
      }
      return labels.map(label => ({ name: label, revenue: groupMap.get(label) || 0 }));
    },
  });

  return (
    <Card className="h-full">
      <CardBody className="h-72">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
          <span>{title} ({timeFrames.find(tf => tf.key === frame)?.label})</span>
          <select
            className="bg-gray-50 border rounded p-1 text-xs focus:ring"
            value={frame}
            onChange={e => setFrame(e.target.value)}
          >
            {timeFrames.map(tf => (
              <option key={tf.key} value={tf.key}>{tf.label}</option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="revenue" stroke="#3E63F2" strokeWidth={3} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
