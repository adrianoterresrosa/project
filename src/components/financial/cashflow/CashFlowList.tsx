import React, { useState } from 'react';
import { Edit2, Trash2, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CashFlowListProps {
  entries: any[];
  onEdit: (entry: any) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
}

export function CashFlowList({ entries, onEdit, onDelete, onRefresh }: CashFlowListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [selectedType, setSelectedType] = useState('all');

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este lançamento?')) {
      try {
        const { error } = await supabase
          .from('cash_flow_entries')
          .delete()
          .eq('id', id);

        if (error) throw error;
        onDelete(id);
      } catch (error) {
        console.error('Error deleting entry:', error);
      }
    }
  };

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = entry.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMonth = selectedMonth === 'all' || entry.month.toString() === selectedMonth;
    const matchesType = selectedType === 'all' || entry.type === selectedType;

    return matchesSearch && matchesMonth && matchesType;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getMonthName = (month: number) => {
    return new Date(2000, month - 1).toLocaleString('pt-BR', { month: 'long' });
  };

  const calculatePerformance = (planned: number, actual: number) => {
    if (!planned) return 0;
    return (actual / planned) * 100;
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
          <h2 className="text-xl font-semibold text-gray-900">Lançamentos</h2>
          
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar lançamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os meses</option>
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i + 1} value={i + 1}>
                  {getMonthName(i + 1)}
                </option>
              ))}
            </select>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os tipos</option>
              <option value="revenue">Receitas</option>
              <option value="cost">Custos</option>
              <option value="expense">Despesas</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-6">Mês</th>
                <th className="pb-3 px-6">Categoria</th>
                <th className="pb-3 px-6">Descrição</th>
                <th className="pb-3 px-6">Tipo</th>
                <th className="pb-3 px-6 text-right">Previsto</th>
                <th className="pb-3 px-6 text-right">Realizado</th>
                <th className="pb-3 px-6 text-right">Performance</th>
                <th className="pb-3 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((entry) => {
                const performance = calculatePerformance(entry.planned_amount, entry.actual_amount);
                
                return (
                  <tr key={entry.id} className="text-sm text-gray-800">
                    <td className="py-4 px-6">{getMonthName(entry.month)}</td>
                    <td className="py-4 px-6">{entry.category}</td>
                    <td className="py-4 px-6">{entry.description}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.type === 'revenue' ? 'bg-green-100 text-green-800' :
                        entry.type === 'cost' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {entry.type === 'revenue' ? 'Receita' :
                         entry.type === 'cost' ? 'Custo' : 'Despesa'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      {formatCurrency(entry.planned_amount)}
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      {formatCurrency(entry.actual_amount || 0)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end">
                        <span className={`font-medium ${
                          performance >= 100 ? 'text-green-600' : 'text-red-600'
                        }`}>
                          {performance.toFixed(1)}%
                        </span>
                        {performance >= 100 ? (
                          <ArrowUpCircle className="ml-2 h-4 w-4 text-green-500" />
                        ) : (
                          <ArrowDownCircle className="ml-2 h-4 w-4 text-red-500" />
                        )}
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => onEdit(entry)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
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