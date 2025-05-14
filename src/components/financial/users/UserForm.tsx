import React, { useState } from 'react';
import { Save } from 'lucide-react';

interface User {
  id: string;
  email: string;
  full_name: string;
  role: 'master' | 'regular';
  status: 'active' | 'inactive';
  contact_info: {
    phone?: string;
    address?: string;
  };
  created_at: string;
}

interface UserFormProps {
  initialData?: User | null;
  onSave: (data: {
    email: string;
    password: string;
    full_name: string;
    role: 'master' | 'regular';
    status: 'active' | 'inactive';
    contact_info: {
      phone?: string;
      address?: string;
    };
  }) => Promise<void>;
  onCancel: () => void;
}

export function UserForm({ initialData, onSave, onCancel }: UserFormProps) {
  const [formData, setFormData] = useState({
    email: initialData?.email || '',
    password: '',
    full_name: initialData?.full_name || '',
    role: initialData?.role || 'regular',
    status: initialData?.status || 'active',
    contact_info: {
      phone: initialData?.contact_info?.phone || '',
      address: initialData?.contact_info?.address || ''
    }
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      setLoading(true);
      await onSave(formData);
    } catch (error) {
      console.error('Error saving user:', error);
      setError('Error saving user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{4})$/, '$1-$2');
    }
    return value;
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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Password {initialData && '(leave blank to keep current)'}
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required={!initialData}
            minLength={8}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Full Name
          </label>
          <input
            type="text"
            value={formData.full_name}
            onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value as 'master' | 'regular' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="regular">Regular</option>
            <option value="master">Master</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={formData.contact_info.phone}
            onChange={(e) => {
              const formattedPhone = formatPhoneNumber(e.target.value);
              setFormData({
                ...formData,
                contact_info: {
                  ...formData.contact_info,
                  phone: formattedPhone
                }
              });
            }}
            placeholder="(00) 00000-0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Address
          </label>
          <textarea
            value={formData.contact_info.address}
            onChange={(e) => setFormData({
              ...formData,
              contact_info: {
                ...formData.contact_info,
                address: e.target.value
              }
            })}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center disabled:opacity-50"
        >
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Saving...' : initialData ? 'Save Changes' : 'Create User'}
        </button>
      </div>
    </form>
  );
}