import { mergeProps } from '@base-ui/react/merge-props';
import { useRender } from '@base-ui/react/use-render';
import { cva, type VariantProps } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'group/badge inline-flex h-5 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border border-transparent px-2 py-0.5 text-xs font-medium whitespace-nowrap transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-1.5 has-data-[icon=inline-start]:pl-1.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!',
  {
    variants: {
      /*
        Muted status chips: success / warning / info / neutral join destructive on the same
        tinted-background, coloured-text footing, so a status reads as a calm chip rather than
        a loud solid pill. The status tokens were tuned to clear 4.5:1 as text on their /10
        tint — see the measured comments in globals.css.
      */
      variant: {
        default: 'bg-primary text-primary-foreground [a]:hover:bg-primary-hover',
        secondary: 'bg-secondary text-secondary-foreground [a]:hover:bg-secondary/80',
        destructive:
          'bg-destructive/10 text-destructive focus-visible:ring-destructive/20 dark:bg-destructive/20 dark:focus-visible:ring-destructive/40 [a]:hover:bg-destructive/20',
        success: 'bg-success/10 text-success [a]:hover:bg-success/20',
        warning: 'bg-warning/10 text-warning [a]:hover:bg-warning/20',
        info: 'bg-info/10 text-info [a]:hover:bg-info/20',
        neutral: 'bg-muted text-muted-foreground [a]:hover:bg-muted/80',
        outline: 'border-border text-foreground [a]:hover:bg-muted [a]:hover:text-muted-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

function Badge({ className, variant = 'default', render, ...props }: useRender.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: 'span',
    props: mergeProps<'span'>({ className: cn(badgeVariants({ variant }), className) }, props),
    render,
    state: { slot: 'badge', variant },
  });
}

export { Badge, badgeVariants };
