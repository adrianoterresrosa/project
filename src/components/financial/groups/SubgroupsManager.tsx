import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2 } from 'lucide-react';
import type { Group, Subgroup } from '../../../types/finance';

export function SubgroupsManager() {
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newSubgroup, setNewSubgroup] = useState({ name: '', group_id: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const [subgroupsResult, groupsResult] = await Promise.all([
        supabase
          .from('subgroups')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('name'),
        supabase
          .from('groups')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('name')
      ]);

      if (subgroupsResult.error) throw subgroupsResult.error;
      if (groupsResult.error) throw groupsResult.error;

      setSubgroups(subgroupsResult.data || []);
      setGroups(groupsResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSubgroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('subgroups')
        .insert([{
          name: newSubgroup.name,
          group_id: newSubgroup.group_id,
          user_id: userData.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        setSubgroups([...subgroups, data]);
        setNewSubgroup({ name: '', group_id: '' });
      }
    } catch (error) {
      console.error('Erro ao adicionar subgrupo:', error);
    }
  };

  const handleDeleteSubgroup = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este subgrupo?')) {
      try {
        const { error } = await supabase
          .from('subgroups')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setSubgroups(subgroups.filter(subgroup => subgroup.id !== id));
      } catch (error) {
        console.error('Erro ao excluir subgrupo:', error);
      }
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Subgrupos</h1>
      </div>

      {/* Form */}
      <form onSubmit={handleAddSubgroup} className="bg-white p-6 rounded-xl shadow-sm">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <select
            value={newSubgroup.group_id}
            onChange={(e) => setNewSubgroup({ ...newSubgroup, group_id: e.target.value })}
            className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione um grupo</option>
            {groups.map(group => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>

          <input
            type="text"
            value={newSubgroup.name}
            onChange={(e) => setNewSubgroup({ ...newSubgroup, name: e.target.value })}
            placeholder="Nome do subgrupo"
            className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />

          <button
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Subgrupo
          </button>
        </div>
      </form>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-6">Nome</th>
                  <th className="pb-3 px-6">Grupo</th>
                  <th className="pb-3 px-6">Data de Criação</th>
                  <th className="pb-3 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subgroups.map((subgroup) => {
                  const group = groups.find(g => g.id === subgroup.group_id);
                  
                  return (
                    <tr key={subgroup.id} className="text-sm text-gray-800">
                      <td className="py-4 px-6">{subgroup.name}</td>
                      <td className="py-4 px-6">{group?.name || 'N/A'}</td>
                      <td className="py-4 px-6">
                        {new Date(subgroup.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-3">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteSubgroup(subgroup.id)}
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
    </div>
  );
}