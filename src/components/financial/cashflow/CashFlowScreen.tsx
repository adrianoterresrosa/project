import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Download, Filter, Calendar } from 'lucide-react';
import { CashFlowTable } from './CashFlowTable';
import { CashFlowSummary } from './CashFlowSummary';
import { CashFlowFilters } from './CashFlowFilters';
import { supabase } from '../../../lib/supabase';

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

export function CashFlowScreen() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [showFilters, setShowFilters] = useState(false);
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEntries();
  }, [selectedYear]);

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('cash_flow_entries')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('year', selectedYear)
        .order('month', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Erro ao carregar entradas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePreviousYear = () => {
    setSelectedYear(prev => prev - 1);
  };

  const handleNextYear = () => {
    setSelectedYear(prev => prev + 1);
  };

  const handleExport = () => {
    // Implementar exportação para Excel/CSV
    const data = entries.map(entry => ({
      Ano: entry.year,
      Mês: entry.month,
      Categoria: entry.category,
      Tipo: entry.type,
      Descrição: entry.description,
      'Valor Previsto': entry.planned_amount,
      'Valor Realizado': entry.actual_amount || 0
    }));

    // Criar CSV
    const headers = Object.keys(data[0]).join(',');
    const rows = data.map(obj => Object.values(obj).join(','));
    const csv = [headers, ...rows].join('\n');

    // Download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `fluxo-de-caixa-${selectedYear}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa</h1>
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={handlePreviousYear}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex items-center px-3">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">{selectedYear}</span>
            </div>
            <button
              onClick={handleNextYear}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center transition-colors"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filtros
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center transition-colors"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </button>
        </div>
      </div>

      {/* Filtros */}
      {showFilters && (
        <CashFlowFilters 
          onFilter={(filters) => {
            // Implementar filtros
            console.log('Filtros:', filters);
          }} 
        />
      )}

      {/* Resumo */}
      <CashFlowSummary entries={entries} year={selectedYear} />

      {/* Tabela */}
      <CashFlowTable entries={entries} year={selectedYear} />
    </div>
  );
}