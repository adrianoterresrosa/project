import React, { useState, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  LineChart,
  PieChart,
  BarChart3,
  FileText,
  DollarSign,
  Wallet,
  Users2,
  FolderTree,
  Receipt,
  TrendingUp,
  Settings,
  CreditCard,
  Building2,
  Calculator,
  Target,
  Landmark,
  ArrowDownUp,
  BarChart4,
  ArrowDownToLine,
  ArrowUpFromLine,
  UserCog
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Logo } from '../ui/Logo';
import { usePermissions } from '../../hooks/usePermissions';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  activeView: string;
  onViewChange: (view: string) => void;
}

interface MenuItem {
  id: string;
  label: string;
  icon: LucideIcon;
  permission: string;
  masterOnly?: boolean;
}

interface MenuSection {
  category: string;
  items: MenuItem[];
}

export function Sidebar({ isOpen, onClose, activeView, onViewChange }: SidebarProps) {
  const { hasPermission } = usePermissions();
  const [isMasterUser, setIsMasterUser] = useState(false);

  useEffect(() => {
    checkMasterUser();
  }, []);

  const checkMasterUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setIsMasterUser(user?.email === 'adrianoterresrosa@gmail.com');
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const menuItems = [
    {
      category: 'Visão Geral',
      items: [
        {
          id: 'dashboard',
          label: 'Dashboard',
          icon: LayoutDashboard,
          permission: 'dashboard.view'
        }
      ]
    },
    {
      category: 'Financeiro',
      items: [
        {
          id: 'entries',
          label: 'Lançamentos',
          icon: Receipt,
          permission: 'entries.view'
        },
        {
          id: 'receivables',
          label: 'Contas a Receber',
          icon: ArrowDownToLine,
          permission: 'entries.view'
        },
        {
          id: 'payables',
          label: 'Contas a Pagar',
          icon: ArrowUpFromLine,
          permission: 'entries.view'
        },
        {
          id: 'cash-flow',
          label: 'Fluxo de Caixa',
          icon: CreditCard,
          permission: 'cashflow.view'
        },
        {
          id: 'cash-flow-forecast',
          label: 'Previsão de Fluxo',
          icon: Calculator,
          permission: 'cashflow.view'
        },
        {
          id: 'cash-flow-actual-new',
          label: 'Fluxo Realizado',
          icon: ArrowDownUp,
          permission: 'cashflow.view'
        },
        {
          id: 'cash-flow-analysis',
          label: 'Análise de Fluxo',
          icon: BarChart4,
          permission: 'cashflow.view'
        },
        {
          id: 'financial-analysis',
          label: 'Análise',
          icon: LineChart,
          permission: 'analysis.view'
        }
      ]
    },
    {
      category: 'Estrutura Financeira',
      items: [
        ...(isMasterUser ? [
          {
            id: 'groups',
            label: 'Grupos',
            icon: FolderTree,
            permission: 'settings.view'
          },
          {
            id: 'subgroups',
            label: 'Subgrupos',
            icon: Users2,
            permission: 'settings.view'
          }
        ] : []),
        {
          id: 'accounts',
          label: 'Contas',
          icon: Wallet,
          permission: 'settings.view'
        },
        {
          id: 'cost-centers',
          label: 'Centros de Custos',
          icon: Target,
          permission: 'settings.view'
        }
      ]
    },
    {
      category: 'Cadastros',
      items: [
        {
          id: 'bank-accounts',
          label: 'Bancos/Contas Bancárias',
          icon: Landmark,
          permission: 'settings.view'
        },
        {
          id: 'partners',
          label: 'Fornecedores/Clientes',
          icon: Building2,
          permission: 'partners.view'
        }
      ]
    },
    {
      category: 'Administração',
      items: [
        {
          id: 'users',
          label: 'Usuários',
          icon: UserCog,
          permission: 'users.manage',
          masterOnly: true
        },
        {
          id: 'settings',
          label: 'Configurações',
          icon: Settings,
          permission: 'settings.view'
        }
      ]
    }
  ];

  return (
    <>
      {/* Overlay para mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-gray-600 bg-opacity-75 transition-opacity lg:hidden z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header com Logo */}
          <div className="p-4 border-b flex items-center justify-between">
            <Logo size="medium" className="flex-1 justify-center" />
            <button
              onClick={onClose}
              className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 ml-2"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-2 py-4 overflow-y-auto">
            {menuItems.map((section) => {
              const visibleItems = section.items.filter(item => 
                (!item.masterOnly || isMasterUser) && hasPermission(item.permission)
              );

              if (visibleItems.length === 0) return null;

              return (
                <div key={section.category} className="mb-6">
                  <h3 className="px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                    {section.category}
                  </h3>
                  <div className="space-y-1">
                    {visibleItems.map((item) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={item.id}
                          onClick={() => {
                            onViewChange(item.id);
                            onClose();
                          }}
                          className={`w-full flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                            activeView === item.id
                              ? 'bg-indigo-50 text-indigo-600'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <Icon className="h-5 w-5 mr-3" />
                          {item.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t">
            <button
              onClick={handleSignOut}
              className="w-full px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>
    </>
  );
}