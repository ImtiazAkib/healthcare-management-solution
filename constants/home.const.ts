import {
  Activity,
  CalendarClock,
  ClipboardPlus,
  FlaskConical,
  HeartPulse,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  Stethoscope,
  UserRound,
} from 'lucide-react';

import { FeatureVisual, RoleVisual } from '@/types';

/*
  Structural data only — icons and accent classes. The copy each card renders is a literal
  in the component that renders it, next to the markup that gives it context.
*/

export const ROLE_VISUALS = {
  ADMIN: {
    icon: ShieldCheck,
    accentClassName: 'text-accent-violet',
    surfaceClassName: 'bg-accent-violet/10',
  },
  DOCTOR: {
    icon: Stethoscope,
    accentClassName: 'text-accent-blue',
    surfaceClassName: 'bg-accent-blue/10',
  },
  NURSE: {
    icon: HeartPulse,
    accentClassName: 'text-accent-teal',
    surfaceClassName: 'bg-accent-teal/10',
  },
  LAB: {
    icon: FlaskConical,
    accentClassName: 'text-accent-amber',
    surfaceClassName: 'bg-accent-amber/10',
  },
  PATIENT: {
    icon: UserRound,
    accentClassName: 'text-accent-rose',
    surfaceClassName: 'bg-accent-rose/10',
  },
} as const satisfies Record<string, RoleVisual>;

export const FEATURE_VISUALS = {
  RECORDS: { icon: ClipboardPlus, accentClassName: 'text-primary', surfaceClassName: 'bg-primary/10' },
  APPOINTMENTS: { icon: CalendarClock, accentClassName: 'text-accent-blue', surfaceClassName: 'bg-accent-blue/10' },
  QUEUE: { icon: Activity, accentClassName: 'text-accent-teal', surfaceClassName: 'bg-accent-teal/10' },
  DIAGNOSTICS: { icon: FlaskConical, accentClassName: 'text-accent-amber', surfaceClassName: 'bg-accent-amber/10' },
  BILLING: { icon: Receipt, accentClassName: 'text-accent-rose', surfaceClassName: 'bg-accent-rose/10' },
  DASHBOARDS: { icon: LayoutDashboard, accentClassName: 'text-accent-violet', surfaceClassName: 'bg-accent-violet/10' },
} as const satisfies Record<string, FeatureVisual>;

/** Product names. Proper nouns, so they stay out of the dictionary. */
export const TECH_LABELS = {
  NEXTJS: 'Next.js 16',
  REACT: 'React 19',
  TYPESCRIPT: 'TypeScript',
  TAILWIND: 'Tailwind CSS v4',
  MONGODB: 'MongoDB',
  MONGOOSE: 'Mongoose',
} as const;
