import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Check, X, Search, Filter } from 'lucide-react';
import type { Account, Subgroup } from '../../../types/finance';
import { Modal } from '../../ui/Modal';

export function AccountsManager() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    subgroup_id: ''
  });

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSubgroups, setSelectedSubgroups] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const [accountsResult, subgroupsResult] = await Promise.all([
        supabase
          .from('accounts')
          .select(`
            *,
            subgroup:subgroups(
              id,
              name,
              group_id
            )
          `)
          .eq('user_id', userData.user.id)
          .order('name'),
        supabase
          .from('subgroups')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('name')
      ]);

      if (accountsResult.error) throw accountsResult.error;
      if (subgroupsResult.error) throw subgroupsResult.error;

      setAccounts(accountsResult.data || []);
      setSubgroups(subgroupsResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      if (editingAccount) {
        const { error } = await supabase
          .from('accounts')
          .update({
            name: formData.name,
            subgroup_id: formData.subgroup_id
          })
          .eq('id', editingAccount.id);

        if (error) throw error;

        setAccounts(accounts.map(account => 
          account.id === editingAccount.id 
            ? { ...account, name: formData.name, subgroup_id: formData.subgroup_id }
            : account
        ));
      } else {
        const { data, error } = await supabase
          .from('accounts')
          .insert([{
            name: formData.name,
            subgroup_id: formData.subgroup_id,
            user_id: userData.user.id,
            is_active: true
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setAccounts([...accounts, data]);
        }
      }

      setFormData({ name: '', subgroup_id: '' });
      setEditingAccount(null);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar conta:', error);
    }
  };

  const handleEdit = (account: Account) => {
    setEditingAccount(account);
    setFormData({
      name: account.name,
      subgroup_id: account.subgroup_id
    });
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta conta?')) {
      try {
        const { error } = await supabase
          .from('accounts')
          .delete()
          .eq('id', id);

        if (error) throw error;
        setAccounts(accounts.filter(account => account.id !== id));
      } catch (error) {
        console.error('Erro ao excluir conta:', error);
      }
    }
  };

  const handleToggleStatus = async (account: Account) => {
    try {
      const { error } = await supabase
        .from('accounts')
        .update({ is_active: !account.is_active })
        .eq('id', account.id);

      if (error) throw error;
      setAccounts(accounts.map(a => 
        a.id === account.id ? { ...a, is_active: !a.is_active } : a
      ));
    } catch (error) {
      console.error('Erro ao atualizar status da conta:', error);
    }
  };

  const handleToggleSubgroup = (subgroupId: string) => {
    setSelectedSubgroups(prev => 
      prev.includes(subgroupId)
        ? prev.filter(id => id !== subgroupId)
        : [...prev, subgroupId]
    );
  };

  const filteredAccounts = accounts.filter(account => {
    const matchesSearch = account.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubgroups = selectedSubgroups.length === 0 || selectedSubgroups.includes(account.subgroup_id);
    return matchesSearch && matchesSubgroups;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Contas</h1>
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar contas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-2 border rounded-lg flex items-center gap-2 transition-colors ${
                showFilters || selectedSubgroups.length > 0
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-5 w-5" />
              <span className="hidden md:inline">Filtros</span>
              {selectedSubgroups.length > 0 && (
                <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                  {selectedSubgroups.length}
                </span>
              )}
            </button>
          </div>
          <button
            onClick={() => {
              setEditingAccount(null);
              setFormData({ name: '', subgroup_id: '' });
              setIsModalOpen(true);
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Conta
          </button>
        </div>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-4">Filtrar por Subgrupos</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {subgroups.map((subgroup) => (
              <label
                key={subgroup.id}
                className="flex items-center space-x-3 p-3 rounded-lg border cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedSubgroups.includes(subgroup.id)}
                  onChange={() => handleToggleSubgroup(subgroup.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="text-sm text-gray-700">{subgroup.name}</span>
              </label>
            ))}
          </div>
          {selectedSubgroups.length > 0 && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setSelectedSubgroups([])}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Accounts List */}
      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-6">Nome</th>
                  <th className="pb-3 px-6">Subgrupo</th>
                  <th className="pb-3 px-6">Status</th>
                  <th className="pb-3 px-6">Data de Criação</th>
                  <th className="pb-3 px-6 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAccounts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500">
                      Nenhuma conta encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredAccounts.map((account) => {
                    const subgroup = subgroups.find(s => s.id === account.subgroup_id);
                    
                    return (
                      <tr key={account.id} className="text-sm text-gray-800">
                        <td className="py-4 px-6">{account.name}</td>
                        <td className="py-4 px-6">{subgroup?.name || 'N/A'}</td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => handleToggleStatus(account)}
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              account.is_active
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {account.is_active ? (
                              <Check className="w-4 h-4 mr-1" />
                            ) : (
                              <X className="w-4 h-4 mr-1" />
                            )}
                            {account.is_active ? 'Ativa' : 'Inativa'}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          {new Date(account.created_at).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-center space-x-3">
                            <button
                              onClick={() => handleEdit(account)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(account.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Modal for Add/Edit */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingAccount(null);
          setFormData({ name: '', subgroup_id: '' });
        }}
        title={editingAccount ? 'Editar Conta' : 'Nova Conta'}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Subgrupo
            </label>
            <select
              value={formData.subgroup_id}
              onChange={(e) => setFormData({ ...formData, subgroup_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione um subgrupo</option>
              {subgroups.map((subgroup) => (
                <option key={subgroup.id} value={subgroup.id}>
                  {subgroup.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome da Conta
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingAccount(null);
                setFormData({ name: '', subgroup_id: '' });
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
            >
              {editingAccount ? (
                <>
                  <Edit2 className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Conta
                </>
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}