import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Entry } from '../../../../types/finance';

interface LineChartWidgetProps {
  entries: Entry[];
  title: string;
}

export function LineChartWidget({ entries, title }: LineChartWidgetProps) {
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
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis />
          <Tooltip />
          <Legend />
          <Line 
            type="monotone" 
            dataKey="planned" 
            name="Previsto" 
            stroke="#6366F1" 
            activeDot={{ r: 8 }}
          />
          <Line 
            type="monotone" 
            dataKey="actual" 
            name="Realizado" 
            stroke="#10B981" 
            activeDot={{ r: 8 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}