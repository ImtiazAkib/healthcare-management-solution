import { ROADMAP_PHASES, SECTION_IDS } from '@/constants';

import { Container } from '@/components/shared';

import { RoadmapRow } from './roadmap-row';

export function SectionRoadmap() {
  return (
    <section id={SECTION_IDS.ROADMAP} className="section-py bg-surface-muted scroll-mt-16">
      <Container className="flex flex-col gap-10 lg:gap-12">
        <div className="flex max-w-3xl flex-col gap-3">
          <span className="tagline text-primary">Roadmap</span>
          <h2>Built in steps, each one shippable</h2>
          <p className="text-medium-normal text-muted-foreground text-pretty">
            The proposal&rsquo;s eight phases, mapped onto twenty-seven steps. Nothing starts until the step before it ends green.
          </p>
        </div>

        <ol className="flex flex-col gap-3">
          {ROADMAP_PHASES.map(x => (
            <RoadmapRow key={x.phase} phase={x.phase} title={x.title} description={x.description} weeks={x.weeks} />
          ))}
        </ol>
      </Container>
    </section>
  );
}
