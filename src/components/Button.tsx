import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'white' | 'danger';
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function Button({ 
  children, 
  variant = 'primary', 
  size = 'md',
  className = '',
  ...props
}: ButtonProps) {
  const baseStyles = 'inline-flex items-center justify-center font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const sizeStyles = {
    sm: 'px-3 py-1.5 text-sm rounded-lg',
    md: 'px-4 py-2 rounded-lg',
    lg: 'px-6 py-3 rounded-lg'
  };
  
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:hover:bg-indigo-600',
    secondary: 'text-gray-700 hover:text-indigo-600 disabled:hover:text-gray-700',
    white: 'bg-white text-indigo-600 hover:bg-gray-100 disabled:hover:bg-white',
    danger: 'bg-red-600 text-white hover:bg-red-700 disabled:hover:bg-red-600'
  };

  return (
    <button 
      className={`${baseStyles} ${sizeStyles[size]} ${variants[variant]} ${className}`}
      type={props.type || 'button'}
      {...props}
    >
      {children}
    </button>
  );
}