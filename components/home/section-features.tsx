import { FEATURES, SECTION_IDS } from '@/constants';

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
          {FEATURES.map(x => (
            <FeatureCard key={x.title} visual={x.visual} title={x.title} description={x.description} />
          ))}
        </div>
      </Container>
    </section>
  );
}
