import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { AnalysisSummary } from './AnalysisSummary';
import { AnalysisFilters } from './AnalysisFilters';
import { OverviewView } from './views/OverviewView';
import { DetailedView } from './views/DetailedView';
import { ComparisonView } from './views/ComparisonView';
import type { Entry, Account, Group, Subgroup } from '../../../types/finance';

export function FinancialAnalysis() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedView, setSelectedView] = useState<'overview' | 'detailed' | 'comparison'>('overview');

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const [entriesResult, accountsResult, groupsResult, subgroupsResult] = await Promise.all([
        supabase
          .from('entries')
          .select('*')
          .eq('user_id', userData.user.id),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userData.user.id),
        supabase
          .from('groups')
          .select('*')
          .eq('user_id', userData.user.id),
        supabase
          .from('subgroups')
          .select('*')
          .eq('user_id', userData.user.id)
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (accountsResult.error) throw accountsResult.error;
      if (groupsResult.error) throw groupsResult.error;
      if (subgroupsResult.error) throw subgroupsResult.error;

      setEntries(entriesResult.data || []);
      setAccounts(accountsResult.data || []);
      setGroups(groupsResult.data || []);
      setSubgroups(subgroupsResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderView = () => {
    const props = {
      entries,
      accounts,
      groups,
      subgroups,
      selectedYear,
      selectedMonth
    };

    switch (selectedView) {
      case 'overview':
        return <OverviewView {...props} />;
      case 'detailed':
        return <DetailedView {...props} />;
      case 'comparison':
        return <ComparisonView {...props} />;
      default:
        return <OverviewView {...props} />;
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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Análise Financeira</h1>
        
        <div className="flex items-center gap-4">
          <div className="flex rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setSelectedView('overview')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedView === 'overview'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Visão Geral
            </button>
            <button
              onClick={() => setSelectedView('detailed')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedView === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Detalhado
            </button>
            <button
              onClick={() => setSelectedView('comparison')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                selectedView === 'comparison'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Comparativo
            </button>
          </div>

          <AnalysisFilters
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
            onYearChange={setSelectedYear}
            onMonthChange={setSelectedMonth}
          />
        </div>
      </div>

      <AnalysisSummary
        entries={entries}
        accounts={accounts}
        groups={groups}
        subgroups={subgroups}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />

      {renderView()}
    </div>
  );
}