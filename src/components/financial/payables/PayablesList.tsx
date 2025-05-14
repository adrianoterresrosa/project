import React, { useState } from 'react';
import { Edit2, Trash2, Search, Calendar, DollarSign, FileText } from 'lucide-react';
import type { AccountsPayable } from '../../../types/finance';

interface PayablesListProps {
  payables: AccountsPayable[];
  onEdit: (payable: AccountsPayable) => void;
  onDelete: (id: string) => void;
}

export function PayablesList({ payables, onEdit, onDelete }: PayablesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'issue' | 'due'>('due');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const filteredPayables = payables.filter(payable => {
    const matchesSearch = 
      payable.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payable.document_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payable.partner_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      payable.partner_document?.includes(searchQuery);

    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'open' && payable.remaining_amount > 0) ||
      (statusFilter === 'paid' && payable.remaining_amount === 0);

    const date = dateFilter === 'issue' ? payable.issue_date : payable.next_due_date;
    const matchesDate = (!startDate || date >= startDate) && (!endDate || date <= endDate);

    return matchesSearch && matchesStatus && matchesDate;
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

  const calculateStatus = (payable: AccountsPayable) => {
    if (!payable.total_installments) return 'Sem parcelas';
    if (payable.remaining_amount === 0) return 'Pago';
    if (payable.paid_installments === 0) return 'Em aberto';
    return 'Parcialmente pago';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pago':
        return 'bg-green-100 text-green-800';
      case 'Em aberto':
        return 'bg-yellow-100 text-yellow-800';
      case 'Parcialmente pago':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex flex-col md:flex-row space-y-4 md:space-y-0 md:space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar contas a pagar..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os status</option>
              <option value="open">Em aberto</option>
              <option value="paid">Pagos</option>
            </select>

            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as 'issue' | 'due')}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="issue">Data de Emissão</option>
              <option value="due">Data de Vencimento</option>
            </select>

            <div className="flex items-center space-x-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <span className="text-gray-500">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-6">Fornecedor</th>
                <th className="pb-3 px-6">Documento</th>
                <th className="pb-3 px-6">Descrição</th>
                <th className="pb-3 px-6">Emissão</th>
                <th className="pb-3 px-6">Próx. Venc.</th>
                <th className="pb-3 px-6 text-right">Valor Total</th>
                <th className="pb-3 px-6 text-right">Valor Pago</th>
                <th className="pb-3 px-6 text-right">Saldo</th>
                <th className="pb-3 px-6 text-center">Status</th>
                <th className="pb-3 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPayables.map((payable) => {
                const status = calculateStatus(payable);
                const statusColor = getStatusColor(status);

                return (
                  <tr key={payable.id} className="text-sm text-gray-800">
                    <td className="py-4 px-6">{payable.partner_name}</td>
                    <td className="py-4 px-6">
                      <div className="flex items-center">
                        <FileText className="h-4 w-4 text-gray-400 mr-2" />
                        {payable.document_number || '-'}
                      </div>
                    </td>
                    <td className="py-4 px-6">{payable.description}</td>
                    <td className="py-4 px-6">{formatDate(payable.issue_date)}</td>
                    <td className="py-4 px-6">
                      {payable.next_due_date ? formatDate(payable.next_due_date) : '-'}
                    </td>
                    <td className="py-4 px-6 text-right font-medium">
                      <div className="flex items-center justify-end">
                        <DollarSign className="h-4 w-4 text-gray-400 mr-1" />
                        {formatCurrency(payable.gross_amount || payable.total_amount)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-green-600">
                      {formatCurrency(payable.total_paid_amount || 0)}
                    </td>
                    <td className="py-4 px-6 text-right font-medium text-blue-600">
                      {formatCurrency(payable.remaining_amount || 0)}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex justify-center">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusColor}`}>
                          {status}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => onEdit(payable)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => onDelete(payable.id)}
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