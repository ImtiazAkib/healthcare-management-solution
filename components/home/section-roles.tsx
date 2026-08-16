import { ROLES, SECTION_IDS } from '@/constants';

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
          {ROLES.map(x => (
            <RoleCard key={x.title} visual={x.visual} title={x.title} summary={x.summary} capabilities={x.capabilities} />
          ))}
        </div>
      </Container>
    </section>
  );
}
