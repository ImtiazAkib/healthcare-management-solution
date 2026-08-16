import { MAIN_CONTENT_ID } from '@/constants/a11y.const';

type SkipToContentProps = {
  label?: string;
};

/**
 * The first thing in the tab order, and off-screen until it has focus.
 *
 * A dashboard screen will soon put a dozen links and buttons between the top of the page
 * and the content — the brand link, the nav entries, the account menu, and then the nav
 * entries again in the mobile bar. Somebody navigating by keyboard would walk all of them
 * on every page load, and WCAG 2.4.1 has no other mechanism that would satisfy it here.
 *
 * **Parked above the viewport rather than hidden with `sr-only`.** The usual idiom is
 * `sr-only focus:not-sr-only`, which does work. It is avoided because of how it fails:
 * `sr-only` sets five declarations and `not-sr-only` has to win every one of them back, so
 * a single conflicting utility leaves the link clipped while focused — precisely the state
 * it exists to escape, and invisible to anybody not tabbing through the page. Here one
 * property does the work, and the link is an ordinary visible element that sits out of
 * frame.
 *
 * A plain anchor rather than a `Link`: the target is a fragment on the page already open,
 * so there is no navigation to make.
 */
export function SkipToContent({ label = 'Skip to content' }: SkipToContentProps) {
  return (
    <a
      href={`#${MAIN_CONTENT_ID}`}
      className="bg-background text-foreground focus-visible:ring-ring absolute -top-16 left-3 z-50 rounded-md px-4 py-2 text-sm font-medium shadow-lg transition-[top] focus:top-3 focus-visible:ring-2">
      {label}
    </a>
  );
}
