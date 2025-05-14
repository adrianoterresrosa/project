import React, { useState, useEffect, useRef } from 'react';
import { Save, Plus, X, Search } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import type { Entry, Account, CostCenter, Partner } from '../../../types/finance';

interface Document {
  id: string;
  document_number: string;
  description: string;
  remaining_amount: number;
  partner_name: string;
}

interface EntryFormProps {
  accounts: Account[];
  onSave: (entry: Omit<Entry, 'id' | 'user_id' | 'created_at'>, costCenters: { id: string; percentage: number }[]) => void;
  initialData?: Entry | null;
  onCancel: () => void;
}

export function EntryForm({ accounts, onSave, initialData, onCancel }: EntryFormProps) {
  const [formData, setFormData] = useState({
    account_id: initialData?.account_id || '',
    date: initialData?.date ? new Date(initialData.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
    amount: initialData?.amount ? initialData.amount.toString() : '',
    type: initialData?.type || 'actual' as 'planned' | 'actual',
    description: initialData?.description || '',
    bank_account_id: initialData?.bank_account_id || '',
    partner_id: initialData?.partner_id || ''
  });

  const [costCenters, setCostCenters] = useState<CostCenter[]>([]);
  const [selectedCostCenters, setSelectedCostCenters] = useState<{ id: string; percentage: number }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCostCenters, setShowCostCenters] = useState(true);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [receivableDocuments, setReceivableDocuments] = useState<Document[]>([]);
  const [payableDocuments, setPayableDocuments] = useState<Document[]>([]);

  // Partner search states
  const [partnerSearchTerm, setPartnerSearchTerm] = useState('');
  const [showPartnerDropdown, setShowPartnerDropdown] = useState(false);
  const [filteredPartners, setFilteredPartners] = useState<Partner[]>([]);
  const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);

  const partnerDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Handle click outside to close dropdowns
    const handleClickOutside = (event: MouseEvent) => {
      if (partnerDropdownRef.current && !partnerDropdownRef.current.contains(event.target as Node)) {
        setShowPartnerDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedPartner) {
      fetchDocuments(selectedPartner.id);
    }
  }, [selectedPartner]);

  const fetchInitialData = async () => {
    try {
      const [costCentersResult, bankAccountsResult, partnersResult] = await Promise.all([
        fetchCostCenters(),
        fetchBankAccounts(),
        fetchPartners()
      ]);

      if (initialData?.partner_id) {
        const partner = partnersResult.find(p => p.id === initialData.partner_id);
        if (partner) {
          setSelectedPartner(partner);
          setPartnerSearchTerm(partner.description);
          await fetchDocuments(partner.id);
        }
      }
    } catch (error) {
      console.error('Error loading initial data:', error);
    }
  };

  const fetchCostCenters = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('cost_centers')
        .select('*')
        .eq('user_id', userData.user.id)
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setCostCenters(data || []);
      return data;
    } catch (error) {
      console.error('Error loading cost centers:', error);
      return [];
    }
  };

  const fetchBankAccounts = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('bank_accounts')
        .select('*')
        .eq('status', 'active')
        .order('bank_name');

      if (error) throw error;
      setBankAccounts(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching bank accounts:', error);
      return [];
    }
  };

  const fetchPartners = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('description');

      if (error) throw error;
      setPartners(data || []);
      return data;
    } catch (error) {
      console.error('Error fetching partners:', error);
      return [];
    }
  };

  const fetchDocuments = async (partnerId: string) => {
    try {
      const [receivablesResult, payablesResult] = await Promise.all([
        supabase
          .from('accounts_receivable_view')
          .select('id, document_number, description, remaining_amount, partner_name')
          .eq('partner_id', partnerId)
          .gt('remaining_amount', 0),
        supabase
          .from('accounts_payable_view')
          .select('id, document_number, description, remaining_amount, partner_name')
          .eq('partner_id', partnerId)
          .gt('remaining_amount', 0)
      ]);

      if (receivablesResult.error) throw receivablesResult.error;
      if (payablesResult.error) throw payablesResult.error;

      setReceivableDocuments(receivablesResult.data || []);
      setPayableDocuments(payablesResult.data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handlePartnerSelect = async (partner: Partner) => {
    setSelectedPartner(partner);
    setFormData(prev => ({ ...prev, partner_id: partner.id }));
    setPartnerSearchTerm(partner.description);
    setShowPartnerDropdown(false);
    setSelectedDocument(null);
    await fetchDocuments(partner.id);
  };

  const handleDocumentSelect = (document: Document) => {
    setSelectedDocument(document);
    setFormData(prev => ({
      ...prev,
      description: `${document.description} - Doc: ${document.document_number}`
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateCostCenters()) {
      return;
    }

    try {
      setLoading(true);

      // Prepare entry data
      const entryData = {
        account_id: formData.account_id,
        date: new Date(formData.date).toISOString(),
        amount: parseFloat(formData.amount),
        type: formData.type,
        description: formData.description,
        bank_account_id: formData.type === 'actual' ? formData.bank_account_id : null,
        partner_id: formData.partner_id || null,
        accounts_receivable_id: selectedDocument && receivableDocuments.some(doc => doc.id === selectedDocument.id) 
          ? selectedDocument.id 
          : null,
        accounts_payable_id: selectedDocument && payableDocuments.some(doc => doc.id === selectedDocument.id)
          ? selectedDocument.id
          : null
      };

      // If a document is selected, validate amount
      if (selectedDocument) {
        const amount = parseFloat(formData.amount);
        if (isNaN(amount) || amount <= 0 || amount > selectedDocument.remaining_amount) {
          setError('O valor do lançamento deve ser maior que zero e menor ou igual ao saldo do documento');
          return;
        }
      }

      // Save the entry
      await onSave(entryData, selectedCostCenters);
    } catch (error) {
      console.error('Error saving:', error);
      setError('Erro ao salvar. Por favor, verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const validateCostCenters = () => {
    if (!showCostCenters) return true;
    if (selectedCostCenters.length === 0) return true;

    // Check if all fields are filled
    const allFieldsFilled = selectedCostCenters.every(cc => 
      cc.id && cc.percentage > 0 && cc.percentage <= 100
    );

    if (!allFieldsFilled) {
      setError('Todos os campos de centro de custo devem ser preenchidos corretamente');
      return false;
    }

    // Check if percentages sum to 100%
    const totalPercentage = selectedCostCenters.reduce((sum, cc) => sum + cc.percentage, 0);
    if (totalPercentage !== 100) {
      setError('A soma das porcentagens deve ser igual a 100%');
      return false;
    }

    return true;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Conta
          </label>
          <select
            value={formData.account_id}
            onChange={(e) => setFormData({ ...formData, account_id: e.target.value })}
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

        <div className="relative" ref={partnerDropdownRef}>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Cliente/Fornecedor
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
            <input
              type="text"
              value={partnerSearchTerm}
              onChange={(e) => {
                setPartnerSearchTerm(e.target.value);
                setShowPartnerDropdown(true);
              }}
              onFocus={() => setShowPartnerDropdown(true)}
              placeholder="Buscar cliente ou fornecedor..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          {showPartnerDropdown && partners.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 max-h-60 overflow-y-auto">
              {partners
                .filter(partner => 
                  partner.description.toLowerCase().includes(partnerSearchTerm.toLowerCase()) ||
                  partner.document.includes(partnerSearchTerm)
                )
                .map((partner) => (
                  <button
                    key={partner.id}
                    type="button"
                    onClick={() => handlePartnerSelect(partner)}
                    className="w-full px-4 py-2 text-left hover:bg-gray-50 focus:outline-none focus:bg-gray-50"
                  >
                    <div className="font-medium">{partner.description}</div>
                    <div className="text-sm text-gray-500">
                      {partner.type === 'customer' ? 'Cliente' : 
                       partner.type === 'supplier' ? 'Fornecedor' : 'Cliente/Fornecedor'}
                    </div>
                  </button>
                ))}
            </div>
          )}
        </div>

        {selectedPartner && (receivableDocuments.length > 0 || payableDocuments.length > 0) && (
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documentos Disponíveis
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {receivableDocuments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Contas a Receber</h4>
                  {receivableDocuments.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDocumentSelect(doc)}
                      className={`w-full p-3 text-left border rounded-lg transition-colors ${
                        selectedDocument?.id === doc.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{doc.document_number}</div>
                      <div className="text-sm text-gray-500">{doc.description}</div>
                      <div className="text-sm font-medium text-blue-600">
                        Saldo: {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(doc.remaining_amount)}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {payableDocuments.length > 0 && (
                <div className="space-y-2">
                  <h4 className="text-sm font-medium text-gray-700">Contas a Pagar</h4>
                  {payableDocuments.map(doc => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => handleDocumentSelect(doc)}
                      className={`w-full p-3 text-left border rounded-lg transition-colors ${
                        selectedDocument?.id === doc.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{doc.document_number}</div>
                      <div className="text-sm text-gray-500">{doc.description}</div>
                      <div className="text-sm font-medium text-blue-600">
                        Saldo: {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL'
                        }).format(doc.remaining_amount)}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Data
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
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
            max={selectedDocument ? selectedDocument.remaining_amount : undefined}
            value={formData.amount}
            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
          {selectedDocument && (
            <p className="mt-1 text-sm text-gray-500">
              Valor máximo: {new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
              }).format(selectedDocument.remaining_amount)}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tipo
          </label>
          <select
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value as 'planned' | 'actual' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="planned">Previsto</option>
            <option value="actual">Realizado</option>
          </select>
        </div>

        {formData.type === 'actual' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conta Bancária
            </label>
            <select
              value={formData.bank_account_id}
              onChange={(e) => setFormData({ ...formData, bank_account_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            >
              <option value="">Selecione uma conta bancária</option>
              {bankAccounts.map((bank) => (
                <option key={bank.id} value={bank.id}>
                  {bank.bank_name} - Ag: {bank.agency_number} Conta: {bank.account_number}
                </option>
              ))}
            </select>
          </div>
        )}

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

        {showCostCenters && (
          <div className="md:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-sm font-medium text-gray-700">
                Centros de Custo
              </label>
              <button
                type="button"
                onClick={() => setSelectedCostCenters([...selectedCostCenters, { id: '', percentage: 0 }])}
                className="px-3 py-1 text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center"
              >
                <Plus className="h-4 w-4 mr-1" />
                Adicionar Centro de Custo
              </button>
            </div>

            <div className="space-y-4">
              {selectedCostCenters.map((cc, index) => (
                <div key={index} className="flex items-center space-x-4">
                  <div className="flex-1">
                    <select
                      value={cc.id}
                      onChange={(e) => {
                        const newCostCenters = [...selectedCostCenters];
                        newCostCenters[index].id = e.target.value;
                        setSelectedCostCenters(newCostCenters);
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      required
                    >
                      <option value="">Selecione um centro de custo</option>
                      {costCenters.map((costCenter) => (
                        <option 
                          key={costCenter.id} 
                          value={costCenter.id}
                          disabled={selectedCostCenters.some(
                            (selected, i) => i !== index && selected.id === costCenter.id
                          )}
                        >
                          {costCenter.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32">
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.01"
                        value={cc.percentage || ''}
                        onChange={(e) => {
                          const newCostCenters = [...selectedCostCenters];
                          newCostCenters[index].percentage = parseFloat(e.target.value) || 0;
                          setSelectedCostCenters(newCostCenters);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-8"
                        required
                      />
                      <span className="absolute right-3 top-2 text-gray-500">%</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newCostCenters = selectedCostCenters.filter((_, i) => i !== index);
                      setSelectedCostCenters(newCostCenters);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>

            {selectedCostCenters.length > 0 && (
              <div className="mt-2 text-sm text-gray-500">
                Total: {selectedCostCenters.reduce((sum, cc) => sum + (cc.percentage || 0), 0)}%
              </div>
            )}
          </div>
        )}
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
          {loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Lançamento'}
        </button>
      </div>
    </form>
  );
}