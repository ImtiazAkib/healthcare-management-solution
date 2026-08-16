import { SectionFeatures, SectionHero, SectionRoadmap, SectionRoles, SectionStack } from '@/components/home';

export default function Page() {
  return (
    <>
      <SectionHero />
      <SectionRoles />
      <SectionFeatures />
      <SectionStack />
      <SectionRoadmap />
    </>
  );
}
