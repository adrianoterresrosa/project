import React, { useState, useEffect } from 'react';
import { EntriesManager } from './entries/EntriesManager';
import { FinancialAnalysis } from './analysis/FinancialAnalysis';
import { GroupsManager } from './groups/GroupsManager';
import { SubgroupsManager } from './groups/SubgroupsManager';
import { AccountsManager } from './accounts/AccountsManager';
import { Settings } from './settings/Settings';
import { Dashboard } from './Dashboard';
import { CashFlowScreen } from './cashflow/CashFlowScreen';
import { CashFlowForecast } from './cashflow/CashFlowForecast';
import { CashFlowActualNew } from './cashflow/CashFlowActualNew';
import { CashFlowAnalysis } from './cashflow/CashFlowAnalysis';
import { PartnersManager } from './partners/PartnersManager';
import { BankAccountsManager } from './bank-accounts/BankAccountsManager';
import { ReceivablesManager } from './receivables/ReceivablesManager';
import { PayablesManager } from './payables/PayablesManager';
import { UserManagement } from './users/UserManagement';
import { Sidebar } from './Sidebar';
import { Menu } from 'lucide-react';
import { Logo } from '../ui/Logo';
import { SupportButton } from '../ui/SupportButton';
import { usePermissions } from '../../hooks/usePermissions';
import { supabase } from '../../lib/supabase';
import { CostCentersManager } from './cost-centers/CostCentersManager';

export function FinancialDashboard() {
  const [activeView, setActiveView] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { hasPermission, loading: permissionsLoading, error: permissionsError } = usePermissions();
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
    });
  }, []);

  if (permissionsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (permissionsError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Erro ao carregar permissões
          </h1>
          <p className="text-gray-600">
            Por favor, tente novamente mais tarde.
          </p>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return hasPermission('dashboard.view') ? <Dashboard /> : null;
      case 'entries':
        return hasPermission('entries.view') ? <EntriesManager /> : null;
      case 'receivables':
        return hasPermission('entries.view') ? <ReceivablesManager /> : null;
      case 'payables':
        return hasPermission('entries.view') ? <PayablesManager /> : null;
      case 'cash-flow':
        return hasPermission('cashflow.view') ? <CashFlowScreen /> : null;
      case 'cash-flow-forecast':
        return hasPermission('cashflow.view') ? <CashFlowForecast /> : null;
      case 'cash-flow-actual-new':
        return hasPermission('cashflow.view') ? <CashFlowActualNew /> : null;
      case 'cash-flow-analysis':
        return hasPermission('cashflow.view') ? <CashFlowAnalysis /> : null;
      case 'financial-analysis':
        return hasPermission('analysis.view') ? <FinancialAnalysis /> : null;
      case 'groups':
        return hasPermission('settings.view') ? <GroupsManager /> : null;
      case 'subgroups':
        return hasPermission('settings.view') ? <SubgroupsManager /> : null;
      case 'accounts':
        return hasPermission('settings.view') ? <AccountsManager /> : null;
      case 'cost-centers':
        return hasPermission('settings.view') ? <CostCentersManager /> : null;
      case 'bank-accounts':
        return hasPermission('settings.view') ? <BankAccountsManager /> : null;
      case 'partners':
        return hasPermission('partners.view') ? <PartnersManager /> : null;
      case 'users':
        return hasPermission('users.manage') ? <UserManagement /> : null;
      case 'settings':
        return hasPermission('settings.view') ? <Settings /> : null;
      default:
        return hasPermission('dashboard.view') ? <Dashboard /> : null;
    }
  };

  const content = renderContent();
  if (!content) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Acesso Negado
          </h1>
          <p className="text-gray-600">
            Você não tem permissão para acessar esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        activeView={activeView}
        onViewChange={setActiveView}
      />

      <div className="flex-1 flex flex-col">
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-2">
            <div className="flex items-center">
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-500 hover:text-gray-600 hover:bg-gray-100 mr-2"
              >
                <Menu className="h-6 w-6" />
              </button>
              <Logo size="medium" className="lg:hidden" />
            </div>
            <Logo size="large" className="hidden lg:block" />
            <SupportButton />
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-8">
          {content}
        </main>
      </div>
    </div>
  );
}