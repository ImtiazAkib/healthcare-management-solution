import { ArrowRight } from 'lucide-react';

import { cn, resolveRoleLabel, roleAccentClassName } from '@/lib/utils';

import { PageHeader } from '@/components/ui';

import type { SessionUser } from '@/types';

type RoleHomeProps = {
  sessionUser: SessionUser;
  /** What this area is for, in a sentence. */
  summary: string;
  /** The things this role will do here, each becoming a real screen in a later step. */
  capabilities: readonly string[];
};

/*
  Each role's landing screen inside the shell. It is deliberately not a dashboard of stat
  tiles — a wall of numbers with no data behind them is exactly the vanity surface the design
  brief warns against. It says who is signed in, what the area is for, and what is coming,
  which is all true today. The feature steps replace the capability list with the screens it
  names.
*/
export function RoleHome({ sessionUser, summary, capabilities }: RoleHomeProps) {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8">
      <PageHeader title={`Welcome, ${sessionUser.name}`} description={summary} />

      <div className="surface-card flex flex-col gap-4 p-6">
        <div className="flex flex-col gap-1">
          <span className={cn('tagline', roleAccentClassName(sessionUser.role))}>{resolveRoleLabel(sessionUser.role)}</span>
          <h2 className="text-section-title">What you can do here</h2>
        </div>

        <ul className="flex flex-col gap-2.5">
          {capabilities.map(capability => (
            <li key={capability} className="flex items-start gap-2.5 text-sm">
              <ArrowRight className={cn('mt-0.5 size-4 shrink-0', roleAccentClassName(sessionUser.role))} />
              <span className="text-foreground/90">{capability}</span>
            </li>
          ))}
        </ul>

        <p className="text-muted-foreground border-border border-t pt-4 text-sm">
          These screens arrive over the coming steps. The shell, the sign-in and the access rules that decide who reaches this area are already in
          place.
        </p>
      </div>
    </div>
  );
}
