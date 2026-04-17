import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'tertiary';
  className?: string;
}

const Button: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  className = '', 
  ...props 
}) => {
  const baseStyles = 'px-6 py-2 rounded-md font-medium transition-all duration-300 cursor-pointer active:scale-95';
  
  const variants = {
    primary: 'bg-linear-to-l from-[var(--color-primary-container)] to-[var(--color-primary)] via-[var(--color-primary)] text-[var(--color-card-bg)] hover:opacity-90',
    secondary: 'bg-[var(--color-secondary)] text-[var(--color-card-bg)] hover:opacity-90',
    tertiary: 'bg-[var(--color-card-bg)] text-[var(--color-secondary)]'
  };

  const combinedClasses = `${baseStyles} ${variants[variant]} ${className}`.trim();

  return (
    <button className={combinedClasses} {...props}>
      {children}
    </button>
  );
};

export default Button;
