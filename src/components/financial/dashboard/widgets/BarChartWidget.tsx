import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Entry } from '../../../../types/finance';

interface BarChartWidgetProps {
  entries: Entry[];
  title: string;
}

export function BarChartWidget({ entries, title }: BarChartWidgetProps) {
  const monthlyData = entries.reduce((acc, entry) => {
    const month = new Date(entry.date).toLocaleDateString('pt-BR', { month: 'short' });
    if (!acc[month]) {
      acc[month] = { month, planned: 0, actual: 0 };
    }
    if (entry.type === 'planned') {
      acc[month].planned += entry.amount;
    } else {
      acc[month].actual += entry.amount;
    }
    return acc;
  }, {} as Record<string, { month: string; planned: number; actual: number }>);

  const data = Object.values(monthlyData);

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Bar 
            dataKey="planned" 
            name="Previsto" 
            fill="#6366F1" 
            radius={[4, 4, 0, 0]}
          />
          <Bar 
            dataKey="actual" 
            name="Realizado" 
            fill="#10B981"
            radius={[4, 4, 0, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}