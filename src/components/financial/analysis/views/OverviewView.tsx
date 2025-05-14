import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import type { Entry, Account, Group, Subgroup } from '../../../../types/finance';

interface OverviewViewProps {
  entries: Entry[];
  accounts: Account[];
  groups: Group[];
  subgroups: Subgroup[];
  selectedYear: number;
  selectedMonth: number;
}

export function OverviewView({
  entries,
  accounts,
  groups,
  subgroups,
  selectedYear,
  selectedMonth
}: OverviewViewProps) {
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getFullYear() === selectedYear && entryDate.getMonth() + 1 === selectedMonth;
  });

  // Dados por grupo
  const groupData = groups.map(group => {
    const groupEntries = filteredEntries.filter(entry => {
      const account = accounts.find(a => a.id === entry.account_id);
      const subgroup = account ? subgroups.find(s => s.id === account.subgroup_id) : null;
      return subgroup ? subgroup.group_id === group.id : false;
    });

    const planned = groupEntries
      .filter(e => e.type === 'planned')
      .reduce((sum, e) => sum + e.amount, 0);

    const actual = groupEntries
      .filter(e => e.type === 'actual')
      .reduce((sum, e) => sum + e.amount, 0);

    return {
      name: group.name,
      planned,
      actual
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Visão Geral por Grupo</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={groupData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
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
    </div>
  );
}