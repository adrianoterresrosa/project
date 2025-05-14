import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Entry, Account, Group, Subgroup } from '../../../../types/finance';

interface ComparisonViewProps {
  entries: Entry[];
  accounts: Account[];
  groups: Group[];
  subgroups: Subgroup[];
  selectedYear: number;
}

export function ComparisonView({
  entries,
  accounts,
  groups,
  subgroups,
  selectedYear
}: ComparisonViewProps) {
  // Dados mensais por grupo
  const getMonthlyData = () => {
    return Array.from({ length: 12 }, (_, month) => {
      const monthEntries = entries.filter(entry => {
        const entryDate = new Date(entry.date);
        return entryDate.getFullYear() === selectedYear && entryDate.getMonth() === month;
      });

      const groupData = groups.reduce((acc, group) => {
        const groupEntries = monthEntries.filter(entry => {
          const account = accounts.find(a => a.id === entry.account_id);
          const subgroup = account ? subgroups.find(s => s.id === account.subgroup_id) : null;
          return subgroup ? subgroup.group_id === group.id : false;
        });

        const actual = groupEntries
          .filter(e => e.type === 'actual')
          .reduce((sum, e) => sum + e.amount, 0);

        acc[group.name] = actual;
        return acc;
      }, {} as Record<string, number>);

      return {
        month: new Date(selectedYear, month).toLocaleDateString('pt-BR', { month: 'short' }),
        ...groupData
      };
    });
  };

  const monthlyData = getMonthlyData();
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Cores para cada grupo
  const colors = ['#6366F1', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Comparativo Mensal por Grupo</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              {groups.map((group, index) => (
                <Line
                  key={group.id}
                  type="monotone"
                  dataKey={group.name}
                  name={group.name}
                  stroke={colors[index % colors.length]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}