// Imported from the modules rather than the `@/constants` barrel to keep these builders
// free of the barrel's other dependencies — they are called from metadata route handlers.
import { APP_DATA } from '@/constants/app-data.const';
import { FEATURES, ROADMAP_PHASES, ROLES, TECH_STACK } from '@/constants/home.const';

type LlmsInput = {
  homeUrl: string;
};

/*
  Both documents are built from the same lists the landing page renders, so they cannot
  drift from the UI the way a hand-maintained text file would. That is the whole reason
  those lists live in `constants/home.const.ts` instead of inline in the sections.
*/

function buildHeader({ homeUrl }: LlmsInput): string[] {
  return [`# ${APP_DATA.NAME}`, '', `> ${APP_DATA.DESCRIPTION}`, '', `Home: ${homeUrl}`, ''];
}

/**
 * The short index, per the llmstxt.org convention: an H1, a blockquote summary, then
 * linked sections.
 *
 * @param input - Absolute home URL.
 *
 * @returns Markdown document.
 */
export function buildLlmsTxt(input: LlmsInput): string {
  return [
    ...buildHeader(input),
    '## What it is',
    '',
    'A unified healthcare management platform for a single facility: patient registration, appointments and queueing, consultations,',
    'prescriptions, diagnostics and billing in one system, with every route and action gated by role.',
    '',
    '## Roles',
    '',
    ...ROLES.map(x => `- **${x.title}** — ${x.summary}`),
    '',
    '## Modules',
    '',
    ...FEATURES.map(x => `- **${x.title}** — ${x.description}`),
    '',
    '## Optional',
    '',
    `- Full description: ${input.homeUrl}llms-full.txt`,
    '',
  ].join('\n');
}

/**
 * The long form — every section of the landing page as markdown.
 *
 * @param input - Absolute home URL.
 *
 * @returns Markdown document.
 */
export function buildLlmsFullTxt(input: LlmsInput): string {
  return [
    ...buildHeader(input),
    '## One record, wherever the patient is standing',
    '',
    'Registration, appointments, the queue, the consultation, the prescription, the lab result and the bill — one system, one history,',
    'and access decided by who is asking rather than who is nearby.',
    '',
    '## Five people, five dashboards, one record',
    '',
    'Every route and every action is gated by role, and clinical access is decided by the relationship to the patient rather than by',
    'the job title alone.',
    '',
    ...ROLES.flatMap(x => [`### ${x.title}`, '', x.summary, '', ...x.capabilities.map(capability => `- ${capability}`), '']),
    '## What the platform covers',
    '',
    'Each module is built as its own step, ends with a working app, and hands the next one a spine it does not have to invent.',
    '',
    ...FEATURES.map(x => `- **${x.title}** — ${x.description}`),
    '',
    '## Chosen for what it removes',
    '',
    'Server rendering and the API layer in one codebase, a strict compiler, and a session signed in-house rather than a library',
    'standing between the app and its own cookie.',
    '',
    ...TECH_STACK.map(x => `- **${x.label}** — ${x.role}`),
    '',
    '## Built in steps, each one shippable',
    '',
    'The proposal’s eight phases, mapped onto twenty-seven steps. Nothing starts until the step before it ends green.',
    '',
    ...ROADMAP_PHASES.map(x => `- ${x.phase} (${x.weeks}) — ${x.title}: ${x.description}`),
    '',
  ].join('\n');
}
