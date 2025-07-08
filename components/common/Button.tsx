import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'warning' | 'outline';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  size = 'md', 
  isLoading = false, 
  iconLeft, 
  iconRight, 
  className, 
  disabled,
  ...props 
}) => {
  const baseStyles = "font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-black transition ease-in-out duration-150 flex items-center justify-center";

  const variantStyles = {
    primary: "bg-yellow-500 hover:bg-yellow-600 text-black focus:ring-yellow-400",
    secondary: "bg-[#282828] hover:bg-[#3a3a3a] text-white focus:ring-yellow-400 border border-[#282828]",
    danger: "bg-red-600 hover:bg-red-700 text-white focus:ring-red-500",
    success: "bg-green-600 hover:bg-green-700 text-white focus:ring-green-500",
    warning: "bg-yellow-500 hover:bg-yellow-600 text-black focus:ring-yellow-400", // Using theme's yellow
    outline: "bg-transparent hover:bg-yellow-500 text-yellow-500 hover:text-black border border-yellow-500 focus:ring-yellow-400",
  };

  const sizeStyles = {
    xs: "px-2.5 py-1.5 text-xs",
    sm: "px-3 py-2 text-sm leading-4",
    md: "px-4 py-2 text-sm",
    lg: "px-6 py-3 text-base",
  };
  
  const disabledStyles = "opacity-50 cursor-not-allowed";

  return (
    <button
      className={`
        ${baseStyles} 
        ${variantStyles[variant]} 
        ${sizeStyles[size]}
        ${(disabled || isLoading) ? disabledStyles : ''}
        ${className || ''}
      `}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <svg className={`animate-spin h-5 w-5 ${iconLeft || children ? 'mr-3' : ''} ${iconRight ? 'ml-3' : ''}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      {iconLeft && !isLoading && <span className="mr-2">{iconLeft}</span>}
      {children}
      {iconRight && !isLoading && <span className="ml-2">{iconRight}</span>}
    </button>
  );
};

export default Button;