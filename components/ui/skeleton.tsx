import { cn } from '@/lib/utils';

/**
 * A muted block that pulses while the real thing is on its way.
 *
 * A primitive rather than a repeated div, so each route can describe its own shape — a table
 * skeleton has the table's columns, a detail skeleton has the detail's rows. A skeleton that
 * does not match what arrives is a layout shift with extra steps.
 */
function Skeleton({ className, ...props }: React.ComponentProps<'div'>) {
  return <div data-slot="skeleton" className={cn('bg-muted animate-pulse rounded-md', className)} {...props} />;
}

export { Skeleton };
