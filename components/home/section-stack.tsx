import { SECTION_IDS, TECH_LABELS } from '@/constants';

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
          <TechCard label={TECH_LABELS.NEXTJS} role="App Router — server rendering and route handlers together" />
          <TechCard label={TECH_LABELS.REACT} role="Server Components by default; client only where state lives" />
          <TechCard label={TECH_LABELS.TYPESCRIPT} role="Strict. No implicit any, no unchecked casts into a DTO" />
          <TechCard label={TECH_LABELS.TAILWIND} role="Design tokens, and every class checked against them" />
          <TechCard label={TECH_LABELS.MONGODB} role="Document-shaped clinical records with real indexes" />
          <TechCard label={TECH_LABELS.MONGOOSE} role="Schemas, hooks and the hash that never leaves the model" />
        </div>
      </Container>
    </section>
  );
}
