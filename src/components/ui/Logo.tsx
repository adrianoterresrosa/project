import React from 'react';

interface LogoProps {
  className?: string;
  size?: 'small' | 'medium' | 'large';
}

export function Logo({ className = '', size = 'medium' }: LogoProps) {
  const sizes = {
    small: 'h-8',  // Aumentado de h-6 para h-8
    medium: 'h-10', // Aumentado de h-8 para h-10
    large: 'h-12'  // Aumentado de h-10 para h-12
  };

  return (
    <div className={`flex items-center ${className}`}>
      <img 
        src="https://lupatimes.com/wp-content/uploads/2025/01/Logo_FinaFlow.png" 
        alt="FinaFlow Logo" 
        className={`${sizes[size]} w-auto object-contain`}
      />
    </div>
  );
}