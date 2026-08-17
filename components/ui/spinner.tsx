import { LoaderCircle } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * A spinning loader icon, sized to sit inside a button or beside a label.
 *
 * `aria-hidden` on purpose: it never carries the status by itself. Whatever it sits in owns
 * that — a button swaps its label and disables — so the spinner is the visual half of a
 * loading state, and announcing it too would say the same thing twice to a screen reader.
 */
function Spinner({ className, ...props }: React.ComponentProps<typeof LoaderCircle>) {
  return <LoaderCircle aria-hidden className={cn('size-4 animate-spin', className)} {...props} />;
}

export { Spinner };
