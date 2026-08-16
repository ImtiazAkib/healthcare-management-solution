import { FEATURE_VISUALS, SECTION_IDS } from '@/constants';

import { Container } from '@/components/shared';

import { FeatureCard } from './feature-card';

export function SectionFeatures() {
  return (
    <section id={SECTION_IDS.FEATURES} className="section-py bg-surface-muted scroll-mt-16">
      <Container className="flex flex-col gap-10 lg:gap-12">
        <div className="flex max-w-3xl flex-col gap-3">
          <span className="tagline text-primary">Modules</span>
          <h2>What the platform covers</h2>
          <p className="text-medium-normal text-muted-foreground text-pretty">
            Each module is built as its own step, ends with a working app, and hands the next one a spine it does not have to invent.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <FeatureCard
            visual={FEATURE_VISUALS.RECORDS}
            title="Electronic medical records"
            description="Encounters, vitals, diagnoses and treatment notes on one timeline. Append-mostly: a correction after the visit is a dated addendum, not an overwrite."
          />

          <FeatureCard
            visual={FEATURE_VISUALS.APPOINTMENTS}
            title="Appointments"
            description="Booking against real doctor availability, with the slot re-checked at write time and double-booking refused by the database rather than by the screen."
          />

          <FeatureCard
            visual={FEATURE_VISUALS.QUEUE}
            title="Queue management"
            description="Token numbers assigned at check-in, triage priority that reorders the line, and a queue derived from the appointments rather than stored beside them."
          />

          <FeatureCard
            visual={FEATURE_VISUALS.DIAGNOSTICS}
            title="Diagnostics"
            description="Lab orders through to verified reports. Files are type-checked by magic number, stored outside the public tree, and served only to whoever may read them."
          />

          <FeatureCard
            visual={FEATURE_VISUALS.BILLING}
            title="Billing and payments"
            description="Invoices priced from the service catalogue, in integer minor units, with lines that snapshot what they cost on the day the bill was issued."
          />

          <FeatureCard
            visual={FEATURE_VISUALS.DASHBOARDS}
            title="Notifications and analytics"
            description="Reminders that survive a missed run, alerts that never carry a clinical detail, and figures aggregated in the database with a period attached to every one."
          />
        </div>
      </Container>
    </section>
  );
}
