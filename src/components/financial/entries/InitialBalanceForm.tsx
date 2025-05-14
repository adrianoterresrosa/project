import React, { useState } from 'react';
import { Save, Info, DollarSign } from 'lucide-react';

interface InitialBalanceFormProps {
  onSave: (year: number, amount: number) => void;
  onCancel: () => void;
}

export function InitialBalanceForm({ onSave, onCancel }: InitialBalanceFormProps) {
  const [year, setYear] = useState(new Date().getFullYear());
  const [amount, setAmount] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(year, parseFloat(amount) || 0);
  };

  const formatCurrency = (value: string) => {
    const number = parseFloat(value.replace(/[^\d.-]/g, ''));
    if (isNaN(number)) return '';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(number);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start">
          <Info className="h-5 w-5 text-blue-500 mt-0.5 mr-3 flex-shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium mb-1">Saldo Inicial do Fluxo de Caixa</p>
            <p>
              Informe o ano e o valor do saldo inicial para o fluxo de caixa.
              Esta operação só pode ser realizada uma única vez.
            </p>
          </div>
        </div>
      </div>

      {/* Visual Display */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <div className="text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Saldo Inicial</h3>
          <div className="flex items-center justify-center space-x-4">
            <div className="text-2xl font-bold text-gray-900">{year}</div>
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(amount || '0')}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Ano
          </label>
          <input
            type="number"
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            min="2000"
            max="2100"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Inicial
          </label>
          <div className="relative">
            <DollarSign className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0,00"
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancelar
        </button>
        <button
          type="submit"
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          Salvar Saldo Inicial
        </button>
      </div>
    </form>
  );
}