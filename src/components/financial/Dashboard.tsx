import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { DashboardHeader } from './dashboard/DashboardHeader';
import { DashboardGrid } from './dashboard/DashboardGrid';
import { DashboardFilters } from './dashboard/DashboardFilters';
import type { Entry, Group, Account, Subgroup } from '../../types/finance';

export function Dashboard() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [subgroups, setSubgroups] = useState<Subgroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);

  useEffect(() => {
    fetchData();
  }, [selectedYear, selectedMonth]);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      const [entriesResult, groupsResult, accountsResult, subgroupsResult] = await Promise.all([
        supabase
          .from('entries')
          .select('*')
          .eq('user_id', userData.user.id),
        supabase
          .from('groups')
          .select('*')
          .eq('user_id', userData.user.id),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userData.user.id),
        supabase
          .from('subgroups')
          .select('*')
          .eq('user_id', userData.user.id)
      ]);

      if (entriesResult.error) throw entriesResult.error;
      if (groupsResult.error) throw groupsResult.error;
      if (accountsResult.error) throw accountsResult.error;
      if (subgroupsResult.error) throw subgroupsResult.error;

      setEntries(entriesResult.data || []);
      setGroups(groupsResult.data || []);
      setAccounts(accountsResult.data || []);
      setSubgroups(subgroupsResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
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
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <DashboardFilters
          selectedYear={selectedYear}
          selectedMonth={selectedMonth}
          onYearChange={setSelectedYear}
          onMonthChange={setSelectedMonth}
        />
      </div>

      <DashboardHeader
        entries={entries}
        accounts={accounts}
        groups={groups}
        subgroups={subgroups}
        selectedYear={selectedYear}
        selectedMonth={selectedMonth}
      />

      <DashboardGrid
        entries={entries}
        accounts={accounts}
        groups={groups}
        subgroups={subgroups}
      />
    </div>
  );
}