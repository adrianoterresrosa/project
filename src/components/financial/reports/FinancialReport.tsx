import React from 'react';
import { Download, Filter } from 'lucide-react';
import type { Entry } from '../../../types/finance';

interface FinancialReportProps {
  entries: Entry[];
}

export function FinancialReport({ entries }: FinancialReportProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Relatório Financeiro</h2>
          <div className="flex space-x-2">
            <button className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4 mr-2 inline" />
              Filtrar
            </button>
            <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4 mr-2 inline" />
              Exportar
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500">
                <th className="pb-3 px-6">Data</th>
                <th className="pb-3 px-6">Descrição</th>
                <th className="pb-3 px-6">Tipo</th>
                <th className="pb-3 px-6 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map((entry) => (
                <tr key={entry.id} className="text-sm text-gray-800">
                  <td className="py-4 px-6">{formatDate(entry.date)}</td>
                  <td className="py-4 px-6">{entry.description}</td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      entry.type === 'planned' 
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.type === 'planned' ? 'Previsto' : 'Realizado'}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right font-medium">
                    {formatCurrency(entry.amount)}
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