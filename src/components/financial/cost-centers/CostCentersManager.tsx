import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface CostCenter {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  created_at: string;
  total_amount?: number;
}

export function CostCentersManager() {
  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCostCenter, setEditingCostCenter] = useState<CostCenter | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchCostCenters();
  }, []);

  const fetchCostCenters = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // First get all cost centers
      const { data: costCentersData, error: costCentersError } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('name');

      if (costCentersError) throw costCentersError;

      // Then get the total amounts from entry_cost_centers and account groups
      const { data: entriesData, error: entriesError } = await supabase
        .from('entry_cost_centers')
        .select(`
          cost_center_id,
          amount,
          entry:entries(
            account:accounts(
              subgroup:subgroups(
                group:groups(
                  name
                )
              )
            )
          )
        `);

      if (entriesError) throw entriesError;

      // Calculate totals considering positive and negative values based on group
      const costCentersWithTotals = costCentersData.map(cc => {
        const entries = entriesData?.filter(e => e.cost_center_id === cc.id) || [];
        const total = entries.reduce((sum, entry) => {
          const groupName = entry.entry?.account?.subgroup?.group?.name;
          const isPositive = groupName === 'Receita' || groupName === 'Receita Financeira';
          return sum + (isPositive ? entry.amount : -entry.amount);
        }, 0);

        return {
          ...cc,
          total_amount: total
        };
      });

      setCostCenters(costCentersWithTotals);
    } catch (error) {
      console.error('Erro ao carregar centros de custos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: { name: string; description: string }) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      if (editingCostCenter) {
        const { error } = await supabase
          .from('cost_centers')
          .update({
            name: formData.name,
            description: formData.description
          })
          .eq('id', editingCostCenter.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('cost_centers')
          .insert([{
            user_id: userData.user.id,
            name: formData.name,
            description: formData.description,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setCostCenters([...costCenters, { ...data, total_amount: 0 }]);
        }
      }

      setIsModalOpen(false);
      setEditingCostCenter(null);
      await fetchCostCenters();
    } catch (error) {
      console.error('Erro ao salvar centro de custo:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este centro de custo?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cost_centers')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setCostCenters(costCenters.filter(cc => cc.id !== id));
    } catch (error) {
      console.error('Erro ao excluir centro de custo:', error);
    }
  };

  const filteredCostCenters = costCenters.filter(cc =>
    cc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Centros de Custos</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Centro de Custo
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar centros de custos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-6">Nome</th>
                  <th className="pb-3 px-6">Descrição</th>
                  <th className="pb-3 px-6 text-right">Total Alocado</th>
                  <th className="pb-3 px-6 text-center">Status</th>
                  <th className="pb-3 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredCostCenters.map((costCenter) => (
                  <tr key={costCenter.id} className="text-sm text-gray-800">
                    <td className="py-4 px-6">{costCenter.name}</td>
                    <td className="py-4 px-6">{costCenter.description}</td>
                    <td className={`py-4 px-6 text-right font-medium ${
                      costCenter.total_amount && costCenter.total_amount < 0 
                        ? 'text-red-600' 
                        : 'text-green-600'
                    }`}>
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL'
                      }).format(costCenter.total_amount || 0)}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        costCenter.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {costCenter.is_active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => {
                            setEditingCostCenter(costCenter);
                            setIsModalOpen(true);
                          }}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(costCenter.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingCostCenter(null);
        }}
        title={editingCostCenter ? 'Editar Centro de Custo' : 'Novo Centro de Custo'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSave({
              name: formData.get('name') as string,
              description: formData.get('description') as string
            });
          }}
          className="space-y-6"
        >
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome
            </label>
            <input
              type="text"
              name="name"
              defaultValue={editingCostCenter?.name}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição
            </label>
            <textarea
              name="description"
              defaultValue={editingCostCenter?.description}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingCostCenter(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {editingCostCenter ? 'Salvar Alterações' : 'Criar Centro de Custo'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}