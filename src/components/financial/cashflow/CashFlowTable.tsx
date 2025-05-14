import React, { useState } from 'react';
import { ArrowUpRight, ArrowDownRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface CashFlowEntry {
  id: string;
  year: number;
  month: number;
  category: string;
  type: 'revenue' | 'cost' | 'expense';
  description: string;
  planned_amount: number;
  actual_amount: number | null;
  created_at: string;
}

interface CashFlowTableProps {
  entries: CashFlowEntry[];
  year: number;
}

export function CashFlowTable({ entries, year }: CashFlowTableProps) {
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Estado para controlar o trimestre visível
  const [currentQuarter, setCurrentQuarter] = useState(0); // 0-3 para os 4 trimestres
  const visibleMonths = months.slice(currentQuarter * 3, (currentQuarter + 1) * 3);

  const formatCurrency = (value: number | null) => {
    if (value === null) return '-';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const calculatePerformance = (planned: number, actual: number | null) => {
    if (!actual || !planned) return 0;
    return (actual / planned) * 100;
  };

  const calculateAV = (value: number, totalPlanned: number) => {
    if (!totalPlanned) return 0;
    return (value / totalPlanned) * 100;
  };

  // Agrupar entradas por categoria
  const groupedEntries = entries.reduce((acc, entry) => {
    if (!acc[entry.category]) {
      acc[entry.category] = Array(12).fill(null).map(() => ({
        planned: 0,
        actual: null
      }));
    }
    const monthIndex = entry.month - 1;
    acc[entry.category][monthIndex] = {
      planned: entry.planned_amount,
      actual: entry.actual_amount
    };
    return acc;
  }, {} as Record<string, Array<{ planned: number; actual: number | null }>>);

  // Calcular totais
  const calculateMonthlyTotals = () => {
    return Array(12).fill(null).map((_, monthIndex) => {
      const monthlyPlanned = Object.values(groupedEntries).reduce(
        (sum, entries) => sum + (entries[monthIndex]?.planned || 0),
        0
      );
      const monthlyActual = Object.values(groupedEntries).reduce(
        (sum, entries) => sum + (entries[monthIndex]?.actual || 0),
        0
      );
      return { planned: monthlyPlanned, actual: monthlyActual };
    });
  };

  const monthlyTotals = calculateMonthlyTotals();

  const handlePreviousQuarter = () => {
    setCurrentQuarter(prev => (prev > 0 ? prev - 1 : 3));
  };

  const handleNextQuarter = () => {
    setCurrentQuarter(prev => (prev < 3 ? prev + 1 : 0));
  };

  return (
    <div className="space-y-4">
      {/* Navegação entre trimestres */}
      <div className="flex items-center justify-between px-4">
        <button
          onClick={handlePreviousQuarter}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronLeft className="h-5 w-5 text-gray-500" />
        </button>
        <span className="text-sm font-medium text-gray-700">
          {`${currentQuarter * 3 + 1}º ao ${(currentQuarter + 1) * 3}º mês`}
        </span>
        <button
          onClick={handleNextQuarter}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ChevronRight className="h-5 w-5 text-gray-500" />
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Categoria
                </th>
                {visibleMonths.map((month, index) => (
                  <th key={month} colSpan={4} className="text-center border-l border-gray-200">
                    <div className="px-6 py-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {month}
                      </span>
                    </div>
                  </th>
                ))}
                <th colSpan={4} className="text-center border-l border-gray-200">
                  <div className="px-6 py-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Trimestre
                    </span>
                  </div>
                </th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-2 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  &nbsp;
                </th>
                {[...Array(4)].map((_, i) => (
                  <React.Fragment key={i}>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                      Prev
                    </th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Real
                    </th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AH
                    </th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AV
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedEntries).map(([category, monthlyData], rowIndex) => {
                const quarterData = monthlyData.slice(currentQuarter * 3, (currentQuarter + 1) * 3);
                const quarterPlanned = quarterData.reduce((sum, data) => sum + data.planned, 0);
                const quarterActual = quarterData.reduce((sum, data) => sum + (data.actual || 0), 0);
                const quarterPerformance = calculatePerformance(quarterPlanned, quarterActual);

                return (
                  <tr key={category} className={rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="py-2 px-6 text-sm font-medium text-gray-900">
                      {category}
                    </td>
                    {quarterData.map((data, monthIndex) => {
                      const performance = calculatePerformance(data.planned, data.actual);
                      const av = calculateAV(data.planned, monthlyTotals[currentQuarter * 3 + monthIndex].planned);

                      return (
                        <React.Fragment key={monthIndex}>
                          <td className="py-2 px-2 text-right text-sm text-gray-900 border-l border-gray-200">
                            {formatCurrency(data.planned)}
                          </td>
                          <td className="py-2 px-2 text-right text-sm text-gray-900">
                            {formatCurrency(data.actual)}
                          </td>
                          <td className="py-2 px-2 text-right text-sm">
                            {data.actual && (
                              <div className="flex items-center justify-end">
                                <span className={performance >= 100 ? 'text-green-600' : 'text-red-600'}>
                                  {performance.toFixed(1)}%
                                </span>
                                {performance >= 100 ? (
                                  <ArrowUpRight className="h-4 w-4 text-green-500 ml-1" />
                                ) : (
                                  <ArrowDownRight className="h-4 w-4 text-red-500 ml-1" />
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2 px-2 text-right text-sm text-gray-900">
                            {av.toFixed(1)}%
                          </td>
                        </React.Fragment>
                      );
                    })}
                    {/* Totais do trimestre */}
                    <td className="py-2 px-2 text-right text-sm font-medium text-gray-900 border-l border-gray-200">
                      {formatCurrency(quarterPlanned)}
                    </td>
                    <td className="py-2 px-2 text-right text-sm font-medium text-gray-900">
                      {formatCurrency(quarterActual)}
                    </td>
                    <td className="py-2 px-2 text-right text-sm">
                      <div className="flex items-center justify-end">
                        <span className={quarterPerformance >= 100 ? 'text-green-600' : 'text-red-600'}>
                          {quarterPerformance.toFixed(1)}%
                        </span>
                        {quarterPerformance >= 100 ? (
                          <ArrowUpRight className="h-4 w-4 text-green-500 ml-1" />
                        ) : (
                          <ArrowDownRight className="h-4 w-4 text-red-500 ml-1" />
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-2 text-right text-sm font-medium text-gray-900">
                      100%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}