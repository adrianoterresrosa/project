import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { UsersList } from './UsersList';
import { UserForm } from './UserForm';
import { Modal } from '../../ui/Modal';
import { ArrowLeft } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  permissions: string[];
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
}

export function UsersManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Primeiro buscar os roles e permissões
      const [rolesResult, permissionsResult] = await Promise.all([
        supabase.from('roles').select('*').order('name'),
        supabase.from('permissions').select('*').order('name')
      ]);

      if (rolesResult.error) throw rolesResult.error;
      if (permissionsResult.error) throw permissionsResult.error;

      setRoles(rolesResult.data || []);
      setPermissions(permissionsResult.data || []);

      // Depois buscar os usuários com seus roles e permissões
      const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers();
      if (authError) throw authError;

      // Buscar roles e permissões para cada usuário
      const usersWithRoles = await Promise.all(
        authUsers.users.map(async (user) => {
          const { data: userRoles } = await supabase
            .from('user_roles')
            .select('role:roles(*)')
            .eq('user_id', user.id)
            .single();

          const { data: userPermissions } = await supabase
            .from('user_permissions_view')
            .select('permission_name')
            .eq('user_id', user.id);

          return {
            id: user.id,
            email: user.email,
            role: userRoles?.role || null,
            permissions: userPermissions?.map(p => p.permission_name) || [],
            created_at: user.created_at
          };
        })
      );

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (userData: { email: string; password: string; role_id: string }) => {
    try {
      // Criar usuário na autenticação
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Erro ao criar usuário');

      // Atribuir role ao usuário
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: authData.user.id,
          role_id: userData.role_id
        }]);

      if (roleError) throw roleError;

      await fetchData();
      setIsModalOpen(false);
    } catch (error) {
      console.error('Erro ao salvar usuário:', error);
    }
  };

  const handleUpdateRole = async (userId: string, roleId: string) => {
    try {
      // Primeiro remover roles existentes
      await supabase
        .from('user_roles')
        .delete()
        .eq('user_id', userId);

      // Depois inserir novo role
      const { error } = await supabase
        .from('user_roles')
        .insert([{ user_id: userId, role_id: roleId }]);

      if (error) throw error;
      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar role:', error);
    }
  };

  const handleUpdatePermissions = async (userId: string, newPermissions: string[]) => {
    try {
      // Primeiro remover todas as permissões existentes
      const { error: deleteError } = await supabase
        .from('user_permissions')
        .delete()
        .eq('user_id', userId);

      if (deleteError) throw deleteError;

      // Depois inserir novas permissões
      if (newPermissions.length > 0) {
        const { error: insertError } = await supabase
          .from('user_permissions')
          .insert(
            newPermissions.map(permission => ({
              user_id: userId,
              permission_name: permission
            }))
          );

        if (insertError) throw insertError;
      }

      await fetchData();
    } catch (error) {
      console.error('Erro ao atualizar permissões:', error);
    }
  };

  const handleDelete = async (userId: string) => {
    try {
      const { error } = await supabase.auth.admin.deleteUser(userId);
      if (error) throw error;
      setUsers(users.filter(user => user.id !== userId));
    } catch (error) {
      console.error('Erro ao excluir usuário:', error);
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
            Gerenciamento de Usuários
          </h1>
        </div>
      </div>

      <UsersList
        users={users}
        roles={roles}
        permissions={permissions}
        onUpdateRole={handleUpdateRole}
        onUpdatePermissions={handleUpdatePermissions}
        onDelete={handleDelete}
        onAdd={() => setIsModalOpen(true)}
      />

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Novo Usuário"
      >
        <UserForm
          roles={roles}
          onSave={handleSave}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}