import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Plus, Edit2, Trash2, Search } from 'lucide-react';
import { Modal } from '../../ui/Modal';

interface BankAccount {
  id: string;
  bank_code: string;
  bank_name: string;
  account_type: 'checking' | 'investment' | 'savings' | 'physical';
  agency_number: string;
  agency_name: string;
  account_number: string;
  initial_balance: number;
  status: 'active' | 'inactive' | 'closed';
  created_at: string;
}

const ACCOUNT_TYPES = {
  checking: 'Conta Corrente',
  investment: 'Investimento',
  savings: 'Poupança',
  physical: 'Caixa Físico'
};

const ACCOUNT_STATUS = {
  active: 'Ativa',
  inactive: 'Inativa',
  closed: 'Encerrada'
};

export function BankAccountsManager() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<BankAccount | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchBankAccounts();
  }, []);

  const fetchBankAccounts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error) {
      console.error('Erro ao carregar contas bancárias:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (formData: Omit<BankAccount, 'id' | 'created_at'>) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      if (editingAccount) {
        const { error } = await supabase
          .from('bank_accounts')
          .update(formData)
          .eq('id', editingAccount.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('bank_accounts')
          .insert([{
            ...formData,
            user_id: userData.user.id
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setBankAccounts([...bankAccounts, data]);
        }
      }

      setIsModalOpen(false);
      setEditingAccount(null);
      await fetchBankAccounts();
    } catch (error) {
      console.error('Erro ao salvar conta bancária:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta bancária?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bank_accounts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setBankAccounts(bankAccounts.filter(account => account.id !== id));
    } catch (error) {
      console.error('Erro ao excluir conta bancária:', error);
    }
  };

  const filteredAccounts = bankAccounts.filter(account =>
    account.bank_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    account.bank_code.includes(searchQuery) ||
    account.agency_number?.includes(searchQuery) ||
    account.account_number?.includes(searchQuery)
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
        <h1 className="text-2xl font-bold text-gray-900">Bancos/Contas Bancárias</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Conta Bancária
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <div className="flex items-center mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar contas bancárias..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full whitespace-nowrap">
              <thead>
                <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                  <th className="pb-3 px-6">Banco</th>
                  <th className="pb-3 px-6">Código</th>
                  <th className="pb-3 px-6">Tipo</th>
                  <th className="pb-3 px-6">Agência</th>
                  <th className="pb-3 px-6">Conta</th>
                  <th className="pb-3 px-6 text-right w-[140px]">Saldo Inicial</th>
                  <th className="pb-3 px-6 text-center">Status</th>
                  <th className="pb-3 px-6 text-center w-[100px]">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredAccounts.map((account) => (
                  <tr key={account.id} className="text-sm text-gray-800">
                    <td className="py-4 px-6">{account.bank_name}</td>
                    <td className="py-4 px-6">{account.bank_code}</td>
                    <td className="py-4 px-6">{ACCOUNT_TYPES[account.account_type]}</td>
                    <td className="py-4 px-6">
                      {account.agency_number}
                      {account.agency_name && ` - ${account.agency_name}`}
                    </td>
                    <td className="py-4 px-6">{account.account_number}</td>
                    <td className={`py-4 px-6 text-right font-medium ${
                      account.initial_balance < 0 ? 'text-red-600' : 'text-green-600'
                    }`}>
                      <span className="inline-block">
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(account.initial_balance)}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        account.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : account.status === 'inactive'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {ACCOUNT_STATUS[account.status]}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => {
                            setEditingAccount(account);
                            setIsModalOpen(true);
                          }}
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
          setEditingAccount(null);
        }}
        title={editingAccount ? 'Editar Conta Bancária' : 'Nova Conta Bancária'}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            handleSave({
              bank_code: formData.get('bank_code') as string,
              bank_name: formData.get('bank_name') as string,
              account_type: formData.get('account_type') as BankAccount['account_type'],
              agency_number: formData.get('agency_number') as string,
              agency_name: formData.get('agency_name') as string,
              account_number: formData.get('account_number') as string,
              initial_balance: parseFloat(formData.get('initial_balance') as string),
              status: formData.get('status') as BankAccount['status']
            });
          }}
          className="space-y-6"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Banco
              </label>
              <input
                type="text"
                name="bank_name"
                defaultValue={editingAccount?.bank_name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Código do Banco
              </label>
              <input
                type="text"
                name="bank_code"
                defaultValue={editingAccount?.bank_code}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tipo de Conta
              </label>
              <select
                name="account_type"
                defaultValue={editingAccount?.account_type}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Object.entries(ACCOUNT_TYPES).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número da Agência
              </label>
              <input
                type="text"
                name="agency_number"
                defaultValue={editingAccount?.agency_number}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Agência
              </label>
              <input
                type="text"
                name="agency_name"
                defaultValue={editingAccount?.agency_name}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Número da Conta
              </label>
              <input
                type="text"
                name="account_number"
                defaultValue={editingAccount?.account_number}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Saldo Inicial
              </label>
              <input
                type="number"
                step="0.01"
                name="initial_balance"
                defaultValue={editingAccount?.initial_balance}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status da Conta
              </label>
              <select
                name="status"
                defaultValue={editingAccount?.status || 'active'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {Object.entries(ACCOUNT_STATUS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => {
                setIsModalOpen(false);
                setEditingAccount(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              {editingAccount ? 'Salvar Alterações' : 'Criar Conta Bancária'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}