
import React from 'react';
import { LoadingSpinner } from './LoadingSpinner'; // Added import

interface TabsProps {
  children: React.ReactNode;
}

export const Tabs: React.FC<TabsProps> = ({ children }) => {
  return (
    <div className="flex border-b border-slate-700">
      {children}
    </div>
  );
};

interface TabProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
  isLoading?: boolean;
}

export const Tab: React.FC<TabProps> = ({ label, isActive, onClick, isLoading }) => {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      className={`px-4 py-3 text-sm font-medium focus:outline-none transition-colors duration-150 flex items-center
        ${
          isActive
            ? 'border-b-2 border-sky-500 text-sky-400'
            : 'text-slate-400 hover:text-sky-300 border-b-2 border-transparent'
        }
        ${isLoading ? 'cursor-wait opacity-70' : ''}
      `}
    >
      {label}
      {isLoading && <LoadingSpinner size="xs" color="text-sky-400" className="ml-2" />}
    </button>
  );
};
