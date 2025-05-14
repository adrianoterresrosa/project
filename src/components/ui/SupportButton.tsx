import React from 'react';
import { MessageCircle } from 'lucide-react';

export function SupportButton() {
  return (
    <a
      href="https://wa.link/gwtsmh"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
    >
      <MessageCircle className="w-4 h-4 mr-2" />
      Suporte
    </a>
  );
}