import React, { useState } from 'react';
import { Edit2, Trash2, Search, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';
import type { Entry, Account, Partner } from '../../../types/finance';

interface EntriesListProps {
  entries: Entry[];
  accounts: Account[];
  onEdit: (entry: Entry) => void;
  onDelete: (id: string) => void;
}

export function EntriesList({ entries, accounts, onEdit, onDelete }: EntriesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'planned' | 'actual'>('all');
  const [selectedAccount, setSelectedAccount] = useState<string>('all');

  const filteredEntries = entries.filter(entry => {
    const matchesSearch = 
      accounts.find(a => a.id === entry.account_id)?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.customer_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entry.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = selectedType === 'all' || entry.type === selectedType;
    const matchesAccount = selectedAccount === 'all' || entry.account_id === selectedAccount;

    return matchesSearch && matchesType && matchesAccount;
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
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
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'all' | 'planned' | 'actual')}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os tipos</option>
              <option value="planned">Previsto</option>
              <option value="actual">Realizado</option>
            </select>

            <select
              value={selectedAccount}
              onChange={(e) => setSelectedAccount(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todas as contas</option>
              {accounts.map(account => (
                <option key={account.id} value={account.id}>
                  {account.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-6">Data</th>
                <th className="pb-3 px-6">Conta</th>
                <th className="pb-3 px-6">Cliente/Fornecedor</th>
                <th className="pb-3 px-6">Descrição</th>
                <th className="pb-3 px-6">Tipo</th>
                <th className="pb-3 px-6 text-right">Valor</th>
                <th className="pb-3 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredEntries.map((entry) => {
                const account = accounts.find(a => a.id === entry.account_id);
                const partnerName = entry.customer_name || entry.supplier_name;
                
                return (
                  <tr key={entry.id} className="text-sm text-gray-800">
                    <td className="py-4 px-6">{formatDate(entry.date)}</td>
                    <td className="py-4 px-6">{account?.name || 'N/A'}</td>
                    <td className="py-4 px-6">{partnerName || '-'}</td>
                    <td className="py-4 px-6">{entry.description}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        entry.type === 'planned' 
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {entry.type === 'planned' ? 'Previsto' : 'Realizado'}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      {formatCurrency(entry.amount)}
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
                          onClick={() => onDelete(entry.id)}
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