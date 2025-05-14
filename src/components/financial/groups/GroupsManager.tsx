import React, { useState, useEffect } from 'react';
import { supabase, withRetry } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, AlertCircle } from 'lucide-react';
import type { Group } from '../../../types/finance';

export function GroupsManager() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGroupName, setNewGroupName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState(false);

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data: userData } = await withRetry(() => supabase.auth.getUser());
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await withRetry(() => 
        supabase
          .from('groups')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('name')
      );

      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Erro ao carregar grupos:', error);
      setError('Erro ao carregar grupos. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleAddGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (addLoading) return;

    try {
      setAddLoading(true);
      setError(null);

      const { data: userData } = await withRetry(() => supabase.auth.getUser());
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Verificar se o grupo já existe
      const { data: existingGroups } = await withRetry(() =>
        supabase
          .from('groups')
          .select('name')
          .eq('user_id', userData.user.id)
          .eq('name', newGroupName)
      );

      if (existingGroups && existingGroups.length > 0) {
        setError('Já existe um grupo com este nome.');
        return;
      }

      const { data, error } = await withRetry(() =>
        supabase
          .from('groups')
          .insert([{ 
            name: newGroupName, 
            user_id: userData.user.id 
          }])
          .select()
          .single()
      );

      if (error) throw error;
      if (data) {
        setGroups(prevGroups => [...prevGroups, data].sort((a, b) => a.name.localeCompare(b.name)));
        setNewGroupName('');
      }
    } catch (error) {
      console.error('Erro ao adicionar grupo:', error);
      setError('Erro ao adicionar grupo. Por favor, tente novamente.');
    } finally {
      setAddLoading(false);
    }
  };

  const handleDeleteGroup = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este grupo? Todos os subgrupos e contas relacionados também serão excluídos.')) {
      return;
    }

    try {
      setError(null);
      setDeleteLoading(id);

      const { data: userData } = await withRetry(() => supabase.auth.getUser());
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { error } = await withRetry(() =>
        supabase
          .from('groups')
          .delete()
          .eq('id', id)
          .eq('user_id', userData.user.id)
      );

      if (error) throw error;

      setGroups(prevGroups => prevGroups.filter(group => group.id !== id));
    } catch (error) {
      console.error('Erro ao excluir grupo:', error);
      setError('Erro ao excluir grupo. Por favor, tente novamente.');
      await fetchGroups(); // Recarregar grupos para garantir sincronização
    } finally {
      setDeleteLoading(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Grupos</h1>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start">
          <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 mr-3 flex-shrink-0" />
          <div className="flex-1 text-sm text-red-700">{error}</div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleAddGroup} className="bg-white p-6 rounded-xl shadow-sm">
        <div className="flex space-x-4">
          <input
            type="text"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="Nome do grupo"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            disabled={addLoading}
          />
          <button
            type="submit"
            disabled={addLoading}
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center ${
              addLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Plus className={`h-5 w-5 mr-2 ${addLoading ? 'animate-spin' : ''}`} />
            {addLoading ? 'Adicionando...' : 'Adicionar Grupo'}
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
                  <th className="pb-3 px-6">Data de Criação</th>
                  <th className="pb-3 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {groups.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-gray-500">
                      Nenhum grupo encontrado. Adicione seu primeiro grupo!
                    </td>
                  </tr>
                ) : (
                  groups.map((group) => (
                    <tr key={group.id} className="text-sm text-gray-800">
                      <td className="py-4 px-6">{group.name}</td>
                      <td className="py-4 px-6">
                        {new Date(group.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-center space-x-3">
                          <button className="text-blue-600 hover:text-blue-800">
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteGroup(group.id)}
                            disabled={deleteLoading === group.id}
                            className={`text-red-600 hover:text-red-800 ${
                              deleteLoading === group.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <Trash2 className={`h-4 w-4 ${
                              deleteLoading === group.id ? 'animate-spin' : ''
                            }`} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}