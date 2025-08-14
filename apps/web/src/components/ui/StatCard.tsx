import * as React from 'react';
import { Card, CardBody } from './Card';

export function StatCard({ label, value, trend }: { label: string; value: string; trend?: string }) {
  return (
    <Card className="h-full">
      <CardBody>
        <div className="text-xs text-slate-500">{label}</div>
        <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
        {trend && <div className="mt-1 text-xs text-slate-500">{trend}</div>}
      </CardBody>
    </Card>
  );
}

