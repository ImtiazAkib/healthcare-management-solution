'use client';

import './globals.css';

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/*
  The root global-error boundary replaces the whole root layout when rendering it throws, so
  it runs outside every provider the app has. It therefore renders its own <html> and <body>
  and reaches for nothing but the stylesheet.
*/
export default function GlobalError({ reset }: GlobalErrorProps) {
  const handleRetryClick = (): void => {
    reset();
  };

  return (
    <html lang="en">
      <body className="bg-background text-foreground font-sans antialiased">
        <section className="flex min-h-dvh items-center justify-center px-4 text-center">
          <div className="flex flex-col items-center gap-6">
            <h2>Something went wrong</h2>

            <p className="text-medium-normal text-muted-foreground max-w-xl">An unexpected error occurred. Please try again.</p>

            <button
              type="button"
              onClick={handleRetryClick}
              className="bg-primary text-primary-foreground hover:bg-primary-hover cursor-pointer rounded-md px-5 py-2 text-sm font-medium">
              Try again
            </button>
          </div>
        </section>
      </body>
    </html>
  );
}
