import { cn } from '@/lib/utils';

type PageHeaderProps = {
  title: string;
  description?: string;
  /** The screen's primary action (and any quiet secondaries), right-aligned on wider screens. */
  actions?: React.ReactNode;
  className?: string;
};

/*
  The one page-header shape: title, an optional one-line description, and an optional actions
  slot. Every list and detail screen adopts it rather than hand-rolling its own header row,
  which is how a description size or a title weight drifts across pages. The title is a plain
  `h1`, so it inherits the calm 600-weight page-title scale; the description is fixed at 14px
  muted.
*/
function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div className={cn('flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4', className)}>
      <div className="flex min-w-0 flex-col gap-1">
        <h1>{title}</h1>

        {description && <p className="text-muted-foreground text-sm text-pretty">{description}</p>}
      </div>

      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { PageHeader };
