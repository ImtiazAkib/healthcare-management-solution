import { SECTION_IDS } from '@/constants';

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
          <RoadmapRow phase="Phase 1" title="Requirement analysis" description="The proposal turned into a step-by-step plan" weeks="Week 1" />
          <RoadmapRow phase="Phase 2" title="System design" description="Toolchain, design system, data model and the SEO surface" weeks="Week 2" />
          <RoadmapRow
            phase="Phase 3"
            title="Backend"
            description="Authentication, accounts, availability, appointments and the queue"
            weeks="Week 3–4"
          />
          <RoadmapRow
            phase="Phase 4"
            title="Frontend"
            description="Role dashboards, encounters, prescriptions, diagnostics and the portal"
            weeks="Week 5–6"
          />
          <RoadmapRow
            phase="Phase 5"
            title="Integration"
            description="Registration, profiles, notices, reminders, billing and analytics"
            weeks="Week 7"
          />
          <RoadmapRow
            phase="Phase 6"
            title="Testing"
            description="Rate limits, the access trail, the polish pass and the smoke path"
            weeks="Week 8"
          />
          <RoadmapRow phase="Phase 7" title="Deployment" description="A clean clone reaching a running production build" weeks="Week 9" />
          <RoadmapRow phase="Phase 8" title="Documentation" description="README, the visual walkthrough and the final report" weeks="Week 10" />
        </ol>
      </Container>
    </section>
  );
}
