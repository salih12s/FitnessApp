import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-md px-5 text-sm font-semibold tracking-[-0.01em] whitespace-nowrap transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[var(--ease-out)] outline-none focus-visible:ring-3 focus-visible:ring-ring active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        primary:
          'bg-primary text-primary-foreground shadow-[0_1px_2px_var(--shadow-tint)] hover:brightness-110 active:brightness-95',
        secondary:
          'border border-border-strong bg-surface text-foreground shadow-[0_1px_2px_var(--shadow-tint)] hover:bg-surface-elevated',
        ghost: 'text-foreground hover:bg-surface-strong',
        destructive:
          'bg-destructive text-white hover:brightness-110 active:brightness-95',
      },
      size: {
        default: 'h-12 px-5',
        lg: 'h-14 px-6 text-base',
        icon: 'size-12 p-0',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'default',
    },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

function Button({
  className,
  variant,
  size,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      type={type}
      {...props}
    />
  );
}

export { Button };
