import React, { useState, useEffect } from 'react';
import { supabase, withRetry } from '../../../lib/supabase';
import { UserList } from './UserList';
import { UserForm } from './UserForm';
import { Modal } from '../../ui/Modal';
import { Plus } from 'lucide-react';
import { useAuth } from '../../../lib/AuthProvider';

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

export function UserManagement() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isMasterUser, setIsMasterUser] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (currentUser) {
      checkMasterUser();
      fetchUsers();
    }
  }, [currentUser]);

  const checkMasterUser = async () => {
    try {
      const { data: userRole } = await withRetry(() => 
        supabase
          .from('user_roles_view')
          .select('role_name')
          .eq('user_id', currentUser?.id)
          .single()
      , 3);

      setIsMasterUser(userRole?.role_name === 'master');
    } catch (error) {
      console.error('Error checking master user:', error);
      setError('Failed to verify user permissions');
    }
  };

  const fetchUsers = async () => {
    try {
      setError(null);
      if (!currentUser) {
        setError('No authenticated user found');
        return;
      }

      const { data: usersData, error: fetchError } = await withRetry(() =>
        supabase
          .from('user_details_view')
          .select('*')
          .order('created_at', { ascending: false })
      , 3);

      if (fetchError) throw fetchError;
      setUsers(usersData || []);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (userData: {
    email: string;
    password: string;
    full_name: string;
    role: 'master' | 'regular';
    status: 'active' | 'inactive';
    contact_info: { phone?: string; address?: string; };
  }) => {
    try {
      setLoading(true);
      setError(null);

      // Validate required fields
      if (!userData.email || !userData.full_name || !userData.role) {
        throw new Error('Please fill in all required fields');
      }

      // Validate email format
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.email)) {
        throw new Error('Invalid email format');
      }

      // Validate password for new users
      if (!editingUser && (!userData.password || userData.password.length < 8)) {
        throw new Error('Password must be at least 8 characters long');
      }

      if (editingUser) {
        // Update existing user
        const { error: updateError } = await withRetry(() =>
          supabase.rpc('update_user_profile', {
            p_user_id: editingUser.id,
            p_full_name: userData.full_name,
            p_role: userData.role,
            p_status: userData.status,
            p_contact_info: userData.contact_info
          })
        , 3);

        if (updateError) throw updateError;
      } else {
        // Create new user
        const { error: createError } = await withRetry(() =>
          supabase.rpc('create_user_with_profile', {
            p_email: userData.email,
            p_password: userData.password,
            p_full_name: userData.full_name,
            p_role: userData.role,
            p_status: userData.status,
            p_contact_info: userData.contact_info
          })
        , 3);

        if (createError) throw createError;
      }

      await fetchUsers();
      setIsModalOpen(false);
      setEditingUser(null);
    } catch (error) {
      console.error('Error saving user:', error);
      setError(error instanceof Error ? error.message : 'Failed to save user');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId: string) => {
    if (!window.confirm('Are you sure you want to delete this user?')) {
      return;
    }

    try {
      setError(null);
      const { error } = await withRetry(() =>
        supabase.rpc('delete_user_safely', { p_user_id: userId })
      , 3);

      if (error) throw error;
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Error deleting user:', error);
      setError('Failed to delete user');
    }
  };

  if (!isMasterUser) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500">You don't have permission to access this page.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add User
        </button>
      </div>

      <UserList
        users={users}
        onEdit={setEditingUser}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingUser(null);
        }}
        title={editingUser ? 'Edit User' : 'New User'}
      >
        <UserForm
          initialData={editingUser}
          onSave={handleSave}
          onCancel={() => {
            setIsModalOpen(false);
            setEditingUser(null);
          }}
        />
      </Modal>
    </div>
  );
}