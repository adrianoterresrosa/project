import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { PartnersList } from './PartnersList';
import { PartnerForm } from './PartnerForm';
import { Modal } from '../../ui/Modal';
import { ArrowLeft } from 'lucide-react';

interface Partner {
  id: string;
  number: string;
  email: string;
  description: string;
  document: string;
  phone: string;
  type: 'customer' | 'supplier' | 'both';
  created_at: string;
}

export function PartnersManager() {
  const [partners, setPartners] = useState<Partner[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);

  useEffect(() => {
    fetchPartners();
  }, []);

  const fetchPartners = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPartners(data || []);
    } catch (error) {
      console.error('Erro ao carregar parceiros:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (partner: Omit<Partner, 'id' | 'created_at'>) => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      if (editingPartner) {
        // Atualizar parceiro existente
        const { error } = await supabase
          .from('partners')
          .update({
            number: partner.number,
            email: partner.email,
            description: partner.description,
            document: partner.document,
            phone: partner.phone,
            type: partner.type
          })
          .eq('id', editingPartner.id)
          .eq('user_id', userData.user.id);

        if (error) throw error;

        setPartners(partners.map(p => 
          p.id === editingPartner.id 
            ? { ...editingPartner, ...partner }
            : p
        ));
      } else {
        // Inserir novo parceiro
        const { data, error } = await supabase
          .from('partners')
          .insert([{
            ...partner,
            user_id: userData.user.id
          }])
          .select()
          .single();

        if (error) throw error;
        if (data) {
          setPartners([data, ...partners]);
        }
      }

      setIsModalOpen(false);
      setEditingPartner(null);
    } catch (error) {
      console.error('Erro ao salvar parceiro:', error);
      throw error; // Re-throw para que o PartnerForm possa tratar o erro
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (partner: Partner) => {
    setEditingPartner(partner);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('partners')
        .delete()
        .eq('id', id)
        .eq('user_id', userData.user.id);

      if (error) throw error;
      setPartners(partners.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao excluir parceiro:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => window.history.back()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </button>
          <h1 className="text-2xl font-bold text-gray-900">
            Fornecedores e Clientes
          </h1>
        </div>
      </div>

      <PartnersList
        partners={partners}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAdd={() => {
          setEditingPartner(null);
          setIsModalOpen(true);
        }}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingPartner(null);
        }}
        title={editingPartner ? 'Editar Parceiro' : 'Novo Parceiro'}
      >
        <PartnerForm
          initialData={editingPartner}
          onSave={handleSave}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingPartner(null);
          }}
        />
      </Modal>
    </div>
  );
}