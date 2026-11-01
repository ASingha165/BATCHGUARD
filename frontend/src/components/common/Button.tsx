import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'critical' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  icon,
  isLoading = false,
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center justify-center font-label-md text-label-md font-medium transition-all rounded-lg select-none disabled:opacity-50 disabled:pointer-events-none active:scale-[0.98]';

  const sizeStyles = {
    sm: 'h-8 px-2.5 text-xs gap-1',
    md: 'h-[38px] px-space-md gap-space-xs',
    lg: 'h-11 px-6 text-base gap-2',
  }[size];

  const variantStyles = {
    primary: 'bg-primary-container text-on-primary hover:bg-[#166534] shadow-sm',
    critical: 'bg-error text-on-error hover:bg-[#b91c1c] shadow-md',
    secondary: 'bg-surface-container-lowest border border-surface-container text-on-surface hover:bg-surface-container-low shadow-sm',
    ghost: 'bg-transparent text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  }[variant];

  return (
    <button
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
      ) : icon ? (
        <span className="material-symbols-outlined text-[18px]">{icon}</span>
      ) : null}
      <span>{children}</span>
    </button>
  );
};

