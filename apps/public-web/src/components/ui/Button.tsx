import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { buttonClassName, type ButtonVariant } from './button-styles';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  children: ReactNode;
}

export function Button({ variant = 'primary', className = '', children, ...rest }: ButtonProps) {
  return (
    <button className={buttonClassName(variant, className)} {...rest}>
      {children}
    </button>
  );
}
