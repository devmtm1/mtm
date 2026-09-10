import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { buttonClassName, type ButtonVariant } from './button-styles';

interface LinkButtonProps extends LinkProps {
  variant?: ButtonVariant;
  className?: string;
  children: ReactNode;
}

export function LinkButton({ variant = 'primary', className = '', children, ...rest }: LinkButtonProps) {
  return (
    <Link className={buttonClassName(variant, className)} {...rest}>
      {children}
    </Link>
  );
}
