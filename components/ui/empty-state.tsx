import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

type EmptyStateProps = {
  icon?: LucideIcon;
  title: string;
  description?: string;
  /** Optional primary action (a Button), rendered under the copy. */
  action?: React.ReactNode;
  className?: string;
};

/*
  The shared empty state: a dashed 1px border, a single muted icon, a title and an optional
  description, with a slot for the next step so a first-run empty can offer it in place.

  **An empty is not a failure.** This is what a screen shows when there is genuinely nothing
  yet — "no appointments today". A screen whose query *failed* shows a `role="alert"` banner
  and returns before it reaches here, so an unreachable database never reads as "all clear".
*/
function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('border-border flex flex-col items-center gap-2 rounded-lg border border-dashed px-6 py-14 text-center', className)}>
      {Icon && <Icon className="text-muted-foreground size-7" aria-hidden />}

      <p className="text-card-title">{title}</p>

      {description && <p className="text-muted-foreground max-w-sm text-sm">{description}</p>}

      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export { EmptyState };
