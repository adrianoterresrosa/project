import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, PieChart, BarChart3 } from 'lucide-react';
import type { Entry, Account, Group, Subgroup } from '../../../types/finance';

interface AnalysisSummaryProps {
  entries: Entry[];
  accounts: Account[];
  groups: Group[];
  subgroups: Subgroup[];
  selectedYear: number;
  selectedMonth: number;
}

export function AnalysisSummary({
  entries,
  accounts,
  groups,
  subgroups,
  selectedYear,
  selectedMonth
}: AnalysisSummaryProps) {
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getFullYear() === selectedYear && entryDate.getMonth() + 1 === selectedMonth;
  });

  const totalPlanned = filteredEntries
    .filter(e => e.type === 'planned')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalActual = filteredEntries
    .filter(e => e.type === 'actual')
    .reduce((sum, e) => sum + e.amount, 0);

  const performance = totalPlanned ? (totalActual / totalPlanned) * 100 : 0;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Análise por grupo
  const groupAnalysis = groups.map(group => {
    const groupEntries = filteredEntries.filter(entry => {
      const account = accounts.find(a => a.id === entry.account_id);
      const subgroup = account ? subgroups.find(s => s.id === account.subgroup_id) : null;
      return subgroup ? subgroup.group_id === group.id : false;
    });

    const total = groupEntries.reduce((sum, entry) => sum + entry.amount, 0);
    const percentage = totalActual ? (total / totalActual) * 100 : 0;

    return {
      name: group.name,
      total,
      percentage
    };
  });

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Previsto</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalPlanned)}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-full">
            <DollarSign className="h-6 w-6 text-blue-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Realizado</p>
            <p className="text-2xl font-semibold">{formatCurrency(totalActual)}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-full">
            <TrendingUp className="h-6 w-6 text-green-600" />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Performance</p>
            <div className="flex items-center">
              <p className="text-2xl font-semibold">{performance.toFixed(1)}%</p>
              {performance >= 100 ? (
                <ArrowUpRight className="ml-2 h-5 w-5 text-green-500" />
              ) : (
                <ArrowDownRight className="ml-2 h-5 w-5 text-red-500" />
              )}
            </div>
          </div>
          <div className={`p-3 rounded-full ${
            performance >= 100 ? 'bg-green-50' : 'bg-red-50'
          }`}>
            <BarChart3 className={`h-6 w-6 ${
              performance >= 100 ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500">Distribuição</p>
            <p className="text-2xl font-semibold">{groups.length} grupos</p>
          </div>
          <div className="p-3 bg-purple-50 rounded-full">
            <PieChart className="h-6 w-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  );
}