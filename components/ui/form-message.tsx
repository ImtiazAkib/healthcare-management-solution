import type { ComponentProps } from 'react';

import { cn } from '@/lib/utils';

/**
 * The single field-level validation treatment: it connects itself to assistive technology
 * and keeps every form error on the same compact, readable footing.
 */
export function FormMessage({ className, ...props }: ComponentProps<'p'>) {
  return <p role="alert" className={cn('text-destructive text-sm', className)} {...props} />;
}
