import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Entry, Account, Group, Subgroup } from '../../../types/finance';

interface AnalysisTableProps {
  entries: Entry[];
  accounts: Account[];
  groups: Group[];
  subgroups: Subgroup[];
  selectedYear: number;
  selectedMonth: number;
  view: 'overview' | 'detailed' | 'comparison';
}

export function AnalysisTable({
  entries,
  accounts,
  groups,
  subgroups,
  selectedYear,
  selectedMonth,
  view
}: AnalysisTableProps) {
  const filteredEntries = entries.filter(entry => {
    const entryDate = new Date(entry.date);
    return entryDate.getFullYear() === selectedYear && entryDate.getMonth() + 1 === selectedMonth;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getAnalysisData = () => {
    return groups.map(group => {
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

      const performance = planned ? (actual / planned) * 100 : 0;
      const variance = actual - planned;

      return {
        group: group.name,
        planned,
        actual,
        performance,
        variance
      };
    });
  };

  const analysisData = getAnalysisData();

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-6">
          {view === 'overview' ? 'Análise por Grupo' :
           view === 'detailed' ? 'Análise Detalhada' : 'Análise Comparativa'}
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-6">Grupo</th>
                <th className="pb-3 px-6 text-right">Previsto</th>
                <th className="pb-3 px-6 text-right">Realizado</th>
                <th className="pb-3 px-6 text-right">Performance</th>
                <th className="pb-3 px-6 text-right">Variação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {analysisData.map((data, index) => (
                <tr key={index} className="text-sm text-gray-800">
                  <td className="py-4 px-6">{data.group}</td>
                  <td className="py-4 px-6 text-right font-medium">
                    {formatCurrency(data.planned)}
                  </td>
                  <td className="py-4 px-6 text-right font-medium">
                    {formatCurrency(data.actual)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end">
                      <span className={`font-medium ${
                        data.performance >= 100 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(data.performance)}
                      </span>
                      {data.performance >= 100 ? (
                        <ArrowUpRight className="ml-2 h-4 w-4 text-green-500" />
                      ) : (
                        <ArrowDownRight className="ml-2 h-4 w-4 text-red-500" />
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <span className={data.variance >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {formatCurrency(Math.abs(data.variance))}
                      {data.variance >= 0 ? ' ▲' : ' ▼'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}