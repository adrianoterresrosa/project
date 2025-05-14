import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Target, Wallet } from 'lucide-react';

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

interface CashFlowSummaryProps {
  entries: CashFlowEntry[];
  year: number;
}

export function CashFlowSummary({ entries, year }: CashFlowSummaryProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  // Calcular totais
  const totalPlanned = entries.reduce((sum, entry) => sum + entry.planned_amount, 0);
  const totalActual = entries.reduce((sum, entry) => sum + (entry.actual_amount || 0), 0);
  const performance = totalPlanned ? (totalActual / totalPlanned) * 100 : 0;

  // Calcular totais por tipo
  const calculateTypeTotal = (type: 'revenue' | 'cost' | 'expense') => {
    const typeEntries = entries.filter(entry => entry.type === type);
    return {
      planned: typeEntries.reduce((sum, entry) => sum + entry.planned_amount, 0),
      actual: typeEntries.reduce((sum, entry) => sum + (entry.actual_amount || 0), 0)
    };
  };

  const revenue = calculateTypeTotal('revenue');
  const costs = calculateTypeTotal('cost');
  const expenses = calculateTypeTotal('expense');

  const metrics = [
    {
      title: 'Receita Total',
      value: formatCurrency(revenue.actual),
      planned: formatCurrency(revenue.planned),
      realized: formatCurrency(revenue.actual),
      performance: revenue.planned ? (revenue.actual / revenue.planned) * 100 : 0,
      icon: DollarSign,
      color: 'blue'
    },
    {
      title: 'Custos',
      value: formatCurrency(costs.actual),
      planned: formatCurrency(costs.planned),
      realized: formatCurrency(costs.actual),
      performance: costs.planned ? (costs.actual / costs.planned) * 100 : 0,
      icon: Target,
      color: 'red'
    },
    {
      title: 'Despesas',
      value: formatCurrency(expenses.actual),
      planned: formatCurrency(expenses.planned),
      realized: formatCurrency(expenses.actual),
      performance: expenses.planned ? (expenses.actual / expenses.planned) * 100 : 0,
      icon: Wallet,
      color: 'yellow'
    },
    {
      title: 'Performance Geral',
      value: `${performance.toFixed(1)}%`,
      trend: performance >= 100 ? 'up' : 'down',
      icon: TrendingUp,
      color: performance >= 100 ? 'green' : 'red'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-white rounded-xl shadow-sm p-6 border border-gray-200"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">
              {metric.title}
            </span>
            <div className={`p-2 rounded-lg bg-${metric.color}-100`}>
              <metric.icon className={`h-5 w-5 text-${metric.color}-600`} />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold text-gray-900">
                {metric.value}
              </span>
              {metric.trend && (
                <span className={`flex items-center text-${metric.trend === 'up' ? 'green' : 'red'}-600`}>
                  {metric.trend === 'up' ? (
                    <ArrowUpRight className="h-5 w-5" />
                  ) : (
                    <ArrowDownRight className="h-5 w-5" />
                  )}
                </span>
              )}
            </div>

            {metric.planned && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Previsto:</span>
                <span className="font-medium text-gray-900">{metric.planned}</span>
              </div>
            )}

            {metric.realized && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Realizado:</span>
                <span className="font-medium text-gray-900">{metric.realized}</span>
              </div>
            )}

            {metric.performance && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Performance:</span>
                <span className={`font-medium ${
                  metric.performance >= 100 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {metric.performance.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}