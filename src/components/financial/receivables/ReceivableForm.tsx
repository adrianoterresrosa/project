import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, X, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { AccountsReceivable, AccountsReceivableInstallment, Partner, PaymentAgent } from '../../../types/finance';

interface ReceivableFormProps {
  paymentAgents: PaymentAgent[];
  initialData?: AccountsReceivable | null;
  initialInstallments?: AccountsReceivableInstallment[];
  onSave: (
    receivable: Omit<AccountsReceivable, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    installments: Omit<AccountsReceivableInstallment, 'id' | 'accounts_receivable_id' | 'created_at' | 'updated_at'>[]
  ) => Promise<void>;
  onCancel: () => void;
}

export function ReceivableForm({
  paymentAgents,
  initialData,
  initialInstallments = [],
  onSave,
  onCancel
}: ReceivableFormProps) {
  const [formData, setFormData] = useState({
    partner_id: initialData?.partner_id || '',
    document_type: initialData?.document_type || 'invoice',
    document_number: initialData?.document_number || '',
    issue_date: initialData?.issue_date || new Date().toISOString().split('T')[0],
    description: initialData?.description || '',
    total_amount: initialData?.total_amount ? initialData.total_amount.toString() : '',
    installments: initialData?.installments || 1,
    notes: initialData?.notes || ''
  });

  const [installmentList, setInstallmentList] = useState<Omit<AccountsReceivableInstallment, 'id' | 'accounts_receivable_id' | 'created_at' | 'updated_at'>[]>(
    initialInstallments.length > 0
      ? initialInstallments.map(({ id, accounts_receivable_id, created_at, updated_at, ...rest }) => ({
          ...rest,
          amount: Number(rest.amount) || 0,
          fee_percentage: Number(rest.fee_percentage) || 0,
          fee_amount: Number(rest.fee_amount) || 0,
          net_amount: Number(rest.net_amount) || 0,
          paid_amount: Number(rest.paid_amount) || 0
        }))
      : []
  );

  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchPartners();
  }, []);

  useEffect(() => {
    if (initialData?.partner_id) {
      const partner = partners.find(p => p.id === initialData.partner_id);
      if (partner) {
        setSelectedPartner(partner);
        setSearchTerm(partner.description);
      }
    }
  }, [initialData, partners]);

  useEffect(() => {
    const filtered = partners.filter(partner =>
      partner.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      partner.document.includes(searchTerm)
    );
    setFilteredPartners(filtered);
  }, [searchTerm, partners]);

  const fetchPartners = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', userData.user.id)
        .in('type', ['customer', 'both'])
        .order('description');

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
    }
  };

  const handlePartnerSelect = (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData(prev => ({ ...prev, partner_id: partner.id }));
    setSearchTerm(partner.description);
    setShowDropdown(false);
  };

  const calculateInstallments = () => {
    const totalAmount = parseFloat(formData.total_amount);
    const numInstallments = formData.installments;
    
    if (isNaN(totalAmount) || numInstallments < 1) return;

    const baseAmount = Number((totalAmount / numInstallments).toFixed(2));
    const installments: Omit<AccountsReceivableInstallment, 'id' | 'accounts_receivable_id' | 'created_at' | 'updated_at'>[] = [];

    let remainingAmount = totalAmount;
    for (let i = 0; i < numInstallments; i++) {
      const dueDate = new Date(formData.issue_date);
      dueDate.setMonth(dueDate.getMonth() + i + 1);

      // For the last installment, use remaining amount to avoid rounding issues
      const amount = i === numInstallments - 1 ? remainingAmount : baseAmount;
      remainingAmount -= baseAmount;

      installments.push({
        installment_number: i + 1,
        due_date: dueDate.toISOString().split('T')[0],
        amount: Number(amount.toFixed(2)),
        fee_percentage: 0,
        fee_amount: 0,
        net_amount: Number(amount.toFixed(2)),
        status: 'open',
        paid_amount: 0
      });
    }

    setInstallmentList(installments);
  };

  useEffect(() => {
    if (!initialData) {
      calculateInstallments();
    }
  }, [formData.total_amount, formData.installments, formData.issue_date]);

  const handleInstallmentChange = (index: number, field: keyof AccountsReceivableInstallment, value: any) => {
    const newInstallments = [...installmentList];
    const installment = { ...newInstallments[index] };

    if (field === 'fee_percentage') {
      const feePercentage = Number(value) || 0;
      const amount = installment.amount;
      const feeAmount = Number(((amount * feePercentage) / 100).toFixed(2));
      
      installment.fee_percentage = feePercentage;
      installment.fee_amount = feeAmount;
      installment.net_amount = Number((amount - feeAmount).toFixed(2));
    } else if (field === 'amount') {
      const amount = Number(value) || 0;
      const feeAmount = Number(((amount * installment.fee_percentage) / 100).toFixed(2));
      
      installment.amount = amount;
      installment.fee_amount = feeAmount;
      installment.net_amount = Number((amount - feeAmount).toFixed(2));
    } else {
      installment[field] = value;
    }

    newInstallments[index] = installment;
    setInstallmentList(newInstallments);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const totalAmount = Number(formData.total_amount);
    if (isNaN(totalAmount) || totalAmount <= 0) {
      setError('O valor total deve ser maior que zero');
      return;
    }

    const totalInstallments = installmentList.reduce((sum, inst) => sum + inst.amount, 0);
    if (Math.abs(totalInstallments - totalAmount) > 0.01) {
      setError('O valor total das parcelas deve ser igual ao valor total do documento');
      return;
    }

    try {
      setLoading(true);
      await onSave(
        {
          ...formData,
          total_amount: totalAmount
        },
        installmentList
      );
    } catch (error) {
      console.error('Erro ao salvar:', error);
      setError('Erro ao salvar. Por favor, verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente
          </label>
          <div className="relative" ref={dropdownRef}>
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setShowDropdown(true);
              }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {showDropdown && filteredPartners.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
                {filteredPartners.map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => handlePartnerSelect(partner)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <div className="font-medium">{partner.description}</div>
                    <div className="text-sm text-gray-500">{partner.document}</div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo de Documento
          </label>
          <select
            value={formData.document_type}
            onChange={(e) => setFormData({ ...formData, document_type: e.target.value as 'invoice' | 'receipt' | 'other' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="invoice">Nota Fiscal</option>
            <option value="receipt">Recibo</option>
            <option value="other">Outro</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número do Documento
          </label>
          <input
            type="text"
            value={formData.document_number}
            onChange={(e) => setFormData({ ...formData, document_number: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data de Emissão
          </label>
          <input
            type="date"
            value={formData.issue_date}
            onChange={(e) => setFormData({ ...formData, issue_date: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Valor Total (Bruto)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={formData.total_amount}
            onChange={(e) => setFormData({ ...formData, total_amount: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Número de Parcelas
          </label>
          <input
            type="number"
            min="1"
            value={formData.installments}
            onChange={(e) => setFormData({ ...formData, installments: parseInt(e.target.value) })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Descrição
          </label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Observações
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Parcelas</h3>
          <div className="space-y-4">
            {installmentList.map((installment, index) => (
              <div key={index} className="grid grid-cols-1 md:grid-cols-6 gap-4 p-4 border rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parcela
                  </label>
                  <input
                    type="text"
                    value={installment.installment_number}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={installment.due_date}
                    onChange={(e) => handleInstallmentChange(index, 'due_date', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={installment.amount}
                    onChange={(e) => handleInstallmentChange(index, 'amount', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Taxa (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={installment.fee_percentage}
                    onChange={(e) => handleInstallmentChange(index, 'fee_percentage', Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Forma de Recebimento
                  </label>
                  <select
                    value={installment.payment_agent_id || ''}
                    onChange={(e) => handleInstallmentChange(index, 'payment_agent_id', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione...</option>
                    {paymentAgents.map(agent => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Valor Líquido
                  </label>
                  <input
                    type="text"
                    value={formatCurrency(installment.net_amount)}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                  />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 text-right">
            <p className="text-sm text-gray-500">
              Total Líquido: <span className="font-medium text-gray-900">
                {formatCurrency(installmentList.reduce((sum, inst) => sum + inst.net_amount, 0))}
              </span>
            </p>
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
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Conta a Receber'}
        </button>
      </div>
    </form>
  );
}