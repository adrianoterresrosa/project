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

export function CashFlowActual() {
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

      // Fetch entries with all related data
      const { data: actualEntries, error: actualError } = await supabase
        .from('actual_cash_flow_view')
        .select('*')
        .eq('user_id', userData.user.id);

      if (actualError) throw actualError;

      const newGroupedData: GroupedData = {};

      // Initialize groups
      const uniqueGroups = Array.from(new Set(actualEntries?.map(entry => ({
        id: entry.group_id,
        name: entry.group_name
      })) || []));

      uniqueGroups.forEach(group => {
        newGroupedData[group.id] = {
          name: group.name,
          order: GROUP_ORDER[group.name] || 999,
          isExpanded: false,
          totals: {},
          subgroups: []
        };
      });

      // Initialize subgroups
      const uniqueSubgroups = Array.from(new Set(actualEntries?.map(entry => ({
        id: entry.subgroup_id,
        name: entry.subgroup_name,
        group_id: entry.group_id
      })) || []));

      uniqueSubgroups.forEach(subgroup => {
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

      // Process entries
      actualEntries?.forEach(entry => {
        const dateStr = formatDate(new Date(entry.entry_date));
        const group = newGroupedData[entry.group_id];
        const subgroup = group?.subgroups.find(s => s.id === entry.subgroup_id);
        
        if (group && subgroup) {
          // Initialize account if not exists
          let account = subgroup.accounts.find(a => a.id === entry.account_id);
          if (!account) {
            account = {
              id: entry.account_id,
              name: entry.account_name,
              values: {}
            };
            subgroup.accounts.push(account);
          }

          // Update account values
          if (!account.values[dateStr]) {
            account.values[dateStr] = { actual: 0 };
          }
          account.values[dateStr].actual = (account.values[dateStr].actual || 0) + entry.amount;

          // Update subgroup totals
          if (!subgroup.totals[dateStr]) {
            subgroup.totals[dateStr] = { actual: 0 };
          }
          subgroup.totals[dateStr].actual = (subgroup.totals[dateStr].actual || 0) + entry.amount;

          // Special handling for Movimentações Não Operacionais
          if (group.name === 'Movimentações Não Operacionais') {
            // Calculate net movement at the group level
            const entradasSubgroup = group.subgroups.find(s => s.name === 'Entradas não Operacionais');
            const saidasSubgroup = group.subgroups.find(s => s.name === 'Saídas não Operacionais');

            const entradas = entradasSubgroup?.totals[dateStr]?.actual || 0;
            const saidas = saidasSubgroup?.totals[dateStr]?.actual || 0;

            // Update group total as the net difference (entradas - saidas)
            if (!group.totals[dateStr]) {
              group.totals[dateStr] = { actual: 0 };
            }
            group.totals[dateStr].actual = entradas - saidas;
          } else {
            // Normal handling for other groups
            if (!group.totals[dateStr]) {
              group.totals[dateStr] = { actual: 0 };
            }
            group.totals[dateStr].actual = (group.totals[dateStr].actual || 0) + entry.amount;
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

  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  const getDates = () => {
    const dates: Date[] = [];
    const startDate = new Date(selectedDate);
    let daysToShow = 7;

    switch (viewMode) {
      case 'fortnight':
        daysToShow = 15;
        break;
      case 'month':
        daysToShow = new Date(
          startDate.getFullYear(),
          startDate.getMonth() + 1,
          0
        ).getDate();
        break;
    }

    for (let i = 0; i < daysToShow; i++) {
      dates.push(new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate() + i));
    }

    return dates;
  };

  const dates = getDates();

  const handlePreviousPeriod = () => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() - 7);
        break;
      case 'fortnight':
        newDate.setDate(newDate.getDate() - 15);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() - 1);
        break;
    }
    setSelectedDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(selectedDate);
    switch (viewMode) {
      case 'week':
        newDate.setDate(newDate.getDate() + 7);
        break;
      case 'fortnight':
        newDate.setDate(newDate.getDate() + 15);
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + 1);
        break;
    }
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

    // For Movimentações Não Operacionais, only add to outflows if the net result is negative
    let movimentacoesNaoOperacionais = 0;
    if (movimentacoesGroup) {
      const netMovimentacoes = movimentacoesGroup.totals[date]?.actual || 0;
      if (netMovimentacoes < 0) {
        movimentacoesNaoOperacionais = Math.abs(netMovimentacoes); // Convert to positive for outflows
      }
    }

    return deducoes + custos + despesas + investimentos + movimentacoesNaoOperacionais;
  };

  const calculateFluxo = (date: string) => {
    return calculateEntradas(date) - calculateSaidas(date);
  };

  const getSaldoInicial = (date: string) => {
    const currentDate = new Date(date);
    const previousDate = new Date(currentDate);
    previousDate.setDate(previousDate.getDate() - 1);
    const previousDateStr = formatDate(previousDate);

    if (date === formatDate(dates[0])) {
      return initialBalance;
    }

    return calculateSaldoFinal(previousDateStr);
  };

  const calculateSaldoFinal = (date: string) => {
    return getSaldoInicial(date) + calculateFluxo(date);
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
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                viewMode === 'week'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Semanal
            </button>
            <button
              onClick={() => setViewMode('fortnight')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                viewMode === 'fortnight'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Quinzenal
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={`px-4 py-2 text-sm font-medium rounded-md ${
                viewMode === 'month'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
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
                        {date.toLocaleDateString('pt-BR', { 
                          day: 'numeric',
                          month: 'short'
                        })}
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
                      {dates.map(date => {
                        const dateStr = formatDate(date);
                        const total = group.totals[dateStr]?.actual || 0;
                        const colorClasses = getValueColorClasses(total);
                        return (
                          <td 
                            key={dateStr} 
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
                        }).format(dates.reduce((sum, date) => {
                          const dateStr = formatDate(date);
                          return sum + (group.totals[dateStr]?.actual || 0);
                        }, 0))}
                      </td>
                    </tr>

                    {/* Subgroups and Accounts */}
                    {group.isExpanded && group.subgroups.map(subgroup => (
                      <React.Fragment key={subgroup.id}>
                        {/* Subgroup Row */}
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
                          {dates.map(date => {
                            const dateStr = formatDate(date);
                            const total = subgroup.totals[dateStr]?.actual || 0;
                            return (
                              <td key={dateStr} className="py-2 px-6 text-right font-medium text-gray-700">
                                {new Intl.NumberFormat('pt-BR', {
                                  style: 'currency',
                                  currency: 'BRL'
                                }).format(total)}
                              </td>
                            );
                          })}
                          <td className="py-2 px-6 text-right font-medium text-gray-700">
                            {new Intl.NumberFormat('pt-BR', {
                              style: 'currency',
                              currency: 'BRL'
                            }).format(dates.reduce((sum, date) => {
                              const dateStr = formatDate(date);
                              return sum + (subgroup.totals[dateStr]?.actual || 0);
                            }, 0))}
                          </td>
                        </tr>

                        {/* Account Rows */}
                        {subgroup.isExpanded && subgroup.accounts.map(account => (
                          <tr key={account.id}>
                            <td className="py-2 px-6 pl-16 text-gray-600">
                              {account.name}
                            </td>
                            {dates.map(date => {
                              const dateStr = formatDate(date);
                              const value = account.values[dateStr]?.actual || 0;
                              return (
                                <td key={dateStr} className="py-2 px-6 text-right text-gray-600">
                                  {new Intl.NumberFormat('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL'
                                  }).format(value)}
                                </td>
                              );
                            })}
                            <td className="py-2 px-6 text-right text-gray-600">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(dates.reduce((sum, date) => {
                                const dateStr = formatDate(date);
                                return sum + (account.values[dateStr]?.actual || 0);
                              }, 0))}
                            </td>
                          </tr>
                        ))}
                      </React.Fragment>
                    ))}
                  </React.Fragment>
                ))}

              {/* Summary Lines */}
              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Entradas</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateEntradas(dateStr);
                  const colorClasses = getValueColorClasses(value);
                  return (
                    <td 
                      key={dateStr} 
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
                  }).format(dates.reduce((sum, date) => sum + calculateEntradas(formatDate(date)), 0))}
                </td>
              </tr>

              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Saídas</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateSaidas(dateStr);
                  const colorClasses = getValueColorClasses(-value);
                  return (
                    <td 
                      key={dateStr} 
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
                  }).format(dates.reduce((sum, date) => sum + calculateSaidas(formatDate(date)), 0))}
                </td>
              </tr>

              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Fluxo (Variação)</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateFluxo(dateStr);
                  const colorClasses = getValueColorClasses(value);
                  return (
                    <td 
                      key={dateStr} 
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
                  }).format(dates.reduce((sum, date) => sum + calculateFluxo(formatDate(date)), 0))}
                </td>
              </tr>

              <tr className="bg-blue-50 font-medium">
                <td className="py-3 px-6 text-blue-900">Saldo inicial do dia</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = getSaldoInicial(dateStr);
                  const colorClasses = getValueColorClasses(value, true);
                  return (
                    <td 
                      key={dateStr} 
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
                  }).format(getSaldoInicial(formatDate(dates[0])))}
                </td>
              </tr>

              <tr className="bg-blue-100 font-medium">
                <td className="py-3 px-6 text-blue-900">Saldo final do dia</td>
                {dates.map(date => {
                  const dateStr = formatDate(date);
                  const value = calculateSaldoFinal(dateStr);
                  const colorClasses = getValueColorClasses(value, true);
                  return (
                    <td 
                      key={dateStr} 
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
                  }).format(calculateSaldoFinal(formatDate(dates[dates.length - 1])))}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}