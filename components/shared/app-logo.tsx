import { APP_DATA } from '@/constants';

import { cn } from '@/lib/utils';

type AppLogoProps = { className?: string; label?: string };

/**
 * The brand mark — a rounded square carrying a pulse trace crossed by a care cross.
 *
 * Drawn inline rather than shipped as a file. It is two paths, so a raster asset would cost
 * a network request and a second set of dimensions to keep in sync, and an `<img>` cannot
 * follow the theme. Here the plate takes `--primary` and the trace takes
 * `--primary-foreground`, so the mark is correct in both schemes with no dark variant.
 *
 * @param label - Accessible name. The mark is decorative wherever a text brand name sits
 *   beside it, in which case the caller passes nothing and the default applies.
 */
export function AppLogo({ className, label = APP_DATA.LOGO.IMAGE_ALT }: AppLogoProps) {
  return (
    <svg viewBox="0 0 48 48" role="img" aria-label={label} className={cn('size-10 shrink-0', className)}>
      <rect width="48" height="48" rx="12" className="fill-primary" />
      <path
        d="M9 25.5h6.4l3.1-7.2 4.6 12.4 3.4-8.1 2.3 2.9H39"
        fill="none"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="stroke-primary-foreground"
      />
      <path d="M33 9.5v6M30 12.5h6" fill="none" strokeWidth="2.5" strokeLinecap="round" className="stroke-primary-foreground/70" />
    </svg>
  );
}
