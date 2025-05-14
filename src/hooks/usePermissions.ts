import { useState, useEffect } from 'react';
import { supabase, withRetry } from '../lib/supabase';

export function usePermissions() {
  const [permissions, setPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get current user with retry and better error handling
      const { data: userData, error: authError } = await withRetry(
        () => supabase.auth.getUser(),
        3,
        1000
      );

      if (authError) {
        console.error('Auth error:', authError);
        setPermissions(['dashboard.view', 'entries.view', 'cashflow.view']);
        setError('Erro de autenticação. Usando permissões básicas.');
        return;
      }

      // Set default permissions for unauthenticated users
      if (!userData.user) {
        setPermissions(['dashboard.view', 'entries.view', 'cashflow.view']);
        return;
      }

      // Fetch user permissions with retry
      const { data, error: permissionsError } = await withRetry(
        () => supabase
          .from('user_permissions_view')
          .select('permission_name')
          .eq('user_id', userData.user.id),
        3,
        1000
      );

      if (permissionsError) {
        console.error('Permissions error:', permissionsError);
        setPermissions(['dashboard.view', 'entries.view', 'cashflow.view']);
        setError('Erro ao carregar permissões. Usando permissões básicas.');
        return;
      }

      if (data && data.length > 0) {
        const userPermissions = data.map(p => p.permission_name);
        setPermissions(userPermissions);
      } else {
        // Set default permissions if none are found
        setPermissions(['dashboard.view', 'entries.view', 'cashflow.view']);
      }
    } catch (err) {
      console.error('Error loading permissions:', err);
      // Set default permissions even on error to ensure basic functionality
      setPermissions(['dashboard.view', 'entries.view', 'cashflow.view']);
      setError('Erro ao carregar permissões. Usando permissões básicas.');
    } finally {
      setLoading(false);
    }
  };

  const hasPermission = (permission: string): boolean => {
    if (!permission) return false;
    
    // If no permissions are loaded, allow only basic access
    if (permissions.length === 0) {
      return ['dashboard.view', 'entries.view', 'cashflow.view'].includes(permission);
    }

    return permissions.includes(permission);
  };

  return {
    permissions,
    hasPermission,
    loading,
    error,
    refetch: fetchPermissions
  };
}