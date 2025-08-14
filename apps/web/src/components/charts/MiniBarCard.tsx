'use client';
import * as React from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

const timeFrames = [
  { label: '7 Days', key: '7d', days: 7 },
  { label: 'This Month', key: 'mtd', days: 31 },
  { label: '30 Days', key: '30d', days: 30 },
  { label: 'Last Month', key: 'lm', lastMonth: true },
];

export function MiniBarCard({ title = 'Sales', defaultFrame = '7d' }: { title?: string; defaultFrame?: string }) {
  const [frame, setFrame] = React.useState(defaultFrame);
  const tf = React.useMemo(() => timeFrames.find(tf => tf.key === frame) || timeFrames[0], [frame]);
  const { data = [], isLoading } = useQuery({
    queryKey: ['sales-bar', frame],
    queryFn: async () => {
      const now = new Date();
      let from, to = new Date(now);
      if (tf.key === '7d' || tf.key === '30d') {
        from = new Date(now);
        from.setDate(now.getDate() - (tf.days - 1));
      } else if (tf.key === 'mtd') {
        from = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (tf.key === 'lm') {
        from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        to = new Date(now.getFullYear(), now.getMonth(), 0);
      }
      // Aggregate sales by day for the period
      const { data: sales, error } = await supabase
        .from('sales')
        .select('total, date')
        .eq('status', 'completed')
        .gte('date', from.toISOString())
        .lte('date', to.toISOString());
      if (error) throw error;
      // Group by day label (e.g., Mon, Tue)
      const labels: string[] = [];
      const labelMap = new Map<string, number>();
      if (tf.key === '7d' || tf.key === '30d' || tf.key === 'lm') {
        for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
          const label = d.toLocaleString('default', { weekday: 'short' });
          labels.push(label);
          labelMap.set(label, 0);
        }
        (sales || []).forEach(sale => {
          const d = new Date(sale.date);
          const label = d.toLocaleString('default', { weekday: 'short' });
          labelMap.set(label, (labelMap.get(label) || 0) + 1);
        });
        return labels.map(label => ({ name: label, value: labelMap.get(label) || 0 }));
      } else if (tf.key === 'mtd') {
        const days = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = 1; i <= days; ++i) {
          const label = `${i}`;
          labels.push(label);
          labelMap.set(label, 0);
        }
        (sales || []).forEach(sale => {
          const d = new Date(sale.date);
          const label = String(d.getDate());
          labelMap.set(label, (labelMap.get(label) || 0) + 1);
        });
        return labels.map(label => ({ name: label, value: labelMap.get(label) || 0 }));
      }
      return [];
    },
  });

  return (
    <Card className="h-full">
      <CardBody className="h-44">
        <div className="mb-2 flex items-center justify-between text-sm text-slate-600">
          <span>{title}</span>
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
          <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fontSize: 10, fill: '#64748B' }} />
            <YAxis hide />
            <Tooltip cursor={{ fill: 'rgba(100,116,139,0.08)' }} contentStyle={{ fontSize: 12 }} />
            <Bar dataKey="value" radius={[6, 6, 0, 0]} fill="#3E63F2" />
          </BarChart>
        </ResponsiveContainer>
      </CardBody>
    </Card>
  );
}
