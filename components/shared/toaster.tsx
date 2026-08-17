'use client';

import { Toaster as SonnerToaster, type ToasterProps } from 'sonner';

/*
  The app's toaster: sonner restyled to the design tokens rather than its own loud
  `richColors` palette. The surface is painted from the popover tokens through sonner's
  `--normal-*` variables so it tracks light and dark with the rest of the app, and the status
  accents map to the semantic tokens. `theme="system"` follows the OS preference until the
  in-app theme toggle lands in step 21b. Rendered once, from the dashboard layout.
*/
function Toaster(props: ToasterProps) {
  return (
    <SonnerToaster
      theme="system"
      position="top-right"
      closeButton
      style={
        {
          '--normal-bg': 'var(--popover)',
          '--normal-text': 'var(--popover-foreground)',
          '--normal-border': 'var(--border)',
          '--success-text': 'var(--success)',
          '--error-text': 'var(--destructive)',
          '--warning-text': 'var(--warning)',
          '--info-text': 'var(--info)',
        } as React.CSSProperties
      }
      {...props}
    />
  );
}

export { Toaster };
