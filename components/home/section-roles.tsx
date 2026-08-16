import { ROLE_VISUALS, SECTION_IDS } from '@/constants';

import { Container } from '@/components/shared';

import { RoleCard } from './role-card';

export function SectionRoles() {
  return (
    <section id={SECTION_IDS.ROLES} className="section-py scroll-mt-16">
      <Container className="flex flex-col gap-10 lg:gap-12">
        <div className="flex max-w-3xl flex-col gap-3">
          <span className="tagline text-primary">Roles</span>
          <h2>Five people, five dashboards, one record</h2>
          <p className="text-medium-normal text-muted-foreground text-pretty">
            Every route and every action is gated by role, and clinical access is decided by the relationship to the patient rather than by the job
            title alone.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <RoleCard
            visual={ROLE_VISUALS.ADMIN}
            title="Administrator"
            summary="Runs the hospital's record of itself — people, departments, prices and the audit trail."
            capabilities={[
              'Create and approve staff accounts',
              'Manage departments and the service catalogue',
              'Raise invoices and record payments',
              'Read the analytics and the access trail',
            ]}
          />

          <RoleCard
            visual={ROLE_VISUALS.DOCTOR}
            title="Doctor"
            summary="Sees the history before the consultation starts, and writes what happened during it."
            capabilities={[
              'Open the day’s queue and consult',
              'Read a patient’s full timeline',
              'Write diagnoses and treatment notes',
              'Issue prescriptions and order tests',
            ]}
          />

          <RoleCard
            visual={ROLE_VISUALS.NURSE}
            title="Nurse"
            summary="Owns the first five minutes — check-in, vitals and the triage priority that reorders the queue."
            capabilities={[
              'Check patients in and assign tokens',
              'Record vitals with range checking',
              'Set triage priority',
              'Never writes a diagnosis',
            ]}
          />

          <RoleCard
            visual={ROLE_VISUALS.LAB}
            title="Diagnostic lab"
            summary="Takes the order, does the work, and releases the result once it has been verified."
            capabilities={['Work the incoming order list', 'Upload reports as PDF or image', 'Verify before release', 'Bill diagnostic services']}
          />

          <RoleCard
            visual={ROLE_VISUALS.PATIENT}
            title="Patient"
            summary="Their own record, and nothing else — resolved from the session, never from a URL."
            capabilities={[
              'Book, reschedule and cancel appointments',
              'Read prescriptions and released reports',
              'Follow their own visit history',
              'See invoices and what is still owed',
            ]}
          />
        </div>
      </Container>
    </section>
  );
}
