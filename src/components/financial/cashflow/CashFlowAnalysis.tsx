import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';

interface GroupedData {
  [groupId: string]: {
    name: string;
    order: number;
    isExpanded: boolean;
    totals: {
      [month: number]: {
        planned: number;
        actual: number;
      };
    };
    subgroups: {
      id: string;
      name: string;
      isExpanded: boolean;
      totals: {
        [month: number]: {
          planned: number;
          actual: number;
        };
      };
      accounts: {
        id: string;
        name: string;
        values: {
          [month: number]: {
            planned: number;
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

export function CashFlowAnalysis() {
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [initialBalance, setInitialBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Buscando saldo inicial (caso exista)
      try {
        const { data: initialBalanceData } = await supabase
          .from('initial_balance')
          .select('amount')
          .eq('user_id', userData.user.id)
          .eq('year', selectedYear)
          .single();
        setInitialBalance(initialBalanceData?.amount || 0);
      } catch (e) {
        console.error("Erro ao buscar saldo inicial", e);
        setInitialBalance(0);
      }

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

      const newGroupedData: GroupedData = {};

      groupsResult.data.forEach(group => {
        newGroupedData[group.id] = {
          name: group.name,
          order: GROUP_ORDER[group.name] || 999,
          isExpanded: false,
          totals: {},
          subgroups: []
        };
      });

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

      accountsResult.data.forEach(account => {
        const subgroup = subgroupsResult.data.find(s => s.id === account.subgroup_id);
        if (subgroup && newGroupedData[subgroup.group_id]) {
          const groupSubgroup = newGroupedData[subgroup.group_id].subgroups
            .find(s => s.id === account.subgroup_id);
          
          if (groupSubgroup) {
            groupSubgroup.accounts.push({
              id: account.id,
              name: account.name,
              values: {}
            });
          }
        }
      });

      // Processa as entradas para valores planned e actual
      entriesResult.data.forEach(entry => {
        const account = accountsResult.data.find(a => a.id === entry.account_id);
        if (account) {
          const subgroup = subgroupsResult.data.find(s => s.id === account.subgroup_id);
          if (subgroup && newGroupedData[subgroup.group_id]) {
            const groupSubgroup = newGroupedData[subgroup.group_id].subgroups
              .find(s => s.id === account.subgroup_id);
            
            if (groupSubgroup) {
              const groupAccount = groupSubgroup.accounts
                .find(a => a.id === account.id);
              
              if (groupAccount) {
                const month = new Date(entry.date).getMonth() + 1;
                if (!groupAccount.values[month]) {
                  groupAccount.values[month] = { planned: 0, actual: 0 };
                }
                if (entry.type === 'planned') {
                  groupAccount.values[month].planned += entry.amount;
                } else {
                  groupAccount.values[month].actual += entry.amount;
                }

                if (!groupSubgroup.totals[month]) {
                  groupSubgroup.totals[month] = { planned: 0, actual: 0 };
                }
                if (entry.type === 'planned') {
                  groupSubgroup.totals[month].planned += entry.amount;
                } else {
                  groupSubgroup.totals[month].actual += entry.amount;
                }

                if (!newGroupedData[subgroup.group_id].totals[month]) {
                  newGroupedData[subgroup.group_id].totals[month] = { planned: 0, actual: 0 };
                }
                if (entry.type === 'planned') {
                  newGroupedData[subgroup.group_id].totals[month].planned += entry.amount;
                } else {
                  newGroupedData[subgroup.group_id].totals[month].actual += entry.amount;
                }
              }
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

  const calculatePerformance = (planned: number, actual: number) => {
    if (!planned) return 0;
    return (actual / planned) * 100;
  };

  const calculateVerticalAnalysis = (value: number, totalPlanned: number) => {
    if (!totalPlanned) return 0;
    return (value / totalPlanned) * 100;
  };

  // Cálculos dos indicadores de forecast
  const calculateNetRevenue = (month: number) => {
    const receita = Object.values(groupedData).find(g => g.name === 'Receita');
    const receitaFinanceira = Object.values(groupedData).find(g => g.name === 'Receita Financeira');
    const deducoes = Object.values(groupedData).find(g => g.name === 'Deduções');
    const planned = (receita?.totals[month]?.planned || 0) +
      (receitaFinanceira?.totals[month]?.planned || 0) -
      (deducoes?.totals[month]?.planned || 0);
    const actual = (receita?.totals[month]?.actual || 0) +
      (receitaFinanceira?.totals[month]?.actual || 0) -
      (deducoes?.totals[month]?.actual || 0);
    return { planned, actual };
  };

  const calculateGrossProfit = (month: number) => {
    const net = calculateNetRevenue(month);
    const custos = Object.values(groupedData).find(g => g.name === 'Custos');
    const planned = net.planned - (custos?.totals[month]?.planned || 0);
    const actual = net.actual - (custos?.totals[month]?.actual || 0);
    return { planned, actual };
  };

  const calculateProfitBeforeInvestments = (month: number) => {
    const gross = calculateGrossProfit(month);
    const despesas = Object.values(groupedData).find(g => g.name === 'Despesas Operacionais');
    const planned = gross.planned - (despesas?.totals[month]?.planned || 0);
    const actual = gross.actual - (despesas?.totals[month]?.actual || 0);
    return { planned, actual };
  };

  const calculateOperatingProfit = (month: number) => {
    const beforeInvest = calculateProfitBeforeInvestments(month);
    const investimentos = Object.values(groupedData).find(g => g.name === 'Investimentos');
    const planned = beforeInvest.planned - (investimentos?.totals[month]?.planned || 0);
    const actual = beforeInvest.actual - (investimentos?.totals[month]?.actual || 0);
    return { planned, actual };
  };

  const calculateNetCashProfit = (month: number) => {
    const operProfit = calculateOperatingProfit(month);
    const movNaoOp = Object.values(groupedData).find(g => g.name === 'Movimentações Não Operacionais');
    const planned = operProfit.planned + (movNaoOp?.totals[month]?.planned || 0);
    const actual = operProfit.actual + (movNaoOp?.totals[month]?.actual || 0);
    return { planned, actual };
  };

  // Ajuste: O cálculo do Lucro Líquido Acumulado (Reservas) agora inclui o saldo inicial
  const calculateAccumulatedProfit = (month: number) => {
    let cumulativePlanned = initialBalance;
    let cumulativeActual = initialBalance;
    for (let m = 1; m <= month; m++) {
      const netCash = calculateNetCashProfit(m);
      cumulativePlanned += netCash.planned;
      cumulativeActual += netCash.actual;
    }
    return { planned: cumulativePlanned, actual: cumulativeActual };
  };

  // Funções auxiliares para renderizar as linhas forecast
  const renderForecastRow = (label: string, calcFn: (month: number) => { planned: number; actual: number }) => {
    const monthlyValues = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      return calcFn(month);
    });
    const annualTotal = monthlyValues.reduce(
      (sum, { planned, actual }) => ({
        planned: sum.planned + planned,
        actual: sum.actual + actual,
      }),
      { planned: 0, actual: 0 }
    );
    return (
      <tr className="bg-blue-50 font-medium">
        <td className="py-3 px-6 text-blue-900">{label}</td>
        {monthlyValues.map((value, idx) => {
          const ah = calculatePerformance(value.planned, value.actual);
          const av = calculateVerticalAnalysis(value.actual, annualTotal.actual);
          return (
            <React.Fragment key={idx}>
              <td className="py-3 px-6 text-right font-medium text-blue-900 border-l border-gray-200">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value.planned)}
              </td>
              <td className="py-3 px-6 text-right font-medium text-blue-900">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value.actual)}
              </td>
              <td className="py-3 px-6 text-right font-medium text-blue-900">
                {ah.toFixed(1)}%
              </td>
              <td className="py-3 px-6 text-right font-medium text-blue-900">
                {av.toFixed(1)}%
              </td>
            </React.Fragment>
          );
        })}
        <td className="py-3 px-6 text-right font-medium text-blue-900 border-l border-gray-200">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualTotal.planned)}
        </td>
        <td className="py-3 px-6 text-right font-medium text-blue-900">
          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualTotal.actual)}
        </td>
        <td className="py-3 px-6 text-right font-medium text-blue-900">
          {annualTotal.planned
            ? ((annualTotal.actual / annualTotal.planned) * 100).toFixed(1) + '%'
            : '0.0%'}
        </td>
        <td className="py-3 px-6 text-right font-medium text-blue-900">100%</td>
      </tr>
    );
  };

  const renderSaldoInicialRow = () => {
    return (
      <tr className="bg-gray-100 font-medium">
        <td className="py-3 px-6 text-gray-900">Saldo Inicial ({selectedYear})</td>
        {Array.from({ length: 52 }, (_, i) => (
          <td key={i} className="py-3 px-6 text-right font-medium text-gray-900">
            {i === 0
              ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(initialBalance)
              : ''}
          </td>
        ))}
      </tr>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-red-600">{error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Análise de Fluxo de Caixa</h1>

        <div className="flex items-center space-x-4">
          <div className="flex items-center bg-white rounded-lg border border-gray-200 p-1">
            <button
              onClick={() => setSelectedYear(prev => prev - 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <div className="flex items-center px-3">
              <Calendar className="h-5 w-5 text-gray-400 mr-2" />
              <span className="text-sm font-medium">{selectedYear}</span>
            </div>
            <button
              onClick={() => setSelectedYear(prev => prev + 1)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-gray-500" />
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
                {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                  <React.Fragment key={month}>
                    <th className="text-center border-l border-gray-200" colSpan={4}>
                      <div className="px-6 py-2">
                        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {new Date(2000, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                        </span>
                      </div>
                    </th>
                  </React.Fragment>
                ))}
                <th className="text-center border-l border-gray-200" colSpan={4}>
                  <div className="px-6 py-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Ano
                    </span>
                  </div>
                </th>
              </tr>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="py-2 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  &nbsp;
                </th>
                {[...Array(13)].map((_, i) => (
                  <React.Fragment key={i}>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                      Prev
                    </th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Real
                    </th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AH
                    </th>
                    <th className="py-2 px-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      AV
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(groupedData)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([groupId, group]) => {
                  const monthlyData = Array.from({ length: 12 }, (_, i) => i + 1).map(month => ({
                    planned: group.totals[month]?.planned || 0,
                    actual: group.totals[month]?.actual || 0
                  }));

                  const annualTotal = monthlyData.reduce(
                    (sum, data) => ({
                      planned: sum.planned + data.planned,
                      actual: sum.actual + data.actual
                    }),
                    { planned: 0, actual: 0 }
                  );

                  return (
                    <React.Fragment key={groupId}>
                      <tr className="bg-gray-50">
                        <td
                          className="py-2 px-6 font-medium text-gray-900 flex items-center cursor-pointer"
                          onClick={() => {
                            setGroupedData(prev => ({
                              ...prev,
                              [groupId]: {
                                ...prev[groupId],
                                isExpanded: !prev[groupId].isExpanded
                              }
                            }));
                          }}
                        >
                          {group.isExpanded ? (
                            <ChevronDown className="h-4 w-4 mr-2" />
                          ) : (
                            <ChevronRight className="h-4 w-4 mr-2" />
                          )}
                          {group.name}
                        </td>
                        {monthlyData.map((data, index) => {
                          const ah = calculatePerformance(data.planned, data.actual);
                          const av = calculateVerticalAnalysis(data.actual, annualTotal.actual);
                          return (
                            <React.Fragment key={index}>
                              <td className="py-2 px-2 text-right font-medium text-gray-900 border-l border-gray-200">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.planned)}
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-gray-900">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.actual)}
                              </td>
                              <td className={`py-2 px-2 text-right font-medium ${ah >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                {ah.toFixed(1)}%
                              </td>
                              <td className="py-2 px-2 text-right font-medium text-gray-900">
                                {av.toFixed(1)}%
                              </td>
                            </React.Fragment>
                          );
                        })}
                        {/* Total Anual */}
                        <td className="py-2 px-2 text-right font-medium text-gray-900 border-l border-gray-200">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualTotal.planned)}
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-gray-900">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(annualTotal.actual)}
                        </td>
                        <td className={`py-2 px-2 text-right font-medium ${annualTotal.planned && annualTotal.actual / annualTotal.planned >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                          {annualTotal.planned
                            ? ((annualTotal.actual / annualTotal.planned) * 100).toFixed(1)
                            : '0.0'}%
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-gray-900">
                          100%
                        </td>
                      </tr>

                      {group.isExpanded &&
                        group.subgroups.map(subgroup => {
                          const subgroupMonthlyData = Array.from({ length: 12 }, (_, i) => i + 1).map(month => ({
                            planned: subgroup.totals[month]?.planned || 0,
                            actual: subgroup.totals[month]?.actual || 0
                          }));

                          const subgroupAnnualTotal = subgroupMonthlyData.reduce(
                            (sum, data) => ({
                              planned: sum.planned + data.planned,
                              actual: sum.actual + data.actual
                            }),
                            { planned: 0, actual: 0 }
                          );

                          return (
                            <React.Fragment key={subgroup.id}>
                              <tr className="bg-gray-25">
                                <td
                                  className="py-2 px-6 pl-10 font-medium text-gray-700 flex items-center cursor-pointer"
                                  onClick={() => {
                                    setGroupedData(prev => ({
                                      ...prev,
                                      [groupId]: {
                                        ...prev[groupId],
                                        subgroups: prev[groupId].subgroups.map(s =>
                                          s.id === subgroup.id ? { ...s, isExpanded: !s.isExpanded } : s
                                        )
                                      }
                                    }));
                                  }}
                                >
                                  {subgroup.isExpanded ? (
                                    <ChevronDown className="h-4 w-4 mr-2" />
                                  ) : (
                                    <ChevronRight className="h-4 w-4 mr-2" />
                                  )}
                                  {subgroup.name}
                                </td>
                                {subgroupMonthlyData.map((data, index) => {
                                  const ah = calculatePerformance(data.planned, data.actual);
                                  const av = calculateVerticalAnalysis(data.actual, annualTotal.actual);
                                  return (
                                    <React.Fragment key={index}>
                                      <td className="py-2 px-2 text-right font-medium text-gray-700 border-l border-gray-200">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.planned)}
                                      </td>
                                      <td className="py-2 px-2 text-right font-medium text-gray-700">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.actual)}
                                      </td>
                                      <td className={`py-2 px-2 text-right font-medium ${ah >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                        {ah.toFixed(1)}%
                                      </td>
                                      <td className="py-2 px-2 text-right font-medium text-gray-700">
                                        {av.toFixed(1)}%
                                      </td>
                                    </React.Fragment>
                                  );
                                })}
                                {/* Total Anual do Subgrupo */}
                                <td className="py-2 px-2 text-right font-medium text-gray-700 border-l border-gray-200">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subgroupAnnualTotal.planned)}
                                </td>
                                <td className="py-2 px-2 text-right font-medium text-gray-700">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(subgroupAnnualTotal.actual)}
                                </td>
                                <td className={`py-2 px-2 text-right font-medium ${subgroupAnnualTotal.planned && subgroupAnnualTotal.actual / subgroupAnnualTotal.planned >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                  {subgroupAnnualTotal.planned
                                    ? ((subgroupAnnualTotal.actual / subgroupAnnualTotal.planned) * 100).toFixed(1)
                                    : '0.0'}%
                                </td>
                                <td className="py-2 px-2 text-right font-medium text-gray-700">
                                  {annualTotal.actual
                                    ? ((subgroupAnnualTotal.actual / annualTotal.actual) * 100).toFixed(1)
                                    : '0.0'}%
                                </td>
                              </tr>

                              {subgroup.isExpanded &&
                                subgroup.accounts.map(account => {
                                  const accountMonthlyData = Array.from({ length: 12 }, (_, i) => i + 1).map(month => ({
                                    planned: account.values[month]?.planned || 0,
                                    actual: account.values[month]?.actual || 0
                                  }));

                                  const accountAnnualTotal = accountMonthlyData.reduce(
                                    (sum, data) => ({
                                      planned: sum.planned + data.planned,
                                      actual: sum.actual + data.actual
                                    }),
                                    { planned: 0, actual: 0 }
                                  );

                                  return (
                                    <tr key={account.id}>
                                      <td className="py-2 px-6 pl-16 text-gray-600">
                                        {account.name}
                                      </td>
                                      {accountMonthlyData.map((data, index) => {
                                        const ah = calculatePerformance(data.planned, data.actual);
                                        const av = calculateVerticalAnalysis(data.actual, annualTotal.actual);
                                        return (
                                          <React.Fragment key={index}>
                                            <td className="py-2 px-2 text-right text-gray-600 border-l border-gray-200">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.planned)}
                                            </td>
                                            <td className="py-2 px-2 text-right text-gray-600">
                                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(data.actual)}
                                            </td>
                                            <td className={`py-2 px-2 text-right ${ah >= 100 ? 'text-green-600' : 'text-red-600'}`}>
                                              {ah.toFixed(1)}%
                                            </td>
                                            <td className="py-2 px-2 text-right text-gray-600">
                                              {av.toFixed(1)}%
                                            </td>
                                          </React.Fragment>
                                        );
                                      })}
                                      {/* Total Anual da Conta */}
                                      <td className="py-2 px-2 text-right text-gray-600 border-l border-gray-200">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accountAnnualTotal.planned)}
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-600">
                                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(accountAnnualTotal.actual)}
                                      </td>
                                      <td className={`py-2 px-2 text-right ${accountAnnualTotal.planned && accountAnnualTotal.actual / accountAnnualTotal.planned >= 1 ? 'text-green-600' : 'text-red-600'}`}>
                                        {accountAnnualTotal.planned
                                          ? ((accountAnnualTotal.actual / accountAnnualTotal.planned) * 100).toFixed(1)
                                          : '0.0'}%
                                      </td>
                                      <td className="py-2 px-2 text-right text-gray-600">
                                        {annualTotal.actual
                                          ? ((accountAnnualTotal.actual / annualTotal.actual) * 100).toFixed(1)
                                          : '0.0'}%
                                      </td>
                                    </tr>
                                  );
                                })}
                            </React.Fragment>
                          );
                        })}
                      {/* Inserindo as linhas forecast conforme a ordem dos grupos */}
                      {group.name === 'Deduções' && renderForecastRow("Receita Líquida", calculateNetRevenue)}
                      {group.name === 'Custos' && renderForecastRow("Lucro Bruto", calculateGrossProfit)}
                      {group.name === 'Despesas Operacionais' &&
                        renderForecastRow("Lucro Antes dos Investimentos", calculateProfitBeforeInvestments)}
                      {group.name === 'Investimentos' && renderForecastRow("Lucro Operacional", calculateOperatingProfit)}
                      {group.name === 'Movimentações Não Operacionais' && (
                        <>
                          {renderForecastRow("Lucro Líquido de Caixa Mensal", calculateNetCashProfit)}
                          {renderForecastRow("Lucro Líquido Acumulado (Reservas)", calculateAccumulatedProfit)}
                          {renderSaldoInicialRow()}
                        </>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
