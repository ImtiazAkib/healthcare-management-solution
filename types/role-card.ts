import type { RoleVisual } from './role-visual';

/** A role card on the landing page: how it looks, and what it says. */
export type RoleCardModel = {
  visual: RoleVisual;
  title: string;
  summary: string;
  capabilities: readonly string[];
};
