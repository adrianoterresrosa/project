import React, { useState, useEffect } from 'react';
import { Edit2, Trash2, Search, Plus, UserCircle2, ChevronDown, ChevronUp, Settings, X } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { Modal } from '../../ui/Modal';

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

interface ColumnPreference {
  id: string;
  name: string;
  visible: boolean;
  order: number;
}

interface PartnersListProps {
  partners: Partner[];
  onEdit: (partner: Partner) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

const defaultColumns: ColumnPreference[] = [
  { id: 'number', name: 'Número', visible: true, order: 0 },
  { id: 'description', name: 'Nome/Razão Social', visible: true, order: 1 },
  { id: 'type', name: 'Tipo', visible: true, order: 2 },
  { id: 'document', name: 'CNPJ/CPF', visible: true, order: 3 },
  { id: 'email', name: 'Email', visible: true, order: 4 },
  { id: 'phone_fixed', name: 'Telefone', visible: false, order: 5 },
  { id: 'phone_mobile', name: 'Celular', visible: false, order: 6 },
  { id: 'whatsapp', name: 'WhatsApp', visible: false, order: 7 },
  { id: 'city', name: 'Cidade', visible: false, order: 8 },
  { id: 'state', name: 'Estado', visible: false, order: 9 },
  { id: 'street', name: 'Endereço', visible: false, order: 10 },
  { id: 'bank_name', name: 'Banco', visible: false, order: 11 },
  { id: 'created_at', name: 'Data de Cadastro', visible: false, order: 12 }
];

export function PartnersList({ partners, onEdit, onDelete, onAdd }: PartnersListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [expandedPartner, setExpandedPartner] = useState<string | null>(null);
  const [isColumnSettingsOpen, setIsColumnSettingsOpen] = useState(false);
  const [columnPreferences, setColumnPreferences] = useState<ColumnPreference[]>(defaultColumns);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadColumnPreferences();
  }, []);

  const loadColumnPreferences = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Try to get existing preferences
      const { data: existingPrefs, error: fetchError } = await supabase
        .from('user_preferences')
        .select('preferences')
        .eq('user_id', userData.user.id)
        .eq('type', 'partner_columns')
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (existingPrefs?.preferences) {
        setColumnPreferences(existingPrefs.preferences);
      } else {
        // If no preferences exist, create them with defaults using upsert
        const { error: upsertError } = await supabase
          .from('user_preferences')
          .upsert(
            {
              user_id: userData.user.id,
              type: 'partner_columns',
              preferences: defaultColumns,
              updated_at: new Date().toISOString()
            },
            {
              onConflict: 'user_id,type',
              ignoreDuplicates: false
            }
          );

        if (upsertError) throw upsertError;
        setColumnPreferences(defaultColumns);
      }
    } catch (error) {
      console.error('Error loading column preferences:', error);
      // Fallback to default columns if there's an error
      setColumnPreferences(defaultColumns);
    } finally {
      setLoading(false);
    }
  };

  const saveColumnPreferences = async (preferences: ColumnPreference[]) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) return;

      // Use a single upsert operation with the correct unique constraint
      const { error } = await supabase
        .from('user_preferences')
        .upsert(
          {
            user_id: userData.user.id,
            type: 'partner_columns',
            preferences,
            updated_at: new Date().toISOString() // Ensure updated_at is set
          },
          {
            onConflict: 'user_id,type', // Specify the constraint
            ignoreDuplicates: false // We want to update existing records
          }
        );

      if (error) throw error;
      setColumnPreferences(preferences);
    } catch (error) {
      console.error('Error saving column preferences:', error);
      // Keep UI state consistent even if save fails
      setColumnPreferences(preferences);
    }
  };

  const handleColumnToggle = (columnId: string) => {
    const newPreferences = columnPreferences.map(col => 
      col.id === columnId ? { ...col, visible: !col.visible } : col
    );
    saveColumnPreferences(newPreferences);
  };

  const handleColumnReorder = (draggedId: string, targetId: string) => {
    const newPreferences = [...columnPreferences];
    const draggedIndex = newPreferences.findIndex(col => col.id === draggedId);
    const targetIndex = newPreferences.findIndex(col => col.id === targetId);
    
    const [draggedCol] = newPreferences.splice(draggedIndex, 1);
    newPreferences.splice(targetIndex, 0, draggedCol);
    
    const orderedPreferences = newPreferences.map((col, index) => ({
      ...col,
      order: index
    }));
    
    saveColumnPreferences(orderedPreferences);
  };

  const filteredPartners = partners.filter(partner => {
    const matchesSearch = 
      partner.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      partner.document.includes(searchQuery) ||
      (partner.phone_mobile && partner.phone_mobile.includes(searchQuery)) ||
      (partner.phone_fixed && partner.phone_fixed.includes(searchQuery));
    
    const matchesType = selectedType === 'all' || partner.type === selectedType;

    return matchesSearch && matchesType;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este parceiro?')) {
      onDelete(id);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  const getPartnerNumber = (index: number) => {
    return String(index + 1).padStart(4, '0');
  };

  const visibleColumns = columnPreferences
    .filter(col => col.visible)
    .sort((a, b) => a.order - b.order);

  const renderColumnValue = (partner: Partner, columnId: string, index: number) => {
    switch (columnId) {
      case 'number':
        return getPartnerNumber(index);
      case 'description':
        return (
          <div>
            <div className="font-medium">{partner.description}</div>
            {partner.trading_name && (
              <div className="text-gray-500 text-xs">{partner.trading_name}</div>
            )}
          </div>
        );
      case 'type':
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            partner.type === 'customer' 
              ? 'bg-green-100 text-green-800'
              : partner.type === 'supplier'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-purple-100 text-purple-800'
          }`}>
            <UserCircle2 className="w-4 h-4 mr-1" />
            {partner.type === 'customer' 
              ? 'Cliente'
              : partner.type === 'supplier'
              ? 'Fornecedor'
              : 'Ambos'}
          </span>
        );
      case 'created_at':
        return formatDate(partner.created_at);
      default:
        return partner[columnId as keyof Partner] || '-';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[200px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar parceiros..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os tipos</option>
              <option value="customer">Clientes</option>
              <option value="supplier">Fornecedores</option>
              <option value="both">Ambos</option>
            </select>

            <button
              onClick={() => setIsColumnSettingsOpen(true)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center"
            >
              <Settings className="h-4 w-4 mr-2" />
              Personalizar Colunas
            </button>
          </div>

          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Parceiro
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                {visibleColumns.map(column => (
                  <th key={column.id} className="pb-3 px-6">
                    {column.name}
                  </th>
                ))}
                <th className="pb-3 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPartners.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="py-8 text-center text-gray-500">
                    Nenhum parceiro encontrado com os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filteredPartners.map((partner, index) => (
                  <tr key={partner.id} className="text-sm text-gray-800">
                    {visibleColumns.map(column => (
                      <td key={column.id} className="py-4 px-6">
                        {renderColumnValue(partner, column.id, index)}
                      </td>
                    ))}
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-center space-x-3">
                        <button
                          onClick={() => onEdit(partner)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(partner.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isColumnSettingsOpen}
        onClose={() => setIsColumnSettingsOpen(false)}
        title="Personalizar Colunas"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-500">
            Selecione as colunas que deseja exibir na tabela. Arraste para reordenar.
          </p>
          <div className="space-y-2">
            {columnPreferences.map((column, index) => (
              <div
                key={column.id}
                className="flex items-center p-2 bg-white border rounded-lg hover:bg-gray-50 cursor-move"
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', column.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const draggedId = e.dataTransfer.getData('text/plain');
                  handleColumnReorder(draggedId, column.id);
                }}
              >
                <input
                  type="checkbox"
                  checked={column.visible}
                  onChange={() => handleColumnToggle(column.id)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className="ml-3 text-sm text-gray-700">{column.name}</span>
                <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
}