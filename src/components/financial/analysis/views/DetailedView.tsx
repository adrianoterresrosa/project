import React from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import type { Entry, Account, Group, Subgroup } from '../../../../types/finance';

interface DetailedViewProps {
  entries: Entry[];
  accounts: Account[];
  groups: Group[];
  subgroups: Subgroup[];
  selectedYear: number;
  selectedMonth: number;
}

export function DetailedView({
  entries,
  accounts,
  groups,
  subgroups,
  selectedYear,
  selectedMonth
}: DetailedViewProps) {
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

  const getDetailedData = () => {
    return groups.map(group => {
      const subgroupsInGroup = subgroups.filter(s => s.group_id === group.id);
      
      return {
        group,
        subgroups: subgroupsInGroup.map(subgroup => {
          const accountsInSubgroup = accounts.filter(a => a.subgroup_id === subgroup.id);
          const subgroupEntries = filteredEntries.filter(entry => 
            accountsInSubgroup.some(a => a.id === entry.account_id)
          );

          const planned = subgroupEntries
            .filter(e => e.type === 'planned')
            .reduce((sum, e) => sum + e.amount, 0);

          const actual = subgroupEntries
            .filter(e => e.type === 'actual')
            .reduce((sum, e) => sum + e.amount, 0);

          const performance = planned ? (actual / planned) * 100 : 0;

          return {
            subgroup,
            planned,
            actual,
            performance
          };
        })
      };
    });
  };

  const detailedData = getDetailedData();

  return (
    <div className="space-y-6">
      {detailedData.map(({ group, subgroups }) => (
        <div key={group.id} className="bg-white rounded-xl shadow-sm">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">{group.name}</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                    <th className="pb-3 px-6">Subgrupo</th>
                    <th className="pb-3 px-6 text-right">Previsto</th>
                    <th className="pb-3 px-6 text-right">Realizado</th>
                    <th className="pb-3 px-6 text-right">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subgroups.map(({ subgroup, planned, actual, performance }) => (
                    <tr key={subgroup.id} className="text-sm text-gray-800">
                      <td className="py-4 px-6">{subgroup.name}</td>
                      <td className="py-4 px-6 text-right font-medium">
                        {formatCurrency(planned)}
                      </td>
                      <td className="py-4 px-6 text-right font-medium">
                        {formatCurrency(actual)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end">
                          <span className={`font-medium ${
                            performance >= 100 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {performance.toFixed(1)}%
                          </span>
                          {performance >= 100 ? (
                            <ArrowUpRight className="ml-2 h-4 w-4 text-green-500" />
                          ) : (
                            <ArrowDownRight className="ml-2 h-4 w-4 text-red-500" />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}