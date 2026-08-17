import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { ChevronRight } from 'lucide-react';

import { cn } from '@/lib/utils';

/*
  Plain semantic markup — a labelled `nav` over an `ol` — for the shell's topbar location
  trail. No Base UI needed; the only moving part is BreadcrumbLink, which uses `useRender` so
  the caller can hand it a `Link` without this primitive importing the router. The `nav` takes
  its `aria-label` from the caller.
*/
function Breadcrumb({ className, ...props }: React.ComponentProps<'nav'>) {
  return <nav data-slot="breadcrumb" className={className} {...props} />;
}

function BreadcrumbList({ className, ...props }: React.ComponentProps<'ol'>) {
  return <ol data-slot="breadcrumb-list" className={cn('text-muted-foreground flex flex-wrap items-center gap-1.5 text-sm', className)} {...props} />;
}

function BreadcrumbItem({ className, ...props }: React.ComponentProps<'li'>) {
  return <li data-slot="breadcrumb-item" className={cn('inline-flex items-center gap-1.5', className)} {...props} />;
}

function BreadcrumbLink({ className, render, ...props }: useRender.ComponentProps<'a'>) {
  return useRender({
    defaultTagName: 'a',
    props: mergeProps<'a'>({ className: cn('hover:text-foreground transition-colors', className) }, props),
    render,
  });
}

function BreadcrumbPage({ className, ...props }: React.ComponentProps<'span'>) {
  return (
    <span
      data-slot="breadcrumb-page"
      role="link"
      aria-disabled="true"
      aria-current="page"
      className={cn('text-foreground font-medium', className)}
      {...props}
    />
  );
}

function BreadcrumbSeparator({ className, children, ...props }: React.ComponentProps<'li'>) {
  return (
    <li data-slot="breadcrumb-separator" role="presentation" aria-hidden className={cn('[&>svg]:size-3.5', className)} {...props}>
      {children ?? <ChevronRight />}
    </li>
  );
}

export { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator };
