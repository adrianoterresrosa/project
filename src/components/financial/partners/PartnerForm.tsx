import React, { useState } from 'react';
import { Save } from 'lucide-react';

interface Partner {
  id: string;
  person_type: 'individual' | 'company';
  type: 'customer' | 'supplier' | 'both';
  description: string;
  trading_name?: string;
  document: string;
  email: string;
  street?: string;
  street_number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone_fixed?: string;
  phone_mobile?: string;
  whatsapp?: string;
  bank_name?: string;
  bank_agency?: string;
  bank_account?: string;
  bank_account_type?: 'checking' | 'savings';
  bank_account_holder?: string;
  created_at: string;
}

interface PartnerFormProps {
  initialData?: Partner | null;
  onSave: (partner: Omit<Partner, 'id' | 'created_at'>) => Promise<void>;
  onCancel: () => void;
}

export function PartnerForm({ initialData, onSave, onCancel }: PartnerFormProps) {
  const [formData, setFormData] = useState({
    person_type: initialData?.person_type || 'individual',
    type: initialData?.type || 'customer',
    description: initialData?.description || '',
    trading_name: initialData?.trading_name || '',
    document: initialData?.document || '',
    email: initialData?.email || '',
    street: initialData?.street || '',
    street_number: initialData?.street_number || '',
    complement: initialData?.complement || '',
    neighborhood: initialData?.neighborhood || '',
    city: initialData?.city || '',
    state: initialData?.state || '',
    zip_code: initialData?.zip_code || '',
    country: initialData?.country || 'Brasil',
    phone_fixed: initialData?.phone_fixed || '',
    phone_mobile: initialData?.phone_mobile || '',
    whatsapp: initialData?.whatsapp || '',
    bank_name: initialData?.bank_name || '',
    bank_agency: initialData?.bank_agency || '',
    bank_account: initialData?.bank_account || '',
    bank_account_type: initialData?.bank_account_type || 'checking',
    bank_account_holder: initialData?.bank_account_holder || ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await onSave(formData);
    } catch (error) {
      console.error('Error saving partner:', error);
      setError('Erro ao salvar. Por favor, verifique os dados e tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Informações Básicas</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Pessoa
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="individual"
                  checked={formData.person_type === 'individual'}
                  onChange={(e) => setFormData({ ...formData, person_type: 'individual' })}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Pessoa Física</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="company"
                  checked={formData.person_type === 'company'}
                  onChange={(e) => setFormData({ ...formData, person_type: 'company' })}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Pessoa Jurídica</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Relacionamento
            </label>
            <div className="flex space-x-4">
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="customer"
                  checked={formData.type === 'customer'}
                  onChange={(e) => setFormData({ ...formData, type: 'customer' })}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Cliente</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="supplier"
                  checked={formData.type === 'supplier'}
                  onChange={(e) => setFormData({ ...formData, type: 'supplier' })}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Fornecedor</span>
              </label>
              <label className="inline-flex items-center">
                <input
                  type="radio"
                  value="both"
                  checked={formData.type === 'both'}
                  onChange={(e) => setFormData({ ...formData, type: 'both' })}
                  className="form-radio h-4 w-4 text-blue-600"
                />
                <span className="ml-2">Ambos</span>
              </label>
            </div>
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.person_type === 'individual' ? 'Nome Completo' : 'Razão Social'}
            </label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {formData.person_type === 'company' && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome Fantasia
              </label>
              <input
                type="text"
                value={formData.trading_name}
                onChange={(e) => setFormData({ ...formData, trading_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {formData.person_type === 'individual' ? 'CPF' : 'CNPJ'}
            </label>
            <input
              type="text"
              value={formData.document}
              onChange={(e) => setFormData({ ...formData, document: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Endereço</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Logradouro
            </label>
            <input
              type="text"
              value={formData.street}
              onChange={(e) => setFormData({ ...formData, street: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Número
            </label>
            <input
              type="text"
              value={formData.street_number}
              onChange={(e) => setFormData({ ...formData, street_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Complemento
            </label>
            <input
              type="text"
              value={formData.complement}
              onChange={(e) => setFormData({ ...formData, complement: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Bairro
            </label>
            <input
              type="text"
              value={formData.neighborhood}
              onChange={(e) => setFormData({ ...formData, neighborhood: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cidade
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estado
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              CEP
            </label>
            <input
              type="text"
              value={formData.zip_code}
              onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Contatos</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone Fixo
            </label>
            <input
              type="tel"
              value={formData.phone_fixed}
              onChange={(e) => setFormData({ ...formData, phone_fixed: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Telefone Celular
            </label>
            <input
              type="tel"
              value={formData.phone_mobile}
              onChange={(e) => setFormData({ ...formData, phone_mobile: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              WhatsApp
            </label>
            <input
              type="tel"
              value={formData.whatsapp}
              onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">Informações Bancárias</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Banco
            </label>
            <input
              type="text"
              value={formData.bank_name}
              onChange={(e) => setFormData({ ...formData, bank_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Agência
            </label>
            <input
              type="text"
              value={formData.bank_agency}
              onChange={(e) => setFormData({ ...formData, bank_agency: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Conta
            </label>
            <input
              type="text"
              value={formData.bank_account}
              onChange={(e) => setFormData({ ...formData, bank_account: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tipo de Conta
            </label>
            <select
              value={formData.bank_account_type}
              onChange={(e) => setFormData({ ...formData, bank_account_type: e.target.value as 'checking' | 'savings' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="checking">Conta Corrente</option>
              <option value="savings">Conta Poupança</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Titular da Conta
            </label>
            <input
              type="text"
              value={formData.bank_account_holder}
              onChange={(e) => setFormData({ ...formData, bank_account_holder: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : initialData ? 'Salvar Alterações' : 'Criar Parceiro'}
        </button>
      </div>
    </form>
  );
}