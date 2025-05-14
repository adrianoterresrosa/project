import React, { useState } from 'react';
import { Plus, Calendar } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Account, Entry } from '../../types/finance';

interface EntryFormProps {
  accounts: Account[];
  onEntryAdded: (entry: Entry) => void;
}

export function EntryForm({ accounts, onEntryAdded }: EntryFormProps) {
  const [accountId, setAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [type, setType] = useState<'planned' | 'actual'>('actual');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('entries')
        .insert([{
          account_id: accountId,
          amount: parseFloat(amount),
          description,
          date,
          type,
          user_id: userData.user.id
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onEntryAdded(data);
        setAccountId('');
        setAmount('');
        setDescription('');
        setDate('');
      }
    } catch (error) {
      console.error('Error adding entry:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Adicionar Lançamento</h2>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conta
          </label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">Selecione uma conta</option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as 'planned' | 'actual')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="planned">Previsto</option>
            <option value="actual">Realizado</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
            step="0.01"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data
          </label>
          <div className="relative">
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
            <Calendar className="absolute right-3 top-2.5 h-5 w-5 text-gray-400" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          {loading ? 'Adicionando...' : 'Adicionar Lançamento'}
        </button>
      </div>
    </form>
  );
}