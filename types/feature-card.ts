import type { FeatureVisual } from './feature-visual';

/** A module card on the landing page: how it looks, and what it says. */
export type FeatureCardModel = {
  visual: FeatureVisual;
  title: string;
  description: string;
};
