import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';

import { ServiceCreateForm } from '@/components/admin/services';
import { PageHeader } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Add a service',
  robots: { index: false, follow: false },
};

export default async function AdminServicesNewPage() {
  // A doctor, nurse, lab or patient who reaches this URL is sent to /unauthorized, not sign-in.
  await requireAdminArea();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_SERVICES.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to the catalogue
      </Link>

      <PageHeader
        title="Add a service"
        description="Add a service to the catalogue — a consultation, lab test, procedure, bed charge or pharmacy item — with the code and price billing draws on."
      />

      <ServiceCreateForm />
    </div>
  );
}
