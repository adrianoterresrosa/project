import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ReceivablesList } from './ReceivablesList';
import { ReceivableForm } from './ReceivableForm';
import { Modal } from '../../ui/Modal';
import { Plus } from 'lucide-react';
import type { AccountsReceivable, AccountsReceivableInstallment, PaymentAgent } from '../../../types/finance';

export function ReceivablesManager() {
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [paymentAgents, setPaymentAgents] = useState<PaymentAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<AccountsReceivable | null>(null);
  const [editingInstallments, setEditingInstallments] = useState<AccountsReceivableInstallment[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const [receivablesResult, paymentAgentsResult] = await Promise.all([
        supabase
          .from('accounts_receivable_view')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('issue_date', { ascending: false }),
        supabase
          .from('payment_agents')
          .select('*')
          .eq('user_id', userData.user.id)
          .in('type', ['receipt', 'both'])
          .eq('is_active', true)
          .order('name')
      ]);

      if (receivablesResult.error) throw receivablesResult.error;
      if (paymentAgentsResult.error) throw paymentAgentsResult.error;

      setReceivables(receivablesResult.data || []);
      setPaymentAgents(paymentAgentsResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (receivable: AccountsReceivable) => {
    try {
      const { data: installments, error } = await supabase
        .from('accounts_receivable_installments')
        .select('*')
        .eq('accounts_receivable_id', receivable.id)
        .order('installment_number');

      if (error) throw error;

      setEditingReceivable(receivable);
      setEditingInstallments(installments || []);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
    }
  };

  const handleSave = async (
    receivable: Omit<AccountsReceivable, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    installments: Omit<AccountsReceivableInstallment, 'id' | 'accounts_receivable_id' | 'created_at' | 'updated_at'>[]
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Calculate net amounts for each installment
      const processedInstallments = installments.map(installment => {
        const amount = installment.amount;
        const feeAmount = (amount * installment.fee_percentage) / 100;
        return {
          ...installment,
          fee_amount: feeAmount,
          net_amount: amount - feeAmount
        };
      });

      // Calculate total net amount (balance)
      const balanceValue = processedInstallments.reduce((acc, installment) => 
        acc + installment.net_amount, 0
      );

      if (editingReceivable) {
        // Update existing receivable
        const { error: receivableError } = await supabase
          .from('accounts_receivable')
          .update({
            partner_id: receivable.partner_id,
            document_type: receivable.document_type,
            document_number: receivable.document_number,
            issue_date: receivable.issue_date,
            description: receivable.description,
            total_amount: receivable.total_amount,
            gross_amount: receivable.total_amount, // Store original amount
            balance: balanceValue,
            installments: receivable.installments,
            notes: receivable.notes
          })
          .eq('id', editingReceivable.id);

        if (receivableError) throw receivableError;

        // Delete existing installments
        const { error: deleteError } = await supabase
          .from('accounts_receivable_installments')
          .delete()
          .eq('accounts_receivable_id', editingReceivable.id);

        if (deleteError) throw deleteError;

        // Insert new installments
        const { error: installmentsError } = await supabase
          .from('accounts_receivable_installments')
          .insert(
            processedInstallments.map(installment => ({
              ...installment,
              accounts_receivable_id: editingReceivable.id
            }))
          );

        if (installmentsError) throw installmentsError;
      } else {
        // Insert new receivable
        const { data: newReceivable, error: receivableError } = await supabase
          .from('accounts_receivable')
          .insert([{
            ...receivable,
            user_id: userData.user.id,
            total_amount: receivable.total_amount,
            gross_amount: receivable.total_amount, // Store original amount
            balance: balanceValue
          }])
          .select()
          .single();

        if (receivableError) throw receivableError;
        if (!newReceivable) throw new Error('Erro ao criar conta a receber');

        // Insert installments
        const { error: installmentsError } = await supabase
          .from('accounts_receivable_installments')
          .insert(
            processedInstallments.map(installment => ({
              ...installment,
              accounts_receivable_id: newReceivable.id
            }))
          );

        if (installmentsError) throw installmentsError;
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar conta a receber:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta a receber?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts_receivable')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setReceivables(receivables.filter(r => r.id !== id));
    } catch (error) {
      console.error('Erro ao excluir conta a receber:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingReceivable(null);
    setEditingInstallments([]);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Contas a Receber</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Conta a Receber
        </button>
      </div>

      <ReceivablesList
        receivables={receivables}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingReceivable ? 'Editar Conta a Receber' : 'Nova Conta a Receber'}
      >
        <ReceivableForm
          paymentAgents={paymentAgents}
          initialData={editingReceivable}
          initialInstallments={editingInstallments}
          onSave={handleSave}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}