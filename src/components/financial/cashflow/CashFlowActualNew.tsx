import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

interface GroupedData {
  [groupId: string]: {
    name: string;
    order: number;
    isExpanded: boolean;
    totals: {
      [date: string]: {
        actual: number;
      };
    };
    subgroups: {
      id: string;
      name: string;
      isExpanded: boolean;
      totals: {
        [date: string]: {
          actual: number;
        };
      };
      accounts: {
        id: string;
        name: string;
        values: {
          [date: string]: {
            actual: number;
          };
        };
      }[];
    }[];
  };
}

const GROUP_ORDER = {
  'Receita': 1,
  'Receita Financeira': 2,
  'Deduções': 3,
  'Custos': 4,
  'Despesas Operacionais': 5,
  'Investimentos': 6,
  'Movimentações Não Operacionais': 7
};

type ViewMode = 'week' | 'fortnight' | 'month';

export function CashFlowActualNew() {
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('week');
  const [initialBalance, setInitialBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, [selectedDate, viewMode]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Fetch initial balance first
      const { data: initialBalanceData } = await supabase
        .from('initial_balance')
        .select('amount')
        .eq('user_id', userData.user.id)
        .eq('year', selectedDate.getFullYear())
        .single();

      setInitialBalance(initialBalanceData?.amount || 0);

      // First fetch all groups, subgroups and accounts to ensure complete structure
      const [groupsResult, subgroupsResult, accountsResult, entriesResult] = await Promise.all([
        supabase
          .from('groups')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('name'),
        supabase
          .from('subgroups')
          .select('*')
          .eq('user_id', userData.user.id)
          .order('name'),
        supabase
          .from('accounts')
          .select('*')
          .eq('user_id', userData.user.id)
          .eq('is_active', true)
          .order('name'),
        supabase
          .from('entries')
          .select(`
            id,
            date,
            amount,
            type,
            account_id,
            accounts (
              id,
              name,
              subgroup_id,
              subgroups (
                id,
                name,
                group_id,
                groups (
                  id,
                  name
                )
              )
            )
          `)
          .eq('user_id', userData.user.id)
          .eq('type', 'actual')
      ]);

      if (groupsResult.error) throw groupsResult.error;
      if (subgroupsResult.error) throw subgroupsResult.error;
      if (accountsResult.error) throw accountsResult.error;
      if (entriesResult.error) throw entriesResult.error;

      const newGroupedData: GroupedData = {};

      // Initialize groups
      groupsResult.data.forEach(group => {
        newGroupedData[group.id] = {
          name: group.name,
          order: GROUP_ORDER[group.name] || 999,
          isExpanded: false,
          totals: {},
          subgroups: []
        };
      });

      // Initialize subgroups
      subgroupsResult.data.forEach(subgroup => {
        if (newGroupedData[subgroup.group_id]) {
          newGroupedData[subgroup.group_id].subgroups.push({
            id: subgroup.id,
            name: subgroup.name,
            isExpanded: false,
            totals: {},
            accounts: []
          });
        }
      });

      // Initialize accounts
      accountsResult.data.forEach(account => {
        const subgroup = subgroupsResult.data.find(s => s.id === account.subgroup_id);
        if (subgroup && newGroupedData[subgroup.group_id]) {
          const groupSubgroup = newGroupedData[subgroup.group_id].subgroups.find(s => s.id === account.subgroup_id);
          if (groupSubgroup) {
            groupSubgroup.accounts.push({
              id: account.id,
              name: account.name,
              values: {}
            });
          }
        }
      });

      // Process entries
      entriesResult.data?.forEach(entry => {
        if (!entry.accounts) return;
        const dateStr = formatDate(new Date(entry.date));
        const account = entry.accounts;
        const subgroup = account.subgroups;
        if (!subgroup) return;
        const group = subgroup.groups;
        if (!group) return;
        const groupData = newGroupedData[group.id];
        const subgroupData = groupData?.subgroups.find(s => s.id === subgroup.id);
        if (groupData && subgroupData) {
          const accountData = subgroupData.accounts.find(a => a.id === account.id);
          if (accountData) {
            if (!accountData.values[dateStr]) {
              accountData.values[dateStr] = { actual: 0 };
            }
            accountData.values[dateStr].actual += entry.amount;
            if (!subgroupData.totals[dateStr]) {
              subgroupData.totals[dateStr] = { actual: 0 };
            }
            subgroupData.totals[dateStr].actual += entry.amount;
            if (groupData.name === 'Movimentações Não Operacionais') {
              const entradasSubgroup = groupData.subgroups.find(s => s.name === 'Entradas não Operacionais');
              const saidasSubgroup = groupData.subgroups.find(s => s.name === 'Saídas não Operacionais');
              const entradas = entradasSubgroup?.totals[dateStr]?.actual || 0;
              const saidas = saidasSubgroup?.totals[dateStr]?.actual || 0;
              if (!groupData.totals[dateStr]) {
                groupData.totals[dateStr] = { actual: 0 };
              }
              groupData.totals[dateStr].actual = entradas - saidas;
            } else {
              if (!groupData.totals[dateStr]) {
                groupData.totals[dateStr] = { actual: 0 };
              }
              groupData.totals[dateStr].actual += entry.amount;
            }
          }
        }
      });

      setGroupedData(newGroupedData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: Date) => date.toISOString().split('T')[0];

  const getDates = () => {
    const dates: Date[] = [];
    const startDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    let daysToShow = 7;
    if (viewMode === 'fortnight') daysToShow = 15;
    else if (viewMode === 'month') daysToShow = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0).getDate();
    for (let i = 0; i < daysToShow; i++) {
      dates.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
    }
    return dates;
  };

  const dates = getDates();

  const handlePreviousPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() - 7);
    else if (viewMode === 'fortnight') newDate.setDate(newDate.getDate() - 15);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() - 1);
    setSelectedDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(selectedDate);
    if (viewMode === 'week') newDate.setDate(newDate.getDate() + 7);
    else if (viewMode === 'fortnight') newDate.setDate(newDate.getDate() + 15);
    else if (viewMode === 'month') newDate.setMonth(newDate.getMonth() + 1);
    setSelectedDate(newDate);
  };

  const calculateEntradas = (date: string) => {
    const receitaGroup = Object.values(groupedData).find(g => g.name === 'Receita');
    const receitaFinanceiraGroup = Object.values(groupedData).find(g => g.name === 'Receita Financeira');
    const receita = receitaGroup ? receitaGroup.totals[date]?.actual || 0 : 0;
    const receitaFinanceira = receitaFinanceiraGroup ? receitaFinanceiraGroup.totals[date]?.actual || 0 : 0;
    return receita + receitaFinanceira;
  };

  const calculateSaidas = (date: string) => {
    const deducoesGroup = Object.values(groupedData).find(g => g.name === 'Deduções');
    const custosGroup = Object.values(groupedData).find(g => g.name === 'Custos');
    const despesasGroup = Object.values(groupedData).find(g => g.name === 'Despesas Operacionais');
    const investimentosGroup = Object.values(groupedData).find(g => g.name === 'Investimentos');
    const movimentacoesGroup = Object.values(groupedData).find(g => g.name === 'Movimentações Não Operacionais');
    const deducoes = deducoesGroup ? deducoesGroup.totals[date]?.actual || 0 : 0;
    const custos = custosGroup ? custosGroup.totals[date]?.actual || 0 : 0;
    const despesas = despesasGroup ? despesasGroup.totals[date]?.actual || 0 : 0;
    const investimentos = investimentosGroup ? investimentosGroup.totals[date]?.actual || 0 : 0;
    let movimentacoesNaoOperacionais = 0;
    if (movimentacoesGroup) {
      const netMovimentacoes = movimentacoesGroup.totals[date]?.actual || 0;
      if (netMovimentacoes < 0) movimentacoesNaoOperacionais = Math.abs(netMovimentacoes);
    }
    return deducoes + custos + despesas + investimentos + movimentacoesNaoOperacionais;
  };

  const calculateFluxo = (date: string) => calculateEntradas(date) - calculateSaidas(date);

  const getSaldoInicial = (date: string) => {
    const currentDate = new Date(date);
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateStr = formatDate(previousDate);
    return date === formatDate(dates[0]) ? initialBalance : calculateSaldoFinal(previousDateStr);
  };

  const calculateSaldoFinal = (date: string) => getSaldoInicial(date) + calculateFluxo(date);

  const getValueColorClasses = (value: number, isAccumulated: boolean = false) => {
    if (value < 0) {
      return {
        cell: isAccumulated ? 'bg-red-100 border-red-300' : 'bg-red-50 border-red-200',
        text: isAccumulated ? 'text-red-800' : 'text-red-700'
      };
    }
    return {
      cell: isAccumulated ? 'bg-blue-100 border-blue-300' : 'border-indigo-200',
      text: isAccumulated ? 'text-blue-800' : 'text-indigo-900'
    };
  };

  // Funções de cálculo dos indicadores faltantes (valores reais)
  const calculateNetRevenueActual = (date: string) => {
    const receitaGroup = Object.values(groupedData).find(g => g.name === 'Receita');
    const receitaFinanceiraGroup = Object.values(groupedData).find(g => g.name === 'Receita Financeira');
    const deducoesGroup = Object.values(groupedData).find(g => g.name === 'Deduções');
    const receita = receitaGroup ? receitaGroup.totals[date]?.actual || 0 : 0;
    const receitaFinanceira = receitaFinanceiraGroup ? receitaFinanceiraGroup.totals[date]?.actual || 0 : 0;
    const deducoes = deducoesGroup ? deducoesGroup.totals[date]?.actual || 0 : 0;
    return receita + receitaFinanceira - deducoes;
  };

  const calculateGrossProfitActual = (date: string) => {
    const netRevenue = calculateNetRevenueActual(date);
    const custosGroup = Object.values(groupedData).find(g => g.name === 'Custos');
    const custos = custosGroup ? custosGroup.totals[date]?.actual || 0 : 0;
    return netRevenue - custos;
  };

  const calculateProfitBeforeInvestmentsActual = (date: string) => {
    const grossProfit = calculateGrossProfitActual(date);
    const despesasGroup = Object.values(groupedData).find(g => g.name === 'Despesas Operacionais');
    const despesas = despesasGroup ? despesasGroup.totals[date]?.actual || 0 : 0;
    return grossProfit - despesas;
  };

  const calculateOperatingProfitActual = (date: string) => {
    const profitBeforeInvestments = calculateProfitBeforeInvestmentsActual(date);
    const investimentosGroup = Object.values(groupedData).find(g => g.name === 'Investimentos');
    const investimentos = investimentosGroup ? investimentosGroup.totals[date]?.actual || 0 : 0;
    return profitBeforeInvestments - investimentos;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">Fluxo de Caixa Realizado</h1>
        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={handlePreviousPeriod}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex items-center px-3">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">
                {selectedDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
              </span>
            </div>
            <button
              onClick={handleNextPeriod}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-500" />
            </button>
          </div>
          <div className="flex rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setViewMode('week')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${viewMode === 'week' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Semanal
            </button>
            <button
              onClick={() => setViewMode('fortnight')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${viewMode === 'fortnight' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Quinzenal
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${viewMode === 'month' ? 'bg-blue-600 text-white' : 'text-gray-500 hover:text-gray-700'}`}
            >
              Mensal
            </button>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-4 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                  Descrição
                </th>
                {dates.map(date => (
                  <th key={formatDate(date)} className="text-center border-l border-gray-200">
                    <div className="px-6 py-2">
                      <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </th>
                ))}
                <th className="text-center border-l border-gray-200">
                  <div className="px-6 py-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </span>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(groupedData)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([groupId, group]) => (
                  <React.Fragment key={groupId}>
                    {/* Group Row */}
                    <tr className="bg-gray-50">
                      <td
                        className="py-2 px-6 font-medium text-gray-900 flex items-center cursor-pointer"
                        onClick={() =>
                          setGroupedData(prev => ({
                            ...prev,
                            [groupId]: { ...prev[groupId], isExpanded: !prev[groupId].isExpanded }
                          }))
                        }
                      >
                        {group.isExpanded ? (
                          <ChevronDown className="h-4 w-4 mr-2" />
                        ) : (
                          <ChevronRight className="h-4 w-4 mr-2" />
                        )}
                        {group.name}
                      </td>
                      {dates.map(date => {
                        const dateStr = formatDate(date);
                        const total = group.totals[dateStr]?.actual || 0;
                        const colorClasses = getValueColorClasses(total);
                        return (
                          <td key={dateStr} className={`py-2 px-6 text-right font-medium ${colorClasses.text}`}>
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                          </td>
                        );
                      })}
                      <td className="py-2 px-6 text-right font-medium text-gray-900">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                          dates.reduce((sum, date) => sum + (group.totals[formatDate(date)]?.actual || 0), 0)
                        )}
                      </td>
                    </tr>

                    {/* Subgroups and Accounts */}
                    {group.isExpanded &&
                      group.subgroups.map(subgroup => (
                        <React.Fragment key={subgroup.id}>
                          <tr className="bg-gray-25">
                            <td
                              className="py-2 px-6 pl-10 font-medium text-gray-700 flex items-center cursor-pointer"
                              onClick={() =>
                                setGroupedData(prev => ({
                                  ...prev,
                                  [groupId]: {
                                    ...prev[groupId],
                                    subgroups: prev[groupId].subgroups.map(s =>
                                      s.id === subgroup.id ? { ...s, isExpanded: !s.isExpanded } : s
                                    )
                                  }
                                }))
                              }
                            >
                              {subgroup.isExpanded ? (
                                <ChevronDown className="h-4 w-4 mr-2" />
                              ) : (
                                <ChevronRight className="h-4 w-4 mr-2" />
                              )}
                              {subgroup.name}
                            </td>
                            {dates.map(date => {
                              const dateStr = formatDate(date);
                              const total = subgroup.totals[dateStr]?.actual || 0;
                              return (
                                <td key={dateStr} className="py-2 px-6 text-right font-medium text-gray-700">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(total)}
                                </td>
                              );
                            })}
                            <td className="py-2 px-6 text-right font-medium text-gray-700">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                dates.reduce((sum, date) => sum + (subgroup.totals[formatDate(date)]?.actual || 0), 0)
                              )}
                            </td>
                          </tr>
                          {subgroup.isExpanded &&
                            subgroup.accounts.map(account => (
                              <tr key={account.id}>
                                <td className="py-2 px-6 pl-16 text-gray-600">{account.name}</td>
                                {dates.map(date => {
                                  const dateStr = formatDate(date);
                                  const value = account.values[dateStr]?.actual || 0;
                                  return (
                                    <td key={dateStr} className="py-2 px-6 text-right text-gray-600">
                                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                                    </td>
                                  );
                                })}
                                <td className="py-2 px-6 text-right text-gray-600">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                                    dates.reduce((sum, date) => sum + (account.values[formatDate(date)]?.actual || 0), 0)
                                  )}
                                </td>
                              </tr>
                            ))}
                        </React.Fragment>
                      ))}

                    {/* Linhas faltantes – indicadores, conforme o exemplo de Previsão */}
                    {group.name === 'Deduções' && (
                      <tr className="bg-blue-50 font-medium">
                        <td className="py-3 px-6 text-blue-900">Receita Líquida</td>
                        {dates.map(date => {
                          const dateStr = formatDate(date);
                          const value = calculateNetRevenueActual(dateStr);
                          const colorClasses = getValueColorClasses(value);
                          return (
                            <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            </td>
                          );
                        })}
                        <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            dates.reduce((sum, date) => sum + calculateNetRevenueActual(formatDate(date)), 0)
                          )}
                        </td>
                      </tr>
                    )}
                    {group.name === 'Custos' && (
                      <tr className="bg-blue-50 font-medium">
                        <td className="py-3 px-6 text-blue-900">Lucro Bruto</td>
                        {dates.map(date => {
                          const dateStr = formatDate(date);
                          const value = calculateGrossProfitActual(dateStr);
                          const colorClasses = getValueColorClasses(value);
                          return (
                            <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            </td>
                          );
                        })}
                        <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            dates.reduce((sum, date) => sum + calculateGrossProfitActual(formatDate(date)), 0)
                          )}
                        </td>
                      </tr>
                    )}
                    {group.name === 'Despesas Operacionais' && (
                      <tr className="bg-blue-50 font-medium">
                        <td className="py-3 px-6 text-blue-900">Lucro Antes dos Investimentos</td>
                        {dates.map(date => {
                          const dateStr = formatDate(date);
                          const value = calculateProfitBeforeInvestmentsActual(dateStr);
                          const colorClasses = getValueColorClasses(value);
                          return (
                            <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            </td>
                          );
                        })}
                        <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            dates.reduce((sum, date) => sum + calculateProfitBeforeInvestmentsActual(formatDate(date)), 0)
                          )}
                        </td>
                      </tr>
                    )}
                    {group.name === 'Investimentos' && (
                      <tr className="bg-blue-50 font-medium">
                        <td className="py-3 px-6 text-blue-900">Lucro Operacional</td>
                        {dates.map(date => {
                          const dateStr = formatDate(date);
                          const value = calculateOperatingProfitActual(dateStr);
                          const colorClasses = getValueColorClasses(value);
                          return (
                            <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                            </td>
                          );
                        })}
                        <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                            dates.reduce((sum, date) => sum + calculateOperatingProfitActual(formatDate(date)), 0)
                          )}
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}

              {/* Linhas Resumo – Estas linhas não foram removidas e são parte do arquivo original */}
              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Entradas</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateEntradas(dateStr);
                  const colorClasses = getValueColorClasses(value);
                  return (
                    <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </td>
                  );
                })}
                <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    dates.reduce((sum, date) => sum + calculateEntradas(formatDate(date)), 0)
                  )}
                </td>
              </tr>
              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Saídas</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateSaidas(dateStr);
                  const colorClasses = getValueColorClasses(-value);
                  return (
                    <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </td>
                  );
                })}
                <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    dates.reduce((sum, date) => sum + calculateSaidas(formatDate(date)), 0)
                  )}
                </td>
              </tr>
              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Fluxo (Variação)</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateFluxo(dateStr);
                  const colorClasses = getValueColorClasses(value);
                  return (
                    <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </td>
                  );
                })}
                <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    dates.reduce((sum, date) => sum + calculateFluxo(formatDate(date)), 0)
                  )}
                </td>
              </tr>

              {/* Bloco de Saldo – Aparece UMA vez, ao final */}
              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Saldo inicial do dia</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = getSaldoInicial(dateStr);
                  const colorClasses = getValueColorClasses(value, true);
                  return (
                    <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </td>
                  );
                })}
                <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    getSaldoInicial(formatDate(dates[0]))
                  )}
                </td>
              </tr>
              <tr className="bg-blue-100 font-medium">
                <td className="py-3 px-6 text-blue-900">Saldo final do dia</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateSaldoFinal(dateStr);
                  const colorClasses = getValueColorClasses(value, true);
                  return (
                    <td key={dateStr} className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}>
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value)}
                    </td>
                  );
                })}
                <td className="py-3 px-6 text-right bg-blue-100 text-blue-900 font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    calculateSaldoFinal(formatDate(dates[dates.length - 1]))
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
