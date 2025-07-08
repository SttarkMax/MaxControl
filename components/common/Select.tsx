import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string | number; label: string }[];
  placeholder?: string;
}

const Select: React.FC<SelectProps> = ({ label, id, error, options, className, placeholder, ...props }) => {
  return (
    <div className="w-full">
      {label && <label htmlFor={id} className="block text-sm font-medium text-gray-200 mb-1">{label}</label>}
      <select
        id={id}
        className={`
          form-select block w-full sm:text-sm rounded-md
          pl-3 pr-10 py-2 border bg-[#282828] text-white
          ${error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-[#282828] focus:ring-yellow-500 focus:border-yellow-500'}
          ${className || ''}
        `}
        {...props}
      >
        {placeholder && <option value="" disabled selected={!props.value} className="text-gray-400">{placeholder}</option>}
        {options.map(option => (
          <option key={option.value} value={option.value} className="bg-[#1d1d1d] text-white">{option.label}</option>
        ))}
      </select>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
};

export default Select;