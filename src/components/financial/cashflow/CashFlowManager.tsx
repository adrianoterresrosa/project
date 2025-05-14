import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { CashFlowForm } from './CashFlowForm';
import { CashFlowList } from './CashFlowList';

export function CashFlowManager() {
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  useEffect(() => {
    fetchEntries();
  }, []);

  const fetchEntries = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('cash_flow_entries')
        .select('*')
        .eq('user_id', userData.user.id)
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      if (error) throw error;
      setEntries(data || []);
    } catch (error) {
      console.error('Error fetching entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    fetchEntries();
    setEditingEntry(null);
  };

  const handleEdit = (entry: any) => {
    setEditingEntry(entry);
  };

  const handleDelete = (id: string) => {
    setEntries(entries.filter(entry => entry.id !== id));
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="space-y-8">
        <CashFlowForm
          onSave={handleSave}
          initialData={editingEntry}
          isEditing={!!editingEntry}
        />
        
        <CashFlowList
          entries={entries}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={fetchEntries}
        />
      </div>
    </div>
  );
}