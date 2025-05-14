import React, { useState } from 'react';
import { Plus, Save } from 'lucide-react';
import { supabase } from '../../../lib/supabase';

interface CashFlowFormProps {
  onSave: () => void;
  initialData?: any;
  isEditing?: boolean;
}

export function CashFlowForm({ onSave, initialData, isEditing = false }: CashFlowFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    year: initialData?.year || new Date().getFullYear(),
    month: initialData?.month || new Date().getMonth() + 1,
    category: initialData?.category || '',
    type: initialData?.type || 'revenue', // revenue, cost, expense
    description: initialData?.description || '',
    planned_amount: initialData?.planned_amount || '',
    actual_amount: initialData?.actual_amount || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user logged in');

      const entry = {
        ...formData,
        user_id: userData.user.id,
      };

      let error;
      if (isEditing && initialData?.id) {
        ({ error } = await supabase
          .from('cash_flow_entries')
          .update(entry)
          .eq('id', initialData.id));
      } else {
        ({ error } = await supabase
          .from('cash_flow_entries')
          .insert([entry]));
      }

      if (error) throw error;
      onSave();
      
      if (!isEditing) {
        setFormData({
          ...formData,
          description: '',
          planned_amount: '',
          actual_amount: '',
        });
      }
    } catch (error) {
      console.error('Error saving cash flow entry:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">
        {isEditing ? 'Editar Lançamento' : 'Novo Lançamento'}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano
          </label>
          <input
            type="number"
            value={formData.year}
            onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Mês
          </label>
          <select
            value={formData.month}
            onChange={(e) => setFormData({ ...formData, month: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="revenue">Receita</option>
            <option value="cost">Custo</option>
            <option value="expense">Despesa</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Categoria
          </label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Previsto
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.planned_amount}
            onChange={(e) => setFormData({ ...formData, planned_amount: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Realizado
          </label>
          <input
            type="number"
            step="0.01"
            value={formData.actual_amount}
            onChange={(e) => setFormData({ ...formData, actual_amount: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="mt-6">
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          {isEditing ? (
            <Save className="w-4 h-4 mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          {loading ? 'Salvando...' : isEditing ? 'Salvar Alterações' : 'Adicionar Lançamento'}
        </button>
      </div>
    </form>
  );
}