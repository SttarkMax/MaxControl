
import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  icon?: React.ReactNode;
  error?: string;
  ['aria-label']?: string; // Explicitly allow aria-label
}

const Input: React.FC<InputProps> = ({ label, id, icon, error, className, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-300 mb-1">{label}</label>}
      <div className="relative rounded-md shadow-sm">
        {icon && <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">{icon}</div>}
        <input
          id={id}
          className={`
            ${props.type === 'checkbox' ? 
              'form-checkbox h-4 w-4 text-yellow-500 bg-gray-600 border-gray-500 rounded focus:ring-yellow-400' : 
              `form-input block w-full sm:text-sm rounded-md bg-gray-700 text-white placeholder-gray-400 ${icon ? 'pl-10' : 'pl-3'} pr-3 py-2 border`
            }
            ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : props.type !== 'checkbox' ? 'border-gray-600 focus:ring-yellow-500 focus:border-yellow-500' : 'border-gray-500'}
            ${className || ''}
          `}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
};

export default Input;
