import { SECTION_IDS, TECH_STACK } from '@/constants';

import { Container } from '@/components/shared';

import { TechCard } from './tech-card';

export function SectionStack() {
  return (
    <section id={SECTION_IDS.STACK} className="section-py scroll-mt-16">
      <Container className="flex flex-col gap-10 lg:gap-12">
        <div className="flex max-w-3xl flex-col gap-3">
          <span className="tagline text-primary">Stack</span>
          <h2>Chosen for what it removes</h2>
          <p className="text-medium-normal text-muted-foreground text-pretty">
            Server rendering and the API layer in one codebase, a strict compiler, and a session signed in-house rather than a library standing
            between the app and its own cookie.
          </p>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {TECH_STACK.map(x => (
            <TechCard key={x.label} label={x.label} role={x.role} />
          ))}
        </div>
      </Container>
    </section>
  );
}
