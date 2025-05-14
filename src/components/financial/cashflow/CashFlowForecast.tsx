import React, { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { ChevronDown, ChevronRight, ChevronLeft, Calendar } from 'lucide-react';
import type { Entry, Account, Group, Subgroup } from '../../../types/finance';

interface GroupedData {
  [groupId: string]: {
    name: string;
    order: number;
    isExpanded: boolean;
    totals: {
      [month: number]: {
        planned: number;
      };
    };
    subgroups: {
      id: string;
      name: string;
      isExpanded: boolean;
      totals: {
        [month: number]: {
          planned: number;
        };
      };
      accounts: {
        id: string;
        name: string;
        values: {
          [month: number]: {
            planned: number;
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

export function CashFlowForecast() {
  const [groupedData, setGroupedData] = useState<GroupedData>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [currentQuarter, setCurrentQuarter] = useState(0);
  const [initialBalance, setInitialBalance] = useState(0);

  useEffect(() => {
    fetchData();
  }, [selectedYear]);

  const fetchData = async () => {
    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError) throw authError;
      if (!userData.user) throw new Error('Usuário não autenticado');

      // Fetch initial balance first
      const { data: initialBalanceData } = await supabase
        .from('initial_balance')
        .select('amount')
        .eq('user_id', userData.user.id)
        .eq('year', selectedYear)
        .single();

      setInitialBalance(initialBalanceData?.amount || 0);

      const [entriesResult, groupsResult, accountsResult, subgroupsResult] = await Promise.all([
        supabase
          .from('entries')
          .select('*')
          .eq('user_id', userData.user.id)
          .eq('type', 'planned'),
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
                  groupAccount.values[month] = { planned: 0 };
                }
                groupAccount.values[month].planned += entry.amount;

                if (!groupSubgroup.totals[month]) {
                  groupSubgroup.totals[month] = { planned: 0 };
                }
                groupSubgroup.totals[month].planned += entry.amount;

                if (!newGroupedData[subgroup.group_id].totals[month]) {
                  newGroupedData[subgroup.group_id].totals[month] = { planned: 0 };
                }
                newGroupedData[subgroup.group_id].totals[month].planned += entry.amount;
              }
            }
          }
        }
      });

      setGroupedData(newGroupedData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
      setError(error instanceof Error ? error.message : 'Erro ao carregar dados. Por favor, tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const calculateGroupTotal = (group: GroupedData[string], month: number) => {
    if (group.name === 'Movimentações Não Operacionais') {
      const entradasSubgroup = group.subgroups.find(s => s.name === 'Entradas não Operacionais');
      const entradasTotal = entradasSubgroup?.totals[month]?.planned || 0;

      const saidasSubgroup = group.subgroups.find(s => s.name === 'Saídas não Operacionais');
      const saidasTotal = saidasSubgroup?.totals[month]?.planned || 0;

      return entradasTotal - saidasTotal;
    }

    return group.subgroups.reduce((sum, subgroup) => 
      sum + (subgroup.totals[month]?.planned || 0), 0);
  };

  const calculateYearlyTotal = (group: GroupedData[string]) => {
    return Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
      return sum + (group.totals[month]?.planned || 0);
    }, 0);
  };

  const calculateNetRevenue = (month: number) => {
    const receitaGroup = Object.values(groupedData).find(g => g.name === 'Receita');
    const receitaFinanceiraGroup = Object.values(groupedData).find(g => g.name === 'Receita Financeira');
    const deducoesGroup = Object.values(groupedData).find(g => g.name === 'Deduções');

    const receita = receitaGroup ? calculateGroupTotal(receitaGroup, month) : 0;
    const receitaFinanceira = receitaFinanceiraGroup ? calculateGroupTotal(receitaFinanceiraGroup, month) : 0;
    const deducoes = deducoesGroup ? calculateGroupTotal(deducoesGroup, month) : 0;

    return receita + receitaFinanceira - deducoes;
  };

  const calculateYearlyNetRevenue = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
      return sum + calculateNetRevenue(month);
    }, 0);
  };

  const calculateGrossProfit = (month: number) => {
    const netRevenue = calculateNetRevenue(month);
    const custosGroup = Object.values(groupedData).find(g => g.name === 'Custos');
    const custos = custosGroup ? calculateGroupTotal(custosGroup, month) : 0;
    return netRevenue - custos;
  };

  const calculateYearlyGrossProfit = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
      return sum + calculateGrossProfit(month);
    }, 0);
  };

  const calculateProfitBeforeInvestments = (month: number) => {
    const grossProfit = calculateGrossProfit(month);
    const despesasGroup = Object.values(groupedData).find(g => g.name === 'Despesas Operacionais');
    const despesas = despesasGroup ? calculateGroupTotal(despesasGroup, month) : 0;
    return grossProfit - despesas;
  };

  const calculateYearlyProfitBeforeInvestments = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
      return sum + calculateProfitBeforeInvestments(month);
    }, 0);
  };

  const calculateOperatingProfit = (month: number) => {
    const profitBeforeInvestments = calculateProfitBeforeInvestments(month);
    const investimentosGroup = Object.values(groupedData).find(g => g.name === 'Investimentos');
    const investimentos = investimentosGroup ? calculateGroupTotal(investimentosGroup, month) : 0;
    return profitBeforeInvestments - investimentos;
  };

  const calculateYearlyOperatingProfit = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
      return sum + calculateOperatingProfit(month);
    }, 0);
  };

  const calculateNetCashProfit = (month: number) => {
    const operatingProfit = calculateOperatingProfit(month);
    const movimentacoesGroup = Object.values(groupedData).find(g => g.name === 'Movimentações Não Operacionais');
    const movimentacoes = movimentacoesGroup ? calculateGroupTotal(movimentacoesGroup, month) : 0;
    return operatingProfit + movimentacoes;
  };

  const calculateYearlyNetCashProfit = () => {
    return Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
      return sum + calculateNetCashProfit(month);
    }, 0);
  };

  const calculateAccumulatedProfit = (month: number) => {
    const currentMonthProfit = calculateNetCashProfit(month);
    
    if (month === 1) {
      return initialBalance + currentMonthProfit;
    }

    const previousMonthAccumulated = calculateAccumulatedProfit(month - 1);
    return previousMonthAccumulated + currentMonthProfit;
  };

  const calculateYearlyAccumulatedProfit = () => {
    return initialBalance + calculateYearlyNetCashProfit();
  };

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

  const currentMonths = [
    currentQuarter * 3 + 1,
    currentQuarter * 3 + 2,
    currentQuarter * 3 + 3
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900">Previsão de Fluxo de Caixa</h1>
        
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

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentQuarter(prev => (prev > 0 ? prev - 1 : 3))}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-gray-500" />
            </button>
            <span className="text-sm font-medium text-gray-700">
              {currentQuarter * 3 + 1}º ao {(currentQuarter + 1) * 3}º mês
            </span>
            <button
              onClick={() => setCurrentQuarter(prev => (prev < 3 ? prev + 1 : 0))}
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
              <tr className="border-b border-gray-200">
                <th className="py-4 px-6 text-left text-sm font-medium text-gray-500">
                  Descrição
                </th>
                {currentMonths.map(month => (
                  <th key={month} className="py-4 px-6 text-right text-sm font-medium text-gray-500">
                    {new Date(2000, month - 1).toLocaleString('pt-BR', { month: 'long' })}
                  </th>
                ))}
                <th className="py-4 px-6 text-right text-sm font-medium text-gray-500">
                  Total Ano
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Object.entries(groupedData)
                .sort(([, a], [, b]) => a.order - b.order)
                .map(([groupId, group]) => {
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
                        {currentMonths.map(month => {
                          const total = calculateGroupTotal(group, month);
                          const colorClasses = getValueColorClasses(total);
                          return (
                            <td 
                              key={month} 
                              className={`py-2 px-6 text-right font-medium ${colorClasses.text}`}
                            >
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(total)}
                            </td>
                          );
                        })}
                        <td className="py-2 px-6 text-right font-medium text-gray-900">
                          {new Intl.NumberFormat('pt-BR', {
                            style: 'currency',
                            currency: 'BRL'
                          }).format(calculateYearlyTotal(group))}
                        </td>
                      </tr>

                      {group.isExpanded && group.subgroups.map(subgroup => (
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
                                      s.id === subgroup.id
                                        ? { ...s, isExpanded: !s.isExpanded }
                                        : s
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
                            {currentMonths.map(month => (
                              <td key={month} className="py-2 px-6 text-right font-medium text-gray-700">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(subgroup.totals[month]?.planned || 0)}
                              </td>
                            ))}
                            <td className="py-2 px-6 text-right font-medium text-gray-700">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
                                return sum + (subgroup.totals[month]?.planned || 0);
                              }, 0))}
                            </td>
                          </tr>

                          {subgroup.isExpanded && subgroup.accounts.map(account => (
                            <tr key={account.id}>
                              <td className="py-2 px-6 pl-16 text-gray-600">
                                {account.name}
                              </td>
                              {currentMonths.map(month => (
                                <td key={month} className="py-2 px-6 text-right text-gray-600">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(account.values[month]?.planned || 0)}
                                </td>
                              ))}
                              <td className="py-2 px-6 text-right text-gray-600">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(Array.from({ length: 12 }, (_, i) => i + 1).reduce((sum, month) => {
                                  return sum + (account.values[month]?.planned || 0);
                                }, 0))}
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      ))}

                      {group.name === 'Deduções' && (
                        <tr className="bg-blue-50 font-medium">
                          <td className="py-3 px-6 text-blue-900">Receita Líquida</td>
                          {currentMonths.map(month => {
                            const value = calculateNetRevenue(month);
                            const colorClasses = getValueColorClasses(value);
                            return (
                              <td 
                                key={month} 
                                className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}
                              >
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(value)}
                              </td>
                            );
                          })}
                          <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(calculateYearlyNetRevenue())}
                          </td>
                        </tr>
                      )}

                      {group.name === 'Custos' && (
                        <tr className="bg-blue-50 font-medium">
                          <td className="py-3 px-6 text-blue-900">Lucro Bruto</td>
                          {currentMonths.map(month => {
                            const value = calculateGrossProfit(month);
                            const colorClasses = getValueColorClasses(value);
                            return (
                              <td 
                                key={month} 
                                className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}
                              >
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(value)}
                              </td>
                            );
                          })}
                          <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(calculateYearlyGrossProfit())}
                          </td>
                        </tr>
                      )}

                      {group.name === 'Despesas Operacionais' && (
                        <tr className="bg-blue-50 font-medium">
                          <td className="py-3 px-6 text-blue-900">Lucro Antes dos Investimentos</td>
                          {currentMonths.map(month => {
                            const value = calculateProfitBeforeInvestments(month);
                            const colorClasses = getValueColorClasses(value);
                            return (
                              <td 
                                key={month} 
                                className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}
                              >
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(value)}
                              </td>
                            );
                          })}
                          <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(calculateYearlyProfitBeforeInvestments())}
                          </td>
                        </tr>
                      )}

                      {group.name === 'Investimentos' && (
                        <tr className="bg-blue-50 font-medium">
                          <td className="py-3 px-6 text-blue-900">Lucro Operacional</td>
                          {currentMonths.map(month => {
                            const value = calculateOperatingProfit(month);
                            const colorClasses = getValueColorClasses(value);
                            return (
                              <td 
                                key={month} 
                                className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}
                              >
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(value)}
                              </td>
                            );
                          })}
                          <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(calculateYearlyOperatingProfit())}
                          </td>
                        </tr>
                      )}

                      {group.name === 'Movimentações Não Operacionais' && (
                        <>
                          <tr className="bg-blue-50 font-medium">
                            <td className="py-3 px-6 text-blue-900">Lucro Líquido de Caixa Mensal</td>
                            {currentMonths.map(month => {
                              const value = calculateNetCashProfit(month);
                              const colorClasses = getValueColorClasses(value);
                              return (
                                <td 
                                  key={month} 
                                  className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}
                                >
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(value)}
                                </td>
                              );
                            })}
                            <td className="py-3 px-6 text-right bg-blue-50 text-blue-900 font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(calculateYearlyNetCashProfit())}
                            </td>
                          </tr>
                          <tr className="bg-blue-100 font-medium">
                            <td className="py-3 px-6 text-blue-900">Lucro Líquido Acumulado (Reservas)</td>
                            {currentMonths.map(month => {
                              const value = calculateAccumulatedProfit(month);
                              const colorClasses = getValueColorClasses(value, true);
                              return (
                                <td 
                                  key={month} 
                                  className={`py-3 px-6 text-right ${colorClasses.cell} ${colorClasses.text}`}
                                >
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(value)}
                                </td>
                              );
                            })}
                            <td className="py-3 px-6 text-right bg-blue-100 text-blue-900 font-medium">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(calculateYearlyAccumulatedProfit())}
                            </td>
                          </tr>
                          <tr className="bg-gray-100 font-medium">
                            <td className="py-3 px-6 text-gray-900">Saldo Inicial ({selectedYear})</td>
                            <td className="py-3 px-6 text-right font-medium text-gray-900">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(initialBalance)}
                            </td>
                            <td colSpan={3}></td>
                          </tr>
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