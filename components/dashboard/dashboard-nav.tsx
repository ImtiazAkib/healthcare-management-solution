'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { cn, isNavItemActive, resolveNavModel } from '@/lib/utils';
import type { NavItem } from '@/lib/utils';

import type { UserRole } from '@/types';

type DashboardNavProps = {
  role: UserRole;
  ariaLabel: string;
  /**
   * `sidebar` stacks the entries under their section headers; `bar` flattens them into one
   * row. One model, rendered two ways, so the placements cannot list different things.
   */
  variant?: 'sidebar' | 'bar';
  className?: string;
};

/*
  A client component only so the active entry can be read from the real pathname — hard-coding
  it would start lying the moment a second entry landed under it. Which entries appear, and in
  what section, is `resolveNavModel`'s job, so this file holds only rendering and the
  active-state read.
*/
export function DashboardNav({ role, ariaLabel, variant = 'sidebar', className }: DashboardNavProps) {
  const pathname = usePathname();
  const sections = resolveNavModel(role);

  if (variant === 'bar') {
    return (
      <nav aria-label={ariaLabel} className={cn('flex gap-1', className)}>
        {sections.flatMap(section =>
          section.items.map(item => <NavLink key={item.href} item={item} active={isNavItemActive(pathname, item.href, section.id === 'overview')} />)
        )}
      </nav>
    );
  }

  return (
    <nav aria-label={ariaLabel} className={cn('flex flex-col gap-5', className)}>
      {sections.map(section => (
        <div key={section.id} className="flex flex-col gap-1">
          {section.label && <p className="text-muted-foreground px-3 pb-1 text-xs font-medium tracking-wider uppercase">{section.label}</p>}

          {section.items.map(item => (
            <NavLink key={item.href} item={item} active={isNavItemActive(pathname, item.href, section.id === 'overview')} />
          ))}
        </div>
      ))}
    </nav>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex shrink-0 items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium whitespace-nowrap transition-colors',
        active
          ? 'bg-sidebar-accent text-sidebar-accent-foreground'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground'
      )}>
      <Icon className="size-4 shrink-0" />
      {item.label}
    </Link>
  );
}
