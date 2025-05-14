import React from 'react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../../../hooks/useTheme';

export function ThemeSelector() {
  const { currentTheme, changeTheme } = useTheme();

  return (
    <div className="grid grid-cols-2 gap-4">
      <button
        onClick={() => changeTheme('light')}
        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
          currentTheme.id === 'light'
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <div className="flex flex-col items-center space-y-2">
          <span className={currentTheme.id === 'light' ? 'text-blue-600' : 'text-gray-600'}>
            <Sun className="h-5 w-5" />
          </span>
          <span className={`text-sm font-medium ${
            currentTheme.id === 'light' ? 'text-blue-600' : 'text-gray-600'
          }`}>
            Claro
          </span>
        </div>
      </button>

      <button
        onClick={() => changeTheme('dark')}
        className={`p-4 rounded-lg border-2 transition-all duration-200 ${
          currentTheme.id === 'dark'
            ? 'border-blue-600 bg-blue-50'
            : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <div className="flex flex-col items-center space-y-2">
          <span className={currentTheme.id === 'dark' ? 'text-blue-600' : 'text-gray-600'}>
            <Moon className="h-5 w-5" />
          </span>
          <span className={`text-sm font-medium ${
            currentTheme.id === 'dark' ? 'text-blue-600' : 'text-gray-600'
          }`}>
            Escuro
          </span>
        </div>
      </button>
    </div>
  );
}