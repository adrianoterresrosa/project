import React from 'react';
import { DollarSign, TrendingUp, TrendingDown, CreditCard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import type { Transaction } from '../types/finance';

interface DashboardProps {
  transactions: Transaction[];
}

const COLORS = ['#10B981', '#EF4444', '#F59E0B', '#6366F1', '#8B5CF6'];

export function Dashboard({ transactions }: DashboardProps) {
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = totalIncome - totalExpenses;

  // Prepare data for charts
  const last30Days = [...Array(30)].map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    return date.toISOString().split('T')[0];
  }).reverse();

  const dailyData = last30Days.map(date => {
    const dayTransactions = transactions.filter(t => 
      t.date.split('T')[0] === date
    );
    
    return {
      date,
      income: dayTransactions
        .filter(t => t.type === 'income')
        .reduce((sum, t) => sum + t.amount, 0),
      expenses: dayTransactions
        .filter(t => t.type === 'expense')
        .reduce((sum, t) => sum + t.amount, 0),
    };
  });

  const categoryData = Object.entries(
    transactions
      .filter(t => t.type === 'expense')
      .reduce((acc, t) => {
        acc[t.category] = (acc[t.category] || 0) + t.amount;
        return acc;
      }, {} as Record<string, number>)
  ).map(([name, value]) => ({ name, value }));

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Financial Overview</h1>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Current Balance</p>
              <p className="text-2xl font-semibold text-gray-900">${balance.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">
              {balance >= 0 ? 'Available balance' : 'Current deficit'}
            </p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Income</p>
              <p className="text-2xl font-semibold text-green-600">${totalIncome.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">All time earnings</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Expenses</p>
              <p className="text-2xl font-semibold text-red-600">${totalExpenses.toFixed(2)}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">All time spending</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Transactions</p>
              <p className="text-2xl font-semibold text-gray-900">{transactions.length}</p>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-500">Total transactions</p>
          </div>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Income vs Expenses Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Income vs Expenses</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(date) => new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                />
                <YAxis />
                <Tooltip />
                <Area 
                  type="monotone" 
                  dataKey="income" 
                  stackId="1" 
                  stroke="#10B981" 
                  fill="#10B981" 
                  fillOpacity={0.2}
                  name="Income"
                />
                <Area 
                  type="monotone" 
                  dataKey="expenses" 
                  stackId="2" 
                  stroke="#EF4444" 
                  fill="#EF4444" 
                  fillOpacity={0.2}
                  name="Expenses"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Expense Categories Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Expense Categories</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryData.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}