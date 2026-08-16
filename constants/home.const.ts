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

import { FeatureCardModel, RoadmapPhaseModel, RoleCardModel, TechCardModel } from '@/types';

/*
  The landing page's list content, and the icons that go with it.

  Copy normally lives as a literal in the component that renders it — that is this project's
  rule and it holds everywhere else. These four lists are the exception, and for one
  concrete reason: `/llms.txt` and `/llms-full.txt` restate them, so the strings have a
  second consumer. The reference project could keep its cards inline because both readers
  pulled from one translation dictionary; without a dictionary, inline would mean six
  feature descriptions maintained in two files, which is exactly the drift that dictionary
  prevented.

  So the rule is: copy stays inline until something other than the component needs it, and
  then it moves here, beside the structural data it belongs with. Prose that only one place
  renders — the hero, the section headings — stays in the component.
*/

export const ROLES = [
  {
    visual: { icon: ShieldCheck, accentClassName: 'text-accent-violet', surfaceClassName: 'bg-accent-violet/10' },
    title: 'Administrator',
    summary: "Runs the hospital's record of itself — people, departments, prices and the audit trail.",
    capabilities: [
      'Create and approve staff accounts',
      'Manage departments and the service catalogue',
      'Raise invoices and record payments',
      'Read the analytics and the access trail',
    ],
  },
  {
    visual: { icon: Stethoscope, accentClassName: 'text-accent-blue', surfaceClassName: 'bg-accent-blue/10' },
    title: 'Doctor',
    summary: 'Sees the history before the consultation starts, and writes what happened during it.',
    capabilities: [
      'Open the day’s queue and consult',
      'Read a patient’s full timeline',
      'Write diagnoses and treatment notes',
      'Issue prescriptions and order tests',
    ],
  },
  {
    visual: { icon: HeartPulse, accentClassName: 'text-accent-teal', surfaceClassName: 'bg-accent-teal/10' },
    title: 'Nurse',
    summary: 'Owns the first five minutes — check-in, vitals and the triage priority that reorders the queue.',
    capabilities: ['Check patients in and assign tokens', 'Record vitals with range checking', 'Set triage priority', 'Never writes a diagnosis'],
  },
  {
    visual: { icon: FlaskConical, accentClassName: 'text-accent-amber', surfaceClassName: 'bg-accent-amber/10' },
    title: 'Diagnostic lab',
    summary: 'Takes the order, does the work, and releases the result once it has been verified.',
    capabilities: ['Work the incoming order list', 'Upload reports as PDF or image', 'Verify before release', 'Bill diagnostic services'],
  },
  {
    visual: { icon: UserRound, accentClassName: 'text-accent-rose', surfaceClassName: 'bg-accent-rose/10' },
    title: 'Patient',
    summary: 'Their own record, and nothing else — resolved from the session, never from a URL.',
    capabilities: [
      'Book, reschedule and cancel appointments',
      'Read prescriptions and released reports',
      'Follow their own visit history',
      'See invoices and what is still owed',
    ],
  },
] as const satisfies readonly RoleCardModel[];

export const FEATURES = [
  {
    visual: { icon: ClipboardPlus, accentClassName: 'text-primary', surfaceClassName: 'bg-primary/10' },
    title: 'Electronic medical records',
    description:
      'Encounters, vitals, diagnoses and treatment notes on one timeline. Append-mostly: a correction after the visit is a dated addendum, not an overwrite.',
  },
  {
    visual: { icon: CalendarClock, accentClassName: 'text-accent-blue', surfaceClassName: 'bg-accent-blue/10' },
    title: 'Appointments',
    description:
      'Booking against real doctor availability, with the slot re-checked at write time and double-booking refused by the database rather than by the screen.',
  },
  {
    visual: { icon: Activity, accentClassName: 'text-accent-teal', surfaceClassName: 'bg-accent-teal/10' },
    title: 'Queue management',
    description:
      'Token numbers assigned at check-in, triage priority that reorders the line, and a queue derived from the appointments rather than stored beside them.',
  },
  {
    visual: { icon: FlaskConical, accentClassName: 'text-accent-amber', surfaceClassName: 'bg-accent-amber/10' },
    title: 'Diagnostics',
    description:
      'Lab orders through to verified reports. Files are type-checked by magic number, stored outside the public tree, and served only to whoever may read them.',
  },
  {
    visual: { icon: Receipt, accentClassName: 'text-accent-rose', surfaceClassName: 'bg-accent-rose/10' },
    title: 'Billing and payments',
    description:
      'Invoices priced from the service catalogue, in integer minor units, with lines that snapshot what they cost on the day the bill was issued.',
  },
  {
    visual: { icon: LayoutDashboard, accentClassName: 'text-accent-violet', surfaceClassName: 'bg-accent-violet/10' },
    title: 'Notifications and analytics',
    description:
      'Reminders that survive a missed run, alerts that never carry a clinical detail, and figures aggregated in the database with a period attached to every one.',
  },
] as const satisfies readonly FeatureCardModel[];

/** Product names are proper nouns, so they stay out of the dictionary. */
export const TECH_STACK = [
  { label: 'Next.js 16', role: 'App Router — server rendering and route handlers together' },
  { label: 'React 19', role: 'Server Components by default; client only where state lives' },
  { label: 'TypeScript', role: 'Strict. No implicit any, no unchecked casts into a DTO' },
  { label: 'Tailwind CSS v4', role: 'Design tokens, and every class checked against them' },
  { label: 'MongoDB', role: 'Document-shaped clinical records with real indexes' },
  { label: 'Mongoose', role: 'Schemas, hooks and the hash that never leaves the model' },
] as const satisfies readonly TechCardModel[];

export const ROADMAP_PHASES = [
  { phase: 'Phase 1', title: 'Requirement analysis', description: 'The proposal turned into a step-by-step plan', weeks: 'Week 1' },
  { phase: 'Phase 2', title: 'System design', description: 'Toolchain, design system, data model and the SEO surface', weeks: 'Week 2' },
  { phase: 'Phase 3', title: 'Backend', description: 'Authentication, accounts, availability, appointments and the queue', weeks: 'Week 3–4' },
  { phase: 'Phase 4', title: 'Frontend', description: 'Role dashboards, encounters, prescriptions, diagnostics and the portal', weeks: 'Week 5–6' },
  { phase: 'Phase 5', title: 'Integration', description: 'Registration, profiles, notices, reminders, billing and analytics', weeks: 'Week 7' },
  { phase: 'Phase 6', title: 'Testing', description: 'Rate limits, the access trail, the polish pass and the smoke path', weeks: 'Week 8' },
  { phase: 'Phase 7', title: 'Deployment', description: 'A clean clone reaching a running production build', weeks: 'Week 9' },
  { phase: 'Phase 8', title: 'Documentation', description: 'README, the visual walkthrough and the final report', weeks: 'Week 10' },
] as const satisfies readonly RoadmapPhaseModel[];
