'use client';

import { Fragment } from 'react';

import { usePathname } from 'next/navigation';

import { resolveBreadcrumbTrail, resolveNavModel } from '@/lib/utils';

import { Breadcrumb, BreadcrumbItem, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui';

import type { UserRole } from '@/types';

type DashboardBreadcrumbProps = {
  role: UserRole;
  overviewLabel: string;
  ariaLabel: string;
};

/*
  The topbar location trail — it says where the visitor is rather than greeting them. Client
  only for the pathname; the trail comes from the same nav model the sidebar renders, so the
  crumb and the highlighted sidebar entry always agree. The section is a plain label (it has
  no page of its own); only the current page is a `BreadcrumbPage`, carrying `aria-current`.
*/
export function DashboardBreadcrumb({ role, overviewLabel, ariaLabel }: DashboardBreadcrumbProps) {
  const pathname = usePathname();
  const sections = resolveNavModel(role);
  const trail = resolveBreadcrumbTrail(pathname, sections, overviewLabel);

  return (
    <Breadcrumb aria-label={ariaLabel} className="min-w-0">
      <BreadcrumbList className="flex-nowrap">
        {trail.map((crumb, index) => (
          <Fragment key={index}>
            <BreadcrumbItem className="min-w-0">
              {crumb.current ? <BreadcrumbPage className="truncate">{crumb.label}</BreadcrumbPage> : <span className="truncate">{crumb.label}</span>}
            </BreadcrumbItem>

            {index < trail.length - 1 && <BreadcrumbSeparator />}
          </Fragment>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
