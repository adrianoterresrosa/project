import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { PayablesList } from './PayablesList';
import { PayableForm } from './PayableForm';
import { Modal } from '../../ui/Modal';
import { Plus } from 'lucide-react';
import type { AccountsPayable, AccountsPayableInstallment, PaymentAgent } from '../../../types/finance';

export function PayablesManager() {
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [paymentAgents, setPaymentAgents] = useState<PaymentAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPayable, setEditingPayable] = useState<AccountsPayable | null>(null);
  const [editingInstallments, setEditingInstallments] = useState<AccountsPayableInstallment[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const [payablesResult, paymentAgentsResult] = await Promise.all([
        supabase
          .from('accounts_payable_view')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('issue_date', { ascending: false }),
        supabase
          .from('payment_agents')
          .select('*')
          .eq('user_id', userData.user.id)
          .in('type', ['payment', 'both'])
          .eq('is_active', true)
          .order('name')
      ]);

      if (payablesResult.error) throw payablesResult.error;
      if (paymentAgentsResult.error) throw paymentAgentsResult.error;

      setPayables(payablesResult.data || []);
      setPaymentAgents(paymentAgentsResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (payable: AccountsPayable) => {
    try {
      const { data: installments, error } = await supabase
        .from('accounts_payable_installments')
        .select('*')
        .eq('accounts_payable_id', payable.id)
        .order('installment_number');

      if (error) throw error;

      setEditingPayable(payable);
      setEditingInstallments(installments || []);
      setIsModalOpen(true);
    } catch (error) {
      console.error('Erro ao carregar parcelas:', error);
    }
  };

  const handleSave = async (
    payable: Omit<AccountsPayable, 'id' | 'user_id' | 'created_at' | 'updated_at'>,
    installments: Omit<AccountsPayableInstallment, 'id' | 'accounts_payable_id' | 'created_at' | 'updated_at'>[]
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Calculate net amounts for each installment
      const processedInstallments = installments.map(installment => {
        const amount = Number(installment.amount);
        const feePercentage = Number(installment.fee_percentage) || 0;
        const feeAmount = Number(((amount * feePercentage) / 100).toFixed(2));
        
        return {
          ...installment,
          fee_amount: feeAmount,
          net_amount: amount + feeAmount // For payables, fees increase the amount
        };
      });

      // Calculate total net amount (balance)
      const balanceValue = processedInstallments.reduce((acc, installment) => 
        acc + installment.net_amount, 0
      );

      if (editingPayable) {
        // Update existing payable
        const { error: payableError } = await supabase
          .from('accounts_payable')
          .update({
            partner_id: payable.partner_id,
            document_type: payable.document_type,
            document_number: payable.document_number,
            issue_date: payable.issue_date,
            description: payable.description,
            total_amount: payable.total_amount,
            gross_amount: payable.total_amount, // Store original amount
            balance: balanceValue,
            installments: payable.installments,
            notes: payable.notes
          })
          .eq('id', editingPayable.id);

        if (payableError) throw payableError;

        // Delete existing installments
        const { error: deleteError } = await supabase
          .from('accounts_payable_installments')
          .delete()
          .eq('accounts_payable_id', editingPayable.id);

        if (deleteError) throw deleteError;

        // Insert new installments
        const { error: installmentsError } = await supabase
          .from('accounts_payable_installments')
          .insert(
            processedInstallments.map(installment => ({
              ...installment,
              accounts_payable_id: editingPayable.id
            }))
          );

        if (installmentsError) throw installmentsError;
      } else {
        // Insert new payable
        const { data: newPayable, error: payableError } = await supabase
          .from('accounts_payable')
          .insert([{
            ...payable,
            user_id: userData.user.id,
            total_amount: payable.total_amount,
            gross_amount: payable.total_amount, // Store original amount
            balance: balanceValue
          }])
          .select()
          .single();

        if (payableError) throw payableError;
        if (!newPayable) throw new Error('Erro ao criar conta a pagar');

        // Insert installments
        const { error: installmentsError } = await supabase
          .from('accounts_payable_installments')
          .insert(
            processedInstallments.map(installment => ({
              ...installment,
              accounts_payable_id: newPayable.id
            }))
          );

        if (installmentsError) throw installmentsError;
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar conta a pagar:', error);
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta conta a pagar?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('accounts_payable')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setPayables(payables.filter(p => p.id !== id));
    } catch (error) {
      console.error('Erro ao excluir conta a pagar:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingPayable(null);
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
        <h1 className="text-2xl font-bold text-gray-900">Contas a Pagar</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Nova Conta a Pagar
        </button>
      </div>

      <PayablesList
        payables={payables}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingPayable ? 'Editar Conta a Pagar' : 'Nova Conta a Pagar'}
      >
        <PayableForm
          paymentAgents={paymentAgents}
          initialData={editingPayable}
          initialInstallments={editingInstallments}
          onSave={handleSave}
          onCancel={handleCloseModal}
        />
      </Modal>
    </div>
  );
}