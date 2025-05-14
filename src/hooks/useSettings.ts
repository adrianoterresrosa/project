import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface UserSettings {
  profile: {
    full_name: string;
    avatar_url: string;
  };
  preferences: {
    currency: string;
    date_format: string;
    theme: 'light' | 'dark' | 'system';
    language: string;
    timezone: string;
  };
  notifications: {
    email: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      types: {
        budget_alerts: boolean;
        payment_reminders: boolean;
        monthly_reports: boolean;
      };
    };
    whatsapp: {
      enabled: boolean;
      frequency: 'daily' | 'weekly' | 'monthly';
      phone_number: string;
      verified: boolean;
      types: {
        budget_alerts: boolean;
        payment_reminders: boolean;
        monthly_reports: boolean;
      };
    };
  };
}

export const defaultSettings: UserSettings = {
  profile: {
    full_name: '',
    avatar_url: ''
  },
  preferences: {
    currency: 'BRL',
    date_format: 'DD/MM/YYYY',
    theme: 'light',
    language: 'pt-BR',
    timezone: 'America/Sao_Paulo'
  },
  notifications: {
    email: {
      enabled: true,
      frequency: 'daily',
      types: {
        budget_alerts: true,
        payment_reminders: true,
        monthly_reports: true
      }
    },
    whatsapp: {
      enabled: false,
      frequency: 'daily',
      phone_number: '',
      verified: false,
      types: {
        budget_alerts: true,
        payment_reminders: true,
        monthly_reports: true
      }
    }
  }
};

export function useSettings() {
  const [settings, setSettings] = useState<UserSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { data: existingSettings, error: fetchError } = await supabase
        .from('user_settings')
        .select('settings')
        .eq('user_id', userData.user.id)
        .single();

      if (fetchError) throw fetchError;

      if (existingSettings?.settings) {
        const mergedSettings = {
          ...defaultSettings,
          ...existingSettings.settings,
          notifications: {
            ...defaultSettings.notifications,
            ...(existingSettings.settings as UserSettings).notifications
          }
        };
        
        setSettings(mergedSettings);
      } else {
        const { error: insertError } = await supabase
          .from('user_settings')
          .insert({
            user_id: userData.user.id,
            settings: defaultSettings
          });

        if (insertError) throw insertError;
        setSettings(defaultSettings);
      }
    } catch (error) {
      console.error('Erro ao carregar configurações:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (newSettings: UserSettings) => {
    try {
      setError(null);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: userData.user.id,
          settings: newSettings
        });

      if (error) throw error;

      setSettings(newSettings);
      return true;
    } catch (error) {
      console.error('Erro ao atualizar configurações:', error);
      setError(error.message);
      return false;
    }
  };

  return {
    settings,
    loading,
    error,
    updateSettings,
    refetch: fetchSettings
  };
}