import React, { useState } from 'react';
import { Search } from 'lucide-react';

interface CashFlowFilters {
  search: string;
  type: string;
  status: string;
}

interface CashFlowFiltersProps {
  onFilter: (filters: CashFlowFilters) => void;
}

export function CashFlowFilters({ onFilter }: CashFlowFiltersProps) {
  const [filters, setFilters] = useState<CashFlowFilters>({
    search: '',
    type: '',
    status: ''
  });

  const handleChange = (key: keyof CashFlowFilters, value: string) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onFilter(newFilters);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Buscar
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleChange('search', e.target.value)}
              placeholder="Buscar por descrição..."
              className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos os tipos</option>
            <option value="revenue">Receita</option>
            <option value="cost">Custo</option>
            <option value="expense">Despesa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Todos os status</option>
            <option value="planned">Apenas Previsto</option>
            <option value="realized">Apenas Realizado</option>
            <option value="pending">Pendente</option>
          </select>
        </div>
      </div>
    </div>
  );
}