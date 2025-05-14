import React, { useState } from 'react';
import { Plus, X, GripHorizontal } from 'lucide-react';
import type { Entry, Group, Account, Subgroup } from '../../../types/finance';
import { BarChartWidget } from './widgets/BarChartWidget';
import { PieChartWidget } from './widgets/PieChartWidget';
import { MetricsWidget } from './widgets/MetricsWidget';
import { LineChartWidget } from './widgets/LineChartWidget';

interface DashboardGridProps {
  entries: Entry[];
  groups: Group[];
  accounts: Account[];
  subgroups: Subgroup[];
}

export type Widget = {
  id: string;
  type: 'bar' | 'pie' | 'metrics' | 'line';
  title: string;
  size: 'small' | 'medium' | 'large';
};

export function DashboardGrid({ entries, groups, accounts, subgroups }: DashboardGridProps) {
  const [widgets, setWidgets] = useState<Widget[]>([
    { 
      id: '1', 
      type: 'metrics', 
      title: 'Métricas Principais', 
      size: 'large'
    },
    { 
      id: '2', 
      type: 'bar', 
      title: 'Análise Mensal', 
      size: 'medium'
    },
    { 
      id: '3', 
      type: 'pie', 
      title: 'Distribuição por Grupo', 
      size: 'medium'
    }
  ]);

  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [newWidget, setNewWidget] = useState<Partial<Widget>>({
    title: '',
    type: 'bar',
    size: 'medium'
  });

  const handleAddWidget = () => {
    if (newWidget.title && newWidget.type) {
      const widget: Widget = {
        id: Date.now().toString(),
        title: newWidget.title,
        type: newWidget.type as Widget['type'],
        size: newWidget.size as Widget['size']
      };
      setWidgets([...widgets, widget]);
      setNewWidget({ title: '', type: 'bar', size: 'medium' });
      setIsAddingWidget(false);
    }
  };

  const handleRemoveWidget = (id: string) => {
    setWidgets(widgets.filter(w => w.id !== id));
  };

  const handleUpdateWidget = (id: string, updates: Partial<Widget>) => {
    setWidgets(widgets.map(w => w.id === id ? { ...w, ...updates } : w));
  };

  const renderWidget = (widget: Widget) => {
    const props = {
      entries,
      groups,
      accounts,
      subgroups,
      onRemove: () => handleRemoveWidget(widget.id),
      onUpdate: (updates: Partial<Widget>) => handleUpdateWidget(widget.id, updates),
      title: widget.title
    };

    switch (widget.type) {
      case 'metrics':
        return <MetricsWidget {...props} />;
      case 'bar':
        return <BarChartWidget {...props} />;
      case 'pie':
        return <PieChartWidget {...props} />;
      case 'line':
        return <LineChartWidget {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold text-gray-900">Dashboard</h2>
        <div className="relative">
          <button
            onClick={() => setIsAddingWidget(!isAddingWidget)}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Widget
          </button>

          {isAddingWidget && (
            <>
              {/* Overlay */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 z-40"
                onClick={() => setIsAddingWidget(false)}
              />
              
              {/* Modal */}
              <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg z-50 border border-gray-200">
                <div className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Novo Widget</h3>
                    <button
                      onClick={() => setIsAddingWidget(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Nome do Widget
                      </label>
                      <input
                        type="text"
                        value={newWidget.title}
                        onChange={(e) => setNewWidget({ ...newWidget, title: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Digite um nome para o widget"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tipo de Gráfico
                      </label>
                      <select
                        value={newWidget.type}
                        onChange={(e) => setNewWidget({ ...newWidget, type: e.target.value as Widget['type'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="bar">Gráfico de Barras</option>
                        <option value="pie">Gráfico de Pizza</option>
                        <option value="line">Gráfico de Linha</option>
                        <option value="metrics">Métricas</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tamanho
                      </label>
                      <select
                        value={newWidget.size}
                        onChange={(e) => setNewWidget({ ...newWidget, size: e.target.value as Widget['size'] })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="small">Pequeno</option>
                        <option value="medium">Médio</option>
                        <option value="large">Grande</option>
                      </select>
                    </div>

                    <div className="flex justify-end space-x-2 pt-4 border-t border-gray-200">
                      <button
                        type="button"
                        onClick={() => setIsAddingWidget(false)}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={handleAddWidget}
                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        Adicionar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grid de Widgets */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {widgets.map(widget => (
          <div
            key={widget.id}
            className={`${
              widget.size === 'large' ? 'lg:col-span-3' :
              widget.size === 'medium' ? 'lg:col-span-2' : ''
            }`}
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  <GripHorizontal className="w-4 h-4 text-gray-400 mr-2 cursor-move" />
                  <input
                    type="text"
                    value={widget.title}
                    onChange={(e) => handleUpdateWidget(widget.id, { title: e.target.value })}
                    className="text-sm font-medium text-gray-900 bg-transparent border-none focus:outline-none focus:ring-0"
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <select
                    value={widget.size}
                    onChange={(e) => handleUpdateWidget(widget.id, { size: e.target.value as Widget['size'] })}
                    className="text-sm border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="small">Pequeno</option>
                    <option value="medium">Médio</option>
                    <option value="large">Grande</option>
                  </select>
                  <button
                    onClick={() => handleRemoveWidget(widget.id)}
                    className="p-1 hover:bg-gray-100 rounded-lg"
                  >
                    <X className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="p-6">
                {renderWidget(widget)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}