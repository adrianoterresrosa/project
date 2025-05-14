import React from 'react';
import { Calendar } from 'lucide-react';

interface AnalysisFiltersProps {
  selectedYear: number;
  selectedMonth: number;
  onYearChange: (year: number) => void;
  onMonthChange: (month: number) => void;
}

export function AnalysisFilters({
  selectedYear,
  selectedMonth,
  onYearChange,
  onMonthChange
}: AnalysisFiltersProps) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);

  return (
    <div className="flex items-center space-x-4">
      <div className="relative">
        <Calendar className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
        <select
          value={selectedYear}
          onChange={(e) => onYearChange(Number(e.target.value))}
          className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          {years.map(year => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <select
        value={selectedMonth}
        onChange={(e) => onMonthChange(Number(e.target.value))}
        className="px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        {Array.from({ length: 12 }, (_, i) => (
          <option key={i + 1} value={i + 1}>
            {new Date(2000, i).toLocaleString('pt-BR', { month: 'long' })}
          </option>
        ))}
      </select>
    </div>
  );
}