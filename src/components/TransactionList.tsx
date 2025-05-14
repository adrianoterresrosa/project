import React, { useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Search } from 'lucide-react';
import type { Transaction } from '../types/finance';

interface TransactionListProps {
  transactions: Transaction[];
}

export function TransactionList({ transactions }: TransactionListProps) {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredTransactions = transactions.filter(transaction => {
    const searchLower = searchQuery.toLowerCase();
    return (
      transaction.description.toLowerCase().includes(searchLower) ||
      transaction.category.toLowerCase().includes(searchLower) ||
      transaction.amount.toString().includes(searchLower)
    );
  });

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100">
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Transactions</h2>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search transactions..."
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">
                {searchQuery ? 'No transactions found matching your search.' : 'No transactions yet. Add your first one!'}
              </p>
            </div>
          ) : (
            filteredTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="flex items-center justify-between p-4 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors duration-150"
              >
                <div className="flex items-center">
                  {transaction.type === 'income' ? (
                    <div className="p-2 bg-green-100 rounded-lg">
                      <ArrowUpCircle className="w-6 h-6 text-green-600" />
                    </div>
                  ) : (
                    <div className="p-2 bg-red-100 rounded-lg">
                      <ArrowDownCircle className="w-6 h-6 text-red-600" />
                    </div>
                  )}
                  <div className="ml-4">
                    <p className="font-medium text-gray-900">{transaction.description}</p>
                    <p className="text-sm text-gray-500">{transaction.category}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-semibold ${
                    transaction.type === 'income' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {transaction.type === 'income' ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.date).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}