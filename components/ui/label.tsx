import { cn } from '@/lib/utils';

function Label({ className, ...props }: React.ComponentProps<'label'>) {
  return <label data-slot="label" className={cn('text-foreground text-sm font-medium select-none', className)} {...props} />;
}

export { Label };
