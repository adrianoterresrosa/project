import React, { useState } from 'react';
import { Save, Check, Phone, Info } from 'lucide-react';
import { useSettings } from '../../../hooks/useSettings';
import { ThemeSelector } from './ThemeSelector';

export function Settings() {
  const { settings, updateSettings, loading } = useSettings();
  const [saving, setSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [verifyingWhatsApp, setVerifyingWhatsApp] = useState(false);
  const [whatsAppError, setWhatsAppError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      await updateSettings(settings);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
    } finally {
      setSaving(false);
    }
  };

  const formatWhatsAppNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 11) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{5})(\d{4})$/, '$1-$2');
    }
    return value;
  };

  const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    const numbers = value.replace(/\D/g, '');
    
    if (numbers.length > 11) {
      setWhatsAppError('O número deve ter no máximo 11 dígitos');
      return;
    }
    
    setWhatsAppError(null);
    updateSettings({
      ...settings,
      notifications: {
        ...settings.notifications,
        whatsapp: {
          ...settings.notifications.whatsapp,
          phone_number: numbers
        }
      }
    });
  };

  const handleVerifyWhatsApp = async () => {
    setVerifyingWhatsApp(true);
    try {
      // Aqui você implementará a verificação do WhatsApp
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulação
      alert('Função de verificação será implementada em breve!');
    } finally {
      setVerifyingWhatsApp(false);
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
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
      </div>

      <div className="bg-white rounded-xl shadow-sm">
        <div className="p-6">
          <form onSubmit={handleSave} className="space-y-6">
            {/* Perfil do Usuário */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Perfil</h3>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Completo
                </label>
                <input
                  type="text"
                  value={settings.profile.full_name}
                  onChange={(e) => updateSettings({
                    ...settings,
                    profile: {
                      ...settings.profile,
                      full_name: e.target.value
                    }
                  })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Preferências */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Preferências</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Moeda Padrão
                  </label>
                  <select
                    value={settings.preferences.currency}
                    onChange={(e) => updateSettings({
                      ...settings,
                      preferences: {
                        ...settings.preferences,
                        currency: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="BRL">Real (R$)</option>
                    <option value="USD">Dólar (US$)</option>
                    <option value="EUR">Euro (€)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Formato de Data
                  </label>
                  <select
                    value={settings.preferences.date_format}
                    onChange={(e) => updateSettings({
                      ...settings,
                      preferences: {
                        ...settings.preferences,
                        date_format: e.target.value
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Tema
                  </label>
                  <ThemeSelector />
                </div>
              </div>
            </div>

            {/* Notificações */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Notificações</h3>
              
              {/* Email Notifications */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="email-enabled"
                      checked={settings.notifications.email.enabled}
                      onChange={(e) => updateSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: {
                            ...settings.notifications.email,
                            enabled: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="email-enabled" className="ml-2 text-sm font-medium text-gray-700">
                      Notificações por Email
                    </label>
                  </div>
                  
                  {settings.notifications.email.enabled && (
                    <select
                      value={settings.notifications.email.frequency}
                      onChange={(e) => updateSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          email: {
                            ...settings.notifications.email,
                            frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                          }
                        }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  )}
                </div>

                {settings.notifications.email.enabled && (
                  <div className="ml-6 space-y-3">
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="email-budget-alerts"
                        checked={settings.notifications.email.types.budget_alerts}
                        onChange={(e) => updateSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            email: {
                              ...settings.notifications.email,
                              types: {
                                ...settings.notifications.email.types,
                                budget_alerts: e.target.checked
                              }
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="email-budget-alerts" className="ml-2 text-sm text-gray-700">
                        Alertas de orçamento
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="email-payment-reminders"
                        checked={settings.notifications.email.types.payment_reminders}
                        onChange={(e) => updateSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            email: {
                              ...settings.notifications.email,
                              types: {
                                ...settings.notifications.email.types,
                                payment_reminders: e.target.checked
                              }
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="email-payment-reminders" className="ml-2 text-sm text-gray-700">
                        Lembretes de pagamento
                      </label>
                    </div>

                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="email-monthly-reports"
                        checked={settings.notifications.email.types.monthly_reports}
                        onChange={(e) => updateSettings({
                          ...settings,
                          notifications: {
                            ...settings.notifications,
                            email: {
                              ...settings.notifications.email,
                              types: {
                                ...settings.notifications.email.types,
                                monthly_reports: e.target.checked
                              }
                            }
                          }
                        })}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="email-monthly-reports" className="ml-2 text-sm text-gray-700">
                        Relatórios mensais
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* WhatsApp Notifications */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="whatsapp-enabled"
                      checked={settings.notifications.whatsapp.enabled}
                      onChange={(e) => updateSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          whatsapp: {
                            ...settings.notifications.whatsapp,
                            enabled: e.target.checked
                          }
                        }
                      })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="whatsapp-enabled" className="ml-2 text-sm font-medium text-gray-700">
                      Notificações por WhatsApp
                    </label>
                  </div>
                  
                  {settings.notifications.whatsapp.enabled && (
                    <select
                      value={settings.notifications.whatsapp.frequency}
                      onChange={(e) => updateSettings({
                        ...settings,
                        notifications: {
                          ...settings.notifications,
                          whatsapp: {
                            ...settings.notifications.whatsapp,
                            frequency: e.target.value as 'daily' | 'weekly' | 'monthly'
                          }
                        }
                      })}
                      className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="daily">Diário</option>
                      <option value="weekly">Semanal</option>
                      <option value="monthly">Mensal</option>
                    </select>
                  )}
                </div>

                {settings.notifications.whatsapp.enabled && (
                  <div className="ml-6 space-y-4">
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Número do WhatsApp
                          <button
                            type="button"
                            className="ml-1 text-gray-400 hover:text-gray-500"
                            onClick={() => alert('Digite seu número de WhatsApp com DDD.\nExemplo: (51) 98259-3941')}
                          >
                            <Info className="h-4 w-4 inline" />
                          </button>
                        </label>
                        <div className="flex items-center">
                          <Phone className="h-5 w-5 text-gray-400 mr-2" />
                          <input
                            type="tel"
                            value={formatWhatsAppNumber(settings.notifications.whatsapp.phone_number)}
                            onChange={handleWhatsAppChange}
                            placeholder="(00) 00000-0000"
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            maxLength={15}
                          />
                        </div>
                        {whatsAppError && (
                          <p className="mt-1 text-sm text-red-600">{whatsAppError}</p>
                        )}
                      </div>
                      {!settings.notifications.whatsapp.verified && (
                        <button
                          type="button"
                          onClick={handleVerifyWhatsApp}
                          disabled={verifyingWhatsApp}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          {verifyingWhatsApp ? 'Verificando...' : 'Verificar Número'}
                        </button>
                      )}
                    </div>

                    {settings.notifications.whatsapp.verified ? (
                      <div className="space-y-3">
                        <div className="flex items-center text-green-600">
                          <Check className="h-5 w-5 mr-2" />
                          Número verificado com sucesso!
                        </div>

                        <div className="space-y-3 mt-4">
                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="whatsapp-budget-alerts"
                              checked={settings.notifications.whatsapp.types.budget_alerts}
                              onChange={(e) => updateSettings({
                                ...settings,
                                notifications: {
                                  ...settings.notifications,
                                  whatsapp: {
                                    ...settings.notifications.whatsapp,
                                    types: {
                                      ...settings.notifications.whatsapp.types,
                                      budget_alerts: e.target.checked
                                    }
                                  }
                                }
                              })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="whatsapp-budget-alerts" className="ml-2 text-sm text-gray-700">
                              Alertas de orçamento
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="whatsapp-payment-reminders"
                              checked={settings.notifications.whatsapp.types.payment_reminders}
                              onChange={(e) => updateSettings({
                                ...settings,
                                notifications: {
                                  ...settings.notifications,
                                  whatsapp: {
                                    ...settings.notifications.whatsapp,
                                    types: {
                                      ...settings.notifications.whatsapp.types,
                                      payment_reminders: e.target.checked
                                    }
                                  }
                                }
                              })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="whatsapp-payment-reminders" className="ml-2 text-sm text-gray-700">
                              Lembretes de pagamento
                            </label>
                          </div>

                          <div className="flex items-center">
                            <input
                              type="checkbox"
                              id="whatsapp-monthly-reports"
                              checked={settings.notifications.whatsapp.types.monthly_reports}
                              onChange={(e) => updateSettings({
                                ...settings,
                                notifications: {
                                  ...settings.notifications,
                                  whatsapp: {
                                    ...settings.notifications.whatsapp,
                                    types: {
                                      ...settings.notifications.whatsapp.types,
                                      monthly_reports: e.target.checked
                                    }
                                  }
                                }
                              })}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="whatsapp-monthly-reports" className="ml-2 text-sm text-gray-700">
                              Relatórios mensais
                            </label>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 italic">
                        Verifique seu número de WhatsApp para configurar as notificações
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-200 flex items-center justify-between">
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center disabled:opacity-50"
              >
                <Save className="h-5 w-5 mr-2" />
                {saving ? 'Salvando...' : 'Salvar Configurações'}
              </button>

              {showSuccess && (
                <div className="flex items-center text-green-600">
                  <Check className="h-5 w-5 mr-2" />
                  Configurações salvas com sucesso!
                </div>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}