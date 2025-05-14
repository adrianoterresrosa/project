import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import type { Entry, Group, Account, Subgroup } from '../../../../types/finance';

interface PieChartWidgetProps {
  entries: Entry[];
  groups: Group[];
  accounts: Account[];
  subgroups: Subgroup[];
  title: string;
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1', '#8B5CF6'];

export function PieChartWidget({ entries, groups, accounts, subgroups, title }: PieChartWidgetProps) {
  const data = groups.map(group => ({
    name: group.name,
    value: entries
      .filter(entry => {
        const account = accounts.find(a => a.id === entry.account_id);
        const subgroup = account ? subgroups.find(s => s.id === account.subgroup_id) : null;
        return subgroup ? subgroup.group_id === group.id : false;
      })
      .reduce((sum, entry) => sum + entry.amount, 0)
  }));

  return (
    <div className="h-80">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}