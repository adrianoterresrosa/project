import React, { useState } from 'react';
import { Search, Plus, UserCircle2, Trash2 } from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: {
    id: string;
    name: string;
  };
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
}

interface UsersListProps {
  users: User[];
  roles: any[];
  permissions: Permission[];
  onUpdateRole: (userId: string, roleId: string) => void;
  onUpdatePermissions: (userId: string, permissions: string[]) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function UsersList({ 
  users, 
  roles, 
  permissions,
  onUpdateRole, 
  onUpdatePermissions,
  onDelete, 
  onAdd 
}: UsersListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('all');

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = selectedRole === 'all' || user.role?.name === selectedRole;
    return matchesSearch && matchesRole;
  });

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este usuário?')) {
      onDelete(id);
    }
  };

  // Group permissions by category
  const groupedPermissions = permissions.reduce((acc, permission) => {
    const category = permission.name.split('.')[0];
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="bg-white rounded-xl shadow-sm">
      <div className="p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 space-y-4 md:space-y-0">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar usuários..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">Todos os níveis</option>
              {roles.map(role => (
                <option key={role.id} value={role.name}>
                  {role.name === 'master' ? 'Master' :
                   role.name === 'admin' ? 'Administrador' : 'Usuário'}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={onAdd}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="h-5 w-5 mr-2" />
            Adicionar Usuário
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-sm font-medium text-gray-500 border-b border-gray-200">
                <th className="pb-3 px-6">E-mail</th>
                <th className="pb-3 px-6">Nível de Acesso</th>
                <th className="pb-3 px-6">Permissões</th>
                <th className="pb-3 px-6">Data de Criação</th>
                <th className="pb-3 px-6 text-center">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="text-sm text-gray-800">
                  <td className="py-4 px-6">{user.email}</td>
                  <td className="py-4 px-6">
                    <select
                      value={user.role?.id || ''}
                      onChange={(e) => onUpdateRole(user.id, e.target.value)}
                      className="px-3 py-1 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {roles.map(role => (
                        <option key={role.id} value={role.id}>
                          {role.name === 'master' ? 'Master' :
                           role.name === 'admin' ? 'Administrador' : 'Usuário'}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-4">
                      {Object.entries(groupedPermissions).map(([category, perms]) => (
                        <div key={category} className="space-y-2">
                          <h4 className="font-medium text-gray-700 capitalize">{category}</h4>
                          <div className="grid grid-cols-2 gap-2">
                            {perms.map(permission => (
                              <label key={permission.id} className="flex items-center space-x-2">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  onChange={(e) => {
                                    const currentPermissions = user.permissions || [];
                                    const newPermissions = e.target.checked
                                      ? [...currentPermissions, permission.name]
                                      : currentPermissions.filter(p => p !== permission.name);
                                    onUpdatePermissions(user.id, newPermissions);
                                  }}
                                  checked={user.permissions?.includes(permission.name) || false}
                                />
                                <span className="text-sm text-gray-600">
                                  {permission.description}
                                </span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {new Date(user.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-center space-x-3">
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}