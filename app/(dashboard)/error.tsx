'use client';

import { Button } from '@/components/ui';

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/*
  An error boundary has to be a client component. It says something went wrong and offers a
  retry, and nothing more — the `error` object may carry a message that names a table or a
  query, and none of that belongs in front of somebody looking at a hospital screen.
*/
export default function DashboardError({ reset }: DashboardErrorProps) {
  const handleRetryClick = (): void => {
    reset();
  };

  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-4">
      <h1>Something went wrong</h1>

      <p className="text-muted-foreground">
        An unexpected error occurred while loading this page. Try again, and if it keeps happening, tell an administrator.
      </p>

      <Button variant="default" onClick={handleRetryClick}>
        Try again
      </Button>
    </div>
  );
}
