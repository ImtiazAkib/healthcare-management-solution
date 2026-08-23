import type { Metadata } from 'next';

import Link from 'next/link';

import { ArrowLeft } from 'lucide-react';

import { ROUTES, SERVICE_STATUS_FILTERS } from '@/constants';

import { requireAdminArea } from '@/lib/auth';
import { PatientFiltersSchema, ServiceItemFiltersSchema } from '@/lib/schemas';
import { PatientService, ServiceItemService } from '@/lib/services';

import { InvoiceCreateForm } from '@/components/billing';
import type { PatientOption, ServiceItemOption } from '@/components/billing';
import { PageHeader } from '@/components/ui';

const serviceItemService = new ServiceItemService();
const patientService = new PatientService();

export const metadata: Metadata = {
  title: 'Raise an invoice',
  robots: { index: false, follow: false },
};

export default async function AdminInvoiceNewPage() {
  await requireAdminArea();

  /*
    The two pickers the form needs: the active catalogue to bill from, and the registry to bill. Both
    are read here on the server and passed down slim — the form never re-fetches, and the service
    prices the lines itself when the bill is raised, so the prices carried here only feed the preview.
  */
  const [servicesResult, patientsResult] = await Promise.all([
    serviceItemService.list(ServiceItemFiltersSchema.parse({ status: SERVICE_STATUS_FILTERS.ACTIVE })),
    patientService.list(PatientFiltersSchema.parse({})),
  ]);

  if (!servicesResult.success || !patientsResult.success) {
    throw new Error('Could not load the billing form. Please try again.');
  }

  const services: ServiceItemOption[] = servicesResult.result.map(service => ({
    serviceItemId: service.serviceItemId,
    code: service.code,
    name: service.name,
    category: service.category,
    priceMinorUnits: service.priceMinorUnits,
  }));

  const patients: PatientOption[] = patientsResult.result.map(patient => ({
    patientId: patient.patientId,
    name: patient.name,
    medicalRecordNo: patient.medicalRecordNo,
  }));

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <Link
        href={ROUTES.ADMIN_INVOICES.HREF}
        className="text-muted-foreground hover:text-foreground flex w-fit items-center gap-1.5 text-sm transition-colors">
        <ArrowLeft className="size-4" />
        Back to invoices
      </Link>

      <PageHeader
        title="Raise an invoice"
        description="Pick the patient, add the services and quantities, and set any discount or tax. The bill is priced and totalled when you raise it."
      />

      <InvoiceCreateForm patients={patients} services={services} />
    </div>
  );
}
