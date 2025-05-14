import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { EntryForm } from './EntryForm';
import { EntriesList } from './EntriesList';
import { InitialBalanceForm } from './InitialBalanceForm';
import { Modal } from '../../ui/Modal';
import { DollarSign, Plus } from 'lucide-react';
import type { Entry, Account } from '../../../types/finance';

export function EntriesManager() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInitialBalanceModalOpen, setIsInitialBalanceModalOpen] = useState(false);
  const [initialBalance, setInitialBalance] = useState<{year: number; amount: number} | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const [entriesResult, accountsResult, initialBalanceResult] = await Promise.all([
        supabase
          .from('entries_with_relations')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('date', { ascending: false }),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userData.user.id)
          .eq('is_active', true),
        supabase
          .from('initial_balance')
          .select('*')
          .eq('user_id', userData.user.id)
          .single()
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (accountsResult.error) throw accountsResult.error;

      setEntries(entriesResult.data || []);
      setAccounts(accountsResult.data || []);

      if (initialBalanceResult.data) {
        setInitialBalance({
          year: initialBalanceResult.data.year,
          amount: initialBalanceResult.data.amount
        });
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (
    entry: Omit<Entry, 'id' | 'user_id' | 'created_at'>,
    costCenters: { id: string; percentage: number }[]
  ) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      if (editingEntry) {
        // Update existing entry
        const { error: entryError } = await supabase
          .from('entries')
          .update({
            account_id: entry.account_id,
            date: entry.date,
            amount: entry.amount,
            type: entry.type,
            description: entry.description,
            bank_account_id: entry.bank_account_id,
            partner_id: entry.partner_id
          })
          .eq('id', editingEntry.id);

        if (entryError) throw entryError;

        // Delete existing cost center allocations
        const { error: deleteError } = await supabase
          .from('entry_cost_centers')
          .delete()
          .eq('entry_id', editingEntry.id);

        if (deleteError) throw deleteError;

        // Insert new cost center allocations
        if (costCenters.length > 0) {
          const { error: costCenterError } = await supabase
            .from('entry_cost_centers')
            .insert(
              costCenters.map(cc => ({
                entry_id: editingEntry.id,
                cost_center_id: cc.id,
                percentage: cc.percentage,
                amount: (entry.amount * cc.percentage) / 100
              }))
            );

          if (costCenterError) throw costCenterError;
        }
      } else {
        // Insert new entry
        const { data: newEntry, error: entryError } = await supabase
          .from('entries')
          .insert([{
            ...entry,
            user_id: userData.user.id
          }])
          .select()
          .single();

        if (entryError) throw entryError;
        if (newEntry) {
          // Insert cost center allocations
          if (costCenters.length > 0) {
            const { error: costCenterError } = await supabase
              .from('entry_cost_centers')
              .insert(
                costCenters.map(cc => ({
                  entry_id: newEntry.id,
                  cost_center_id: cc.id,
                  percentage: cc.percentage,
                  amount: (entry.amount * cc.percentage) / 100
                }))
              );

            if (costCenterError) throw costCenterError;
          }
        }
      }

      await fetchData();
      handleCloseModal();
    } catch (error) {
      console.error('Erro ao salvar lançamento:', error);
      throw error;
    }
  };

  const handleSaveInitialBalance = async (year: number, amount: number) => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('initial_balance')
        .upsert({
          user_id: userData.user.id,
          year,
          amount
        });

      if (error) throw error;

      setInitialBalance({ year, amount });
      setIsInitialBalanceModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar saldo inicial:', error);
    }
  };

  const handleEdit = (entry: Entry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setEntries(entries.filter(e => e.id !== id));
    } catch (error) {
      console.error('Erro ao excluir lançamento:', error);
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Lançamentos</h1>
        <div className="flex items-center gap-4">
          {initialBalance ? (
            <div className="flex items-center bg-blue-50 px-4 py-2 rounded-lg border border-blue-200">
              <DollarSign className="h-5 w-5 text-blue-500 mr-2" />
              <div>
                <span className="text-sm text-blue-700 mr-2">Saldo Inicial ({initialBalance.year}):</span>
                <span className="font-medium text-blue-800">
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                  }).format(initialBalance.amount)}
                </span>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsInitialBalanceModalOpen(true)}
              className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-lg hover:bg-blue-100"
            >
              <DollarSign className="h-4 w-4 inline-block mr-2" />
              Definir Saldo Inicial
            </button>
          )}
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Lançamento
          </button>
        </div>
      </div>

      <EntriesList
        entries={entries}
        accounts={accounts}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={editingEntry ? 'Editar Lançamento' : 'Novo Lançamento'}
      >
        <EntryForm
          accounts={accounts}
          onSave={handleSave}
          initialData={editingEntry}
          onCancel={handleCloseModal}
        />
      </Modal>

      <Modal
        isOpen={isInitialBalanceModalOpen}
        onClose={() => setIsInitialBalanceModalOpen(false)}
        title="Saldo Inicial"
      >
        <InitialBalanceForm
          onSave={handleSaveInitialBalance}
          onCancel={() => setIsInitialBalanceModalOpen(false)}
        />
      </Modal>
    </div>
  );
}