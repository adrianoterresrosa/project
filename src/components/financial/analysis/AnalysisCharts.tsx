import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Entry, Account, Group, Subgroup } from '../../../types/finance';

interface AnalysisChartsProps {
  entries: Entry[];
  accounts: Account[];
  groups: Group[];
  subgroups: Subgroup[];
  selectedYear: number;
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1', '#8B5CF6'];

export function AnalysisCharts({
  entries,
  accounts,
  groups,
  subgroups,
  selectedYear
}: AnalysisChartsProps) {
  const yearEntries = entries.filter(entry => 
    new Date(entry.date).getFullYear() === selectedYear
  );

  // Dados mensais
  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = new Date(selectedYear, i).toLocaleDateString('pt-BR', { month: 'short' });
    const monthEntries = yearEntries.filter(entry => 
      new Date(entry.date).getMonth() === i
    );

    return {
      month,
      planned: monthEntries
        .filter(e => e.type === 'planned')
        .reduce((sum, e) => sum + e.amount, 0),
      actual: monthEntries
        .filter(e => e.type === 'actual')
        .reduce((sum, e) => sum + e.amount, 0)
    };
  });

  // Dados por grupo
  const groupData = groups.map(group => {
    const groupEntries = yearEntries.filter(entry => {
      const account = accounts.find(a => a.id === entry.account_id);
      const subgroup = account ? subgroups.find(s => s.id === account.subgroup_id) : null;
      return subgroup ? subgroup.group_id === group.id : false;
    });

    return {
      name: group.name,
      value: groupEntries.reduce((sum, entry) => sum + entry.amount, 0)
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Evolução Mensal</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis tickFormatter={(value) => formatCurrency(value)} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
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
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Grupo</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={groupData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {groupData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}