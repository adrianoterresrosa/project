import React, { useState } from 'react';
import { Plus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Group } from '../../types/finance';

interface GroupFormProps {
  onGroupAdded: (group: Group) => void;
}

export function GroupForm({ onGroupAdded }: GroupFormProps) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No user logged in');

      const { data, error } = await supabase
        .from('groups')
        .insert([{ 
          name,
          user_id: userData.user.id 
        }])
        .select()
        .single();

      if (error) throw error;
      if (data) {
        onGroupAdded(data);
        setName('');
      }
    } catch (error) {
      console.error('Error adding group:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <h2 className="text-xl font-semibold text-gray-900 mb-6">Adicionar Grupo</h2>
      {error && (
        <div className="mb-4 p-3 rounded bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome do Grupo
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center px-4 py-2.5 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
        >
          <Plus className="w-4 h-4 mr-2" />
          {loading ? 'Adicionando...' : 'Adicionar Grupo'}
        </button>
      </div>
    </form>
  );
}