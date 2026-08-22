import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { ROUTES } from '@/constants/routes.const';

import { requireAdminArea } from '@/lib/auth';
import { DoctorService } from '@/lib/services';

import { SlotCreateForm } from '@/components/availability';
import { PageHeader } from '@/components/ui';

const doctorService = new DoctorService();

export const metadata: Metadata = {
  title: 'Publish availability',
  robots: { index: false, follow: false },
};

export default async function AdminAvailabilityNewPage() {
  await requireAdminArea();

  const doctorOptions = await doctorService.listForSelection();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_AVAILABILITY.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to availability
      </Link>

      <PageHeader
        title="Publish availability"
        description="Set a doctor's sitting hours for a weekday, the room, and how long each patient gets. A block that clashes with the doctor or the room is refused."
      />

      <SlotCreateForm doctorOptions={doctorOptions.result} />
    </div>
  );
}
