import React from 'react';
import { ArrowUpRight, ArrowDownRight, DollarSign, TrendingUp, Target, Wallet } from 'lucide-react';
import type { Entry } from '../../../../types/finance';

interface MetricsWidgetProps {
  entries: Entry[];
  title: string;
}

export function MetricsWidget({ entries, title }: MetricsWidgetProps) {
  const totalPlanned = entries
    .filter(e => e.type === 'planned')
    .reduce((sum, e) => sum + e.amount, 0);

  const totalActual = entries
    .filter(e => e.type === 'actual')
    .reduce((sum, e) => sum + e.amount, 0);

  const performance = totalActual / totalPlanned * 100;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value);
  };

  const metrics = [
    {
      title: 'Previsto',
      value: formatCurrency(totalPlanned),
      icon: Target,
      color: 'blue',
      trend: null
    },
    {
      title: 'Realizado',
      value: formatCurrency(totalActual),
      icon: Wallet,
      color: 'green',
      trend: null
    },
    {
      title: 'Performance',
      value: `${performance.toFixed(1)}%`,
      icon: TrendingUp,
      color: performance >= 100 ? 'green' : 'red',
      trend: performance >= 100 ? 'up' : 'down'
    }
  ];

  const getBackgroundColor = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-600';
      case 'green':
        return 'bg-emerald-600';
      case 'red':
        return 'bg-rose-600';
      default:
        return 'bg-gray-600';
    }
  };

  const getIconBackground = (color: string) => {
    switch (color) {
      case 'blue':
        return 'bg-blue-100 text-blue-600';
      case 'green':
        return 'bg-emerald-100 text-emerald-600';
      case 'red':
        return 'bg-rose-100 text-rose-600';
      default:
        return 'bg-gray-100 text-gray-600';
    }
  };

  const getHoverEffect = (color: string) => {
    switch (color) {
      case 'blue':
        return 'hover:bg-blue-700';
      case 'green':
        return 'hover:bg-emerald-700';
      case 'red':
        return 'hover:bg-rose-700';
      default:
        return 'hover:bg-gray-700';
    }
  };

  return (
    <div className="flex flex-col space-y-4 w-full">
      {metrics.map((metric, index) => {
        const Icon = metric.icon;
        const bgColor = getBackgroundColor(metric.color);
        const iconBg = getIconBackground(metric.color);
        const hoverEffect = getHoverEffect(metric.color);

        return (
          <div
            key={index}
            className={`relative rounded-xl ${bgColor} ${hoverEffect} p-6 transition-all duration-200 ease-in-out transform hover:scale-[1.02] hover:shadow-lg`}
          >
            <div className="flex flex-col h-full relative z-10">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-white">
                  {metric.title}
                </span>
                <div className={`p-2 rounded-xl ${iconBg}`}>
                  <Icon className="h-5 w-5" />
                </div>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-white">
                  {metric.value}
                </span>
                {metric.trend && (
                  <span className={`inline-flex items-center text-white`}>
                    {metric.trend === 'up' ? (
                      <ArrowUpRight className="h-5 w-5" />
                    ) : (
                      <ArrowDownRight className="h-5 w-5" />
                    )}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}