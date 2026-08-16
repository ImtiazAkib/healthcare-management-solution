# Implementation Plan

A Unified Healthcare Management Solution — patient records, appointments and queueing, prescriptions,
diagnostics, billing and hospital communication in one platform, with role-based dashboards for
**administrators**, **doctors**, **nurses**, **diagnostic staff** and **patients**.

The build is split into **27 steps**. Each one is self-contained, ends with a green build, and leaves the app
in a working state.

> This project follows the house style of `academic-workflow-synchronization-system` — the same toolchain,
> the same layering, the same file naming, the same definition of done. The one deliberate departure is
> localization: **this app ships in English only**. See
> [Differences from the reference project](#differences-from-the-reference-project).

## How this works

- **You start each step.** Say _"start step 4"_ and only step 4 gets built. Nothing runs ahead of your command.
- **The checks are enforced, not remembered.** Husky runs lint and format on every commit, commitlint on the
  message, and the build on every push. See the README's Git hooks section.
- **One step at a time.** If a step turns out to be bigger than it looks, it gets split rather than stretched —
  that is why steps 3, 6 and 21 already carry an `a`/`b` split.
- **Every step ends green** — see [Definition of done](#definition-of-done).
- **The plan is not frozen.** Anything discovered mid-step that belongs elsewhere goes to
  [Backlog](#backlog) instead of quietly widening the current step.

## Status at a glance

| #                | Step                                    | Proposal phase | Status         |
| ---------------- | --------------------------------------- | -------------- | -------------- |
| [0](#step-0)     | Project scaffold                        | Phase 1–2      | ✅ Done        |
| [1](#step-1)     | Foundations                             | Phase 2        | ⬜ Not started |
| [2](#step-2)     | SEO, structured data, llms.txt          | Phase 2        | ⬜ Not started |
| [3a](#step-3a)   | Data model — identity & directory       | Phase 2–3      | ⬜ Not started |
| [3b](#step-3b)   | Data model — clinical & scheduling      | Phase 2–3      | ⬜ Not started |
| [4](#step-4)     | Authentication                          | Phase 3        | ⬜ Not started |
| [5](#step-5)     | Dashboard shell & RBAC                  | Phase 3        | ⬜ Not started |
| [6](#step-6)     | Admin — staff accounts                  | Phase 3        | ⬜ Not started |
| [6b](#step-6b)   | Admin — departments & service catalogue | Phase 3        | ⬜ Not started |
| [7](#step-7)     | Patient registry & medical record no.   | Phase 3        | ⬜ Not started |
| [8](#step-8)     | Doctor availability                     | Phase 3        | ⬜ Not started |
| [9](#step-9)     | Appointments & queue management         | Phase 3–4      | ⬜ Not started |
| [10](#step-10)   | Encounters & medical records (EMR)      | Phase 4        | ⬜ Not started |
| [11](#step-11)   | Digital prescriptions                   | Phase 4        | ⬜ Not started |
| [12](#step-12)   | Diagnostics — lab orders & reports      | Phase 4        | ⬜ Not started |
| [13](#step-13)   | Patient portal                          | Phase 4        | ⬜ Not started |
| [14](#step-14)   | Nurse workspace — triage & vitals       | Phase 4        | ⬜ Not started |
| [15](#step-15)   | Accounts — registration & email         | Phase 5        | ⬜ Not started |
| [16](#step-16)   | Profiles                                | Phase 5        | ⬜ Not started |
| [17](#step-17)   | Notices & announcements                 | Phase 5        | ⬜ Not started |
| [18](#step-18)   | Notifications, reminders & alerts       | Phase 5        | ⬜ Not started |
| [19](#step-19)   | Billing & payments                      | Phase 5        | ⬜ Not started |
| [20](#step-20)   | Analytics & reporting                   | Phase 5        | ⬜ Not started |
| [21a](#step-21a) | Hardening                               | Phase 6        | ⬜ Not started |
| [21b](#step-21b) | Polish                                  | Phase 6        | ⬜ Not started |
| [22](#step-22)   | Testing & deployment                    | Phase 6–7      | ⬜ Not started |
| [23](#step-23)   | Documentation & handover                | Phase 8        | ⬜ Not started |
| [24](#step-24)   | Inpatient admissions & beds             | —              | ⬜ Not started |
| [25](#step-25)   | Teleconsultation & referrals            | —              | ⬜ Not started |

Steps 24 and 25 are past the ten-week proposal — kept here so the shape is decided before anyone starts. Both
lean on spines the earlier steps already build: the conflict-checked availability of [step 8](#step-8) and the
encounter record of [step 10](#step-10).

## Roadmap

The proposal's phases, mapped onto the steps above.

| Phase | Activity             | Deliverable in the proposal            | Estimate | Steps    |
| ----- | -------------------- | -------------------------------------- | -------- | -------- |
| 1     | Requirement analysis | SRS document                           | Week 1   | 0        |
| 2     | System design        | ERD, wireframes, architecture diagram  | Week 2   | 0–3b     |
| 3     | Backend development  | API + EMR and appointment modules      | Week 3–4 | 3a–9     |
| 4     | Frontend development | Dashboards, appointment UI             | Week 5–6 | 5, 10–14 |
| 5     | Integration          | Full system connection + notifications | Week 7   | 15–20    |
| 6     | Testing & bug fixing | Stable version                         | Week 8   | 21a–22   |
| 7     | Deployment           | Live system                            | Week 9   | 22       |
| 8     | Documentation        | Final report + presentation            | Week 10  | 23       |

## Decisions

Settled up front, because they shape every step below.

| Area              | Choice                                                                                                   | Follows       |
| ----------------- | -------------------------------------------------------------------------------------------------------- | ------------- |
| **Framework**     | Next.js 16 App Router, React 19, TypeScript strict, Tailwind v4, shadcn (`base-nova`) on Base UI         | the reference |
| **Styling**       | Inline Tailwind utilities with design tokens, `cn()` for conditionals — never a `className` constant     | the reference |
| **Data layer**    | zod schemas → services → DTO mappers → Result pattern → `actions.ts` server actions                      | the reference |
| **Database**      | MongoDB + Mongoose, database name set in code, GridFS for stored files                                   | the reference |
| **Auth**          | Session JWT signed with `jose` in an httpOnly cookie — no auth library, no pre-release deps              | the reference |
| **Language**      | **English only.** No next-intl, no `[locale]` segment, no `l10n/`. Copy is literal text in the JSX       | departure     |
| **Time**          | One timezone, pinned in `constants/datetime.const.ts`; every date is formatted on the server             | the reference |
| **Roles**         | `SUPER_ADMIN` · `ADMIN` · `DOCTOR` · `NURSE` · `LAB` · `PATIENT`                                         | —             |
| **Clinical data** | `User` carries identity and credentials; `Patient` and `Doctor` are separate documents that reference it | —             |
| **Billing**       | Invoices and recorded payments. No live payment gateway — a transport seam, like mail                    | —             |
| **Messaging**     | Email through nodemailer; SMS behind the same interface with a logging transport; in-app notifications   | —             |

Three of these deserve their reasoning stated, because they will be questioned later.

**Clinical data does not live on the account.** The reference puts the department record on `User` and gets
away with it. Here the patient record carries allergies, chronic conditions, blood group and an emergency
contact — health information that has no business sitting in the document every sign-in reads and every
session mints its claims from. `User` holds identity and credentials; `Patient` and `Doctor` hold the rest and
reference it. That costs one lookup and buys a clean line between "who is asking" and "what is known about
them", which is the line the audit trail in [step 21a](#step-21a) is drawn along.

**No payment gateway.** The proposal says "integrated billing & payment processing". A real gateway means
credentials, a merchant account and a webhook endpoint that has to be reachable from the internet — none of
which an academic build can honestly demonstrate. Instead, billing produces invoices and records payments
against them, behind a `PaymentGateway` interface with a `manual` implementation, mirroring how mail already
swaps `smtp` for `log`. Adding a real provider later is one new implementation of the interface, not a rewrite
of the billing service.

**SMS ships as a logged stub.** Same reasoning, smaller: the interface and the call sites are real, the
transport writes to the log until someone supplies a provider. What is verifiable is verified; what is not is
not pretended.

## Differences from the reference project

Everything not listed here is identical to `academic-workflow-synchronization-system` — same conventions,
same layering, same naming, same hooks.

**Localization is removed, not stubbed.** The consequences, concretely:

- No `l10n/` folder, no `next-intl`, no `csv-parse`, no `scripts/csv-to-json.mjs`, no `npm run i18n:generate`.
- `app/[locale]/**` becomes `app/**`. No `generateStaticParams()`, no `hasLocale` guard, no
  `params: Promise<{ locale }>` on layouts and pages, `<html lang="en">`.
- `proxy.ts` keeps its name and its job — it is Next 16's middleware file, not an i18n artifact — but it is
  now only the route guard: no `createMiddleware`, no locale negotiation, no locale prefix on the sign-in
  redirect.
- `Link`, `redirect`, `usePathname` and `useRouter` come from `next/link` and `next/navigation` directly.
  These sort into the **Next** import group at the top of a file, not the internal-alias group.
- Metadata loses `alternates.languages`, `x-default`, `og:locale` and `og:locale:alternate`. `generateMetadata`
  collapses to a static `export const metadata` on most pages. The sitemap emits one entry per public route
  rather than one per locale.
- Only Inter and Poppins are loaded. No `html[lang]` font swap.
- Dates and numbers are formatted by named helpers in `lib/utils/datetime.utils.ts`, each holding a module-level
  `Intl.DateTimeFormat` pinned to `DEFAULT_TIMEZONE`. No `numberingSystem` pinning — that existed only for
  Bengali numerals.
- **Copy is literal English text in the JSX**, written in the component that renders it. There is no
  `constants/copy.const.ts` and there will not be one: a constants file for text would recreate the
  indirection i18n forced without the payoff. `constants/{feature}.const.ts` keeps holding structural data —
  icons, accent classes, ids, limits, route hrefs. Two exceptions carry strings and are already precedented:
  `constants/app-data.const.ts` (the product's own name, tagline, description) and `constants/codes-*.const.ts`
  (server-side error messages).
- The `labels` prop bundle **collapses** where it only existed to move server-resolved strings across the
  client boundary — a client component can hold its own literals now. It **survives** where it prevents drift
  between two callers rendering the same form, becoming a plain `const` object rather than a builder that takes
  a translator.

Two things this costs, stated plainly: there is no longer one file where every user-facing string is visible
and greppable, and no compile-time check that a referenced string exists. And one thing it inverts —
**cspell now reads all of the app's copy**, because the dictionary runs over `.ts`/`.tsx` and that is where
the text now lives. Medical vocabulary will need adding to `cspell.config.json` as it appears; that is a real
recurring cost the reference project never paid, and the rule is unchanged: a new domain word goes in the
config, never behind an inline disable.

**Domain differences.** Six roles instead of three. Files are clinical documents rather than course
materials, which raises the bar on who may read them. And the system holds health information, so
[step 21a](#step-21a) adds an access trail over record reads — not just writes, which is what an ordinary
audit log covers.

## Definition of done

A step is finished only when all of these hold:

- [ ] `npm run format:write` applied, `npm run format` clean
- [ ] `npm run lint` green — import order, cspell, canonical Tailwind classes, Prettier
- [ ] `npm run build` succeeds, including the TypeScript pass
- [ ] The affected screens render with no console errors, in light **and** dark
- [ ] New medical or domain vocabulary is added to `cspell.config.json`, never disabled inline
- [ ] New public routes are in the sitemap; new private routes are `noindex` (from step 2 onward)
- [ ] New files are wired into their barrel `index.ts`
- [ ] No patient-identifying data reaches a log line, a URL query string, or a DTO that did not name it
- [ ] This document's status table is updated

---

## Steps

<a id="step-0"></a>

### Step 0 — Project scaffold ✅ Done

**Goal.** A running, lint-clean Next.js 16 app with the house toolchain and a design system tuned for a
clinical product — before a single feature exists.

**Deliverables.**

```
Toolchain    package.json (exact pins, no ^ or ~) · tsconfig.json · eslint.config.mjs · .prettierrc
             cspell.config.json · next.config.ts · postcss.config.mjs
             components.json · ecosystem.config.js · commitlint.config.mjs
             .husky/{pre-commit,commit-msg,pre-push} · .vscode/{extensions,launch}.json
             .claude/launch.json · .env.example · .gitignore
Design       app/globals.css — light + dark oklch tokens, five role accents, typography helpers
Shell        app/layout.tsx · (marketing)/{layout,page}.tsx · not-found.tsx
             global-error.tsx · robots.ts · icon.svg
Components   components/{home,layout,shared,ui} with barrels
Constants    app-data · database · routes · a11y · home, with a barrel
Types        role-visual · feature-visual, with a barrel
Data         lib/mongodb.ts — globalThis-cached Mongoose connection
             lib/utils/class-name.utils.ts — cn(), with the barrel `@/lib/utils` resolves to
Docs         README.md · docs/IMPLEMENTATION-PLAN.md (this file)
```

**Notes.**

- **Dependencies are pinned exact.** No `^`, no `~`. The reference's two deliberate down-pins carry over
  unless the upstream issues have closed by the time this is built: `typescript` below 7.0 because
  `typescript-eslint` will not load under it, and `eslint` below 10 because `eslint-config-next` still pulls a
  plugin that calls a removed API. Check both before pinning; if they have closed, take the newer majors and
  note it here.
- `eslint-import-resolver-typescript` is declared at the root on purpose — `eslint-config-next` keeps a nested
  copy `eslint-plugin-import` cannot find, and then falls back to the TypeScript compiler as a resolver, at
  which point every `@/*` import fails to resolve.
- `tsconfig.json` paths carry exactly one alias: `"@/*": ["./*"]`. No `src/` directory.
- **The palette is clinical, not academic.** `--primary` becomes a calm medical blue-teal rather than the
  reference's brick; `--success` / `--warning` / `--destructive` stay in their WCAG-verified relationships
  because they will carry triage and result-status meaning from step 9 onward. Every token comment records the
  **measured** contrast ratio, as the reference does — a number that was checked, not a claim.
- Five role accents, one per dashboard: `--accent-violet` (admin), `--accent-blue` (doctor),
  `--accent-teal` (nurse), `--accent-amber` (lab), `--accent-rose` (patient).
- `@theme inline` points `--font-sans` at `--font-body`, not straight at `--font-inter`. The reference needed
  that indirection for a language swap this project does not have; it is kept because it still buys a
  one-line typeface change, and the comment says **that**, not the old reason.
- The `format` script globs `ts,tsx,js,mjs,html,scss,json,md`. `lint` takes no path argument — flat config
  discovers everything.
- `output: 'standalone'` in `next.config.ts`, but only when `VERCEL` is unset; on Vercel the option makes the
  build fail on a missing trace file.

**Acceptance.** ✅ Verified. `npm run build` compiles and prerenders four routes (`/`, `/_not-found`,
`/icon.svg`, `/robots.txt`); `npm run lint` and `npm run format` are green. In the browser: the landing page
renders with Inter on the body and Poppins at weight 600 on headings, no console errors of any level, one
`<h1>`, header/main/footer/nav landmarks all present, the skip link first in the tab order and parked at
`-64px`, and no horizontal scroll at 375px. Setting `dark` on `<html>` swaps every token and removing it
restores them. `/does-not-exist` returns **404** with the styled page and a link home; `/robots.txt` serves
`Disallow: /`; the page head carries `noindex, nofollow` and both `theme-color` values. cspell was confirmed
live by three real failures it caught during the pass.

**Deviations from the plan, and why.**

- **`lib/utils/class-name.utils.ts` and its barrel landed here, not in step 1.** `components/ui/button.tsx`
  needs `cn()`, and a primitive that cannot merge classes is not a primitive. The rest of step 1's utils are
  untouched.
- **`types/` was created, which step 0 did not itemize.** `ROLE_VISUALS` and `FEATURE_VISUALS` are typed
  against `RoleVisual` / `FeatureVisual`, and `as const satisfies Record<string, RoleVisual>` is what makes a
  malformed visual a compile error rather than a card that renders nothing.
- **`lib/mongodb.ts` reads `process.env.MONGODB_URI` directly and throws if it is absent.** The validated
  `env` module is step 1; this is the seam, and the comment in the file says so. Nothing calls it yet.
- **`app/icon.svg`, not `icon.png`**, and `AppLogo` draws the mark inline rather than loading a file. Two
  paths cost less than a binary asset plus a second set of dimensions to keep in sync, and an `<img>` cannot
  follow the theme — the inline mark takes `--primary` and `--primary-foreground`, so it is correct in both
  schemes with no dark variant. `public/brand/` is therefore empty.
- **`app/not-found.tsx` sits at the app root, outside `(marketing)`.** A 404 nested in the route group renders
  only for misses near it; this one answers for every unmatched path, which is why it carries its own
  centred layout instead of the site header.
- **No `.prettierignore`.** Its only content in the reference was the generated next-intl declaration file,
  which does not exist here. An empty ignore file would be a file with nothing in it.
- **`robots.ts` disallows everything unconditionally, and the root metadata is hard-coded `noindex`.** Both
  become `ROBOTS_ENABLED`-gated in step 2. The default the flag will gate on is exactly what is written now,
  so the safe state is the state before the flag exists as well as after.
- **No sign-in button in the site header.** `typedRoutes` refuses a link to a route that does not exist, and
  `/sign-in` arrives in step 4. The header's only action is the one in-page anchor until then.
- **US spelling, enforced by cspell.** The dictionary is `en`, so "colour" and "honour" fail `npm run lint`.
  Prose in this repo follows it.
- **`PROTECTED_SEGMENTS` ships empty.** It is the single source for both the route guard and the robots
  `Disallow` list, and there is nothing to protect until step 5 — but the constant exists now so neither of
  those two consumers has to invent it later.
- **Verified without screenshots.** The browser pane does not composite frames in this session, so the visual
  acceptance was done by reading computed styles, resolved custom properties, the accessibility tree and
  response codes out of the live page. That is stricter than looking at it for everything except layout
  aesthetics, which remain unverified by eye.

---

<a id="step-1"></a>

### Step 1 — Foundations

**Goal.** Put the shared plumbing in place before any feature needs it, so no step has to invent its own
error shape or read `process.env` directly.

**Deliverables.**

```
env/server.ts             @t3-oss/env-nextjs + zod, validated at build time
env/client.ts             NEXT_PUBLIC_* only — empty until something needs one
next.config.ts            imports both env modules so a missing variable fails the build
lib/result/               single-result · list-result · list-result-info · empty-result
                          error-dto · message-dto · index
lib/api/                  responses/with-ok · with-bad-request · with-unauthorized · with-forbidden
                          with-not-found · with-too-many-requests · with-insufficient-storage
                          same-origin.guard.ts
lib/utils/error.utils.ts  error normalization
lib/utils/zod.utils.ts    encodeZodMessage · decodeZodMessage · mapZodErrorsToErrorDto
lib/utils/class-name.utils.ts   cn()
lib/utils/index.ts        the barrel — `@/lib/utils` resolves here
lib/logger.ts             pino, pretty in development
constants/codes.const.ts + codes-common.const.ts   the error-code registry
constants/database.const.ts · datetime.const.ts · index.ts
```

**Notes.**

- `SingleResult<T>` / `ListResult<T>` / `EmptyResult` all carry `{ success, result, errors, messages }`.
  Business failures return a failure result; only genuinely exceptional things throw. A refused action is
  data, not an exception.
- Error codes are five digits — `[layer][feature][sequence]` — so `20002` is a common validation error and
  `50001` an authorization one. Each feature adds its own `codes-{feature}.const.ts` **with the service that
  raises it**, not up front for features that do not exist.
- zod messages carry their code inline via `encodeZodMessage`, and `mapZodErrorsToErrorDto()` unpacks a whole
  `ZodError` into field-level `ErrorDto`s a form can render.
- **Anything in the `lib/utils` barrel must be safe in a client bundle.** Utils that reference mongoose import
  it with `import type`. `proxy.ts` and the models import specific modules directly rather than the barrel,
  because the barrel drags `lucide-react` in with it and the middleware runtime cannot resolve that.
- `lib/logger.ts` exports pino directly. Call sites use pino's own API: `log.info({ userId }, 'message')`.
  **No patient identifier, name, address or clinical value is ever a log field** — an id is fine, a diagnosis
  is not. This is the first place the rule appears and it holds everywhere after.
- Adds `@t3-oss/env-nextjs`, `zod`, `pino`, `pino-pretty`.

**Acceptance.** `APP_BASE_URL=not-a-url npm run build` fails before the build starts, naming the variable and
the reason; the Result helpers are exported from `@/lib/result` and typed end to end; `cn()` merges conflicting
Tailwind classes with the caller's `className` winning; lint, format and build are green.

---

<a id="step-2"></a>

### Step 2 — SEO, structured data and llms.txt

**Goal.** Make the public surface legible to search engines, social cards and LLM crawlers — and make sure
the clinical surface is never indexed.

**Deliverables.**

```
app/layout.tsx              metadataBase from APP_BASE_URL, canonical, static metadata
app/sitemap.ts              absolute URLs, one entry per public route
app/robots.ts               sitemap reference, private-segment Disallow, ROBOTS_ENABLED staging gate
app/opengraph-image.tsx     1200×630 social card via next/og ImageResponse
app/llms.txt/route.ts       short index for LLM crawlers, per the llmstxt.org convention
app/llms-full.txt/route.ts  the long form — every landing section as markdown
components/shared/json-ld.tsx   renders the graph, ships no client JavaScript
constants/json-ld.const.ts  @graph builder — Organization · WebSite · SoftwareApplication
constants/seo.const.ts      keywords, social profiles, sitemap priority tiers
constants/routes.const.ts   ROUTES, PROTECTED_SEGMENTS, PRIVATE_SEGMENTS
env/server.ts               gains ROBOTS_ENABLED
lib/utils/llms.utils.ts · lib/utils/url.utils.ts
```

**Notes.**

- **Indexing is off unless a deploy opts in.** `ROBOTS_ENABLED` defaults to `false`, which makes `robots.txt`
  emit `Disallow: /` _and_ the page metadata emit `noindex, nofollow`. Two independent signals, because
  getting a staging site back out of the index is far more work than setting one variable.
- `PROTECTED_SEGMENTS` in `constants/routes.const.ts` is the single source for both the route guard in step 4
  and the `Disallow` list here. Every dashboard segment is in it from the day it exists.
- **A healthcare app must never leak a route that names a patient.** The sitemap enumerates public routes
  explicitly rather than deriving them from the filesystem, so a new clinical route cannot be added to it by
  accident.
- Structured data is typed with `schema-dts`, so a node or property outside the schema.org vocabulary fails the
  build instead of failing a validator after deploy. `constants/json-ld.const.ts` exports a **builder**, not a
  static object — the base URL is server-only env and the constants barrel is imported by client components.
- The organization node describes the project itself for now. It becomes a `MedicalOrganization` with address
  and contact details when a real institution is named; inventing those now would put false clinical
  credentials in front of crawlers, which is worse here than in an academic app.
- Adds `schema-dts`. `next/og` ships with Next.

**Acceptance.** All five routes return 200 with absolute URLs built from `APP_BASE_URL`; the rendered head has
a canonical link and a JSON-LD graph typed `Organization` → `WebSite` → `SoftwareApplication`; both branches of
the robots gate are checked — default emits `Disallow: /` plus `noindex, nofollow`, `ROBOTS_ENABLED=true`
emits `Allow: /` with every private segment disallowed.

---

<a id="step-3a"></a>

### Step 3a — Data model: identity and directory

**Goal.** The accounts, the people and the places — everything authentication and administration read, with
validation and DTO mapping around it.

**Deliverables.**

```
models/user.model.ts        email · password (select:false) · role · name · phone · gender
                            dateOfBirth · isEmailVerified · isApproved · isActive
models/department.model.ts  name · code · description · headDoctor · isActive
models/doctor.model.ts      user · department · specialization · designation · registrationNo
                            consultationFee · roomNo · biography · isAcceptingPatients
models/patient.model.ts     user · medicalRecordNo · bloodGroup · allergies[] · chronicConditions[]
                            emergencyContact{name,relation,phone} · address
models/index.ts
types/user.dto.ts · department.dto.ts · doctor.dto.ts · patient.dto.ts
types/user-role.ts · gender.ts · blood-group.ts · session-user.ts · index.ts
lib/schemas/object-id.schema.ts · user-fields.schema.ts
lib/schemas/user-create · user-update · user-approve · user-activate · user-delete · user-filters
lib/schemas/department-create · department-update · doctor-create · doctor-update
lib/schemas/patient-create · patient-update · index.ts
constants/roles.const.ts · users.const.ts · patient.const.ts
constants/codes-users.const.ts
lib/utils/mongo.utils.ts    toId() — a reference renders as a string, populated or not
scripts/seed-super-admin.ts creates the one super administrator
```

**Notes.**

- `MONGODB_URI` becomes required in `env/server.ts` here.
- Every model is guarded with `mongoose.models.X ?? mongoose.model('X', schema)` so hot reload re-uses the
  compiled model instead of redefining it.
- Passwords are hashed in the model's `pre('save')` hook with `bcryptjs`, so every path that saves a user gets
  it, including the seed script. The field is named `password`, not `passwordHash` — the hook is handed a
  plaintext and replaces it, so the other name would be a lie at the moment of assignment. It carries
  `select: false` instead, which is the protection the name was reaching for.
- **Nothing reaches a component as a Mongoose document.** Each entity has a mapper in `types/{entity}.dto.ts`
  that names every field explicitly, so `password`, `_id` and `__v` cannot leak by being forgotten, and a new
  clinical field stays invisible until someone deliberately adds it. Mappers take a structural entity type
  rather than a `HydratedDocument`, so they accept both hydrated documents and `.lean()` results.
- **`PatientDto` and `PatientSummaryDto` are two different mappers.** A queue list, a search result and an
  appointment row need a name, an MRN and an age — not allergies and conditions. Making the narrow shape the
  default and the full one deliberate is the difference between a clinical record leaking into a list screen
  and not.
- Models import the specific constant module, never the `@/constants` barrel.
- The seed script seeds the **super administrator** — there is exactly one, it cannot be created or changed
  through any screen, and it is the account that creates the first administrator. Credentials are passed in
  the environment rather than on the command line, so the password stays out of shell history. Re-running it
  never resets an existing password.
- Adds `mongoose`, `bcryptjs`, `tsx`.

**Acceptance.** Verified against a real cluster with temporary records created and removed: the password is
hashed by the hook and never stored plaintext, `select: false` keeps it out of an ordinary query, email is
lowercased and uniquely indexed, `isApproved` defaults false and `isActive` true, `userFromEntity()` emits
exactly the named keys with no `password` and no `_id`, and `patientSummaryFromEntity()` carries no clinical
field. Both of the seed script's validation failure paths report the offending variable by name.

---

<a id="step-3b"></a>

### Step 3b — Data model: clinical and scheduling

**Goal.** The records the clinical workflow reads and writes, so no later step invents its own shape for a
visit, an order or a result.

**Deliverables.**

```
models/availability.model.ts  doctor · dayOfWeek · startTime · endTime · slotMinutes · room
                              effectiveFrom · effectiveTo · isActive
models/appointment.model.ts   patient · doctor · department · date · startTime · endTime
                              tokenNo · status · reason · bookedBy · cancelledReason
models/encounter.model.ts     appointment · patient · doctor · vitals{} · chiefComplaint
                              examination · diagnoses[] · treatmentNotes · followUpDate · status
models/prescription.model.ts  encounter · patient · doctor · items[] · advice · issuedAt
models/lab-order.model.ts     encounter · patient · orderedBy · tests[] · priority · status
models/lab-report.model.ts    labOrder · patient · performedBy · summary · findings
                              file{storageKey,fileName,mimeType,size} · verifiedBy · releasedAt
types/appointment.dto.ts · encounter.dto.ts · prescription.dto.ts · lab-order.dto.ts
types/lab-report.dto.ts · availability.dto.ts
types/day-of-week.ts · appointment-status.ts · encounter-status.ts · lab-status.ts
lib/schemas/                  availability-create · availability-update · appointment-create
                              appointment-reschedule · appointment-status · encounter-create
                              encounter-update · prescription-create · lab-order-create
                              lab-report-create · state-change.schema.ts
constants/schedule.const.ts · appointment.const.ts · encounter.const.ts · lab.const.ts
```

**Notes.**

- **Times are 24-hour `HH:mm` strings**, zero-padded, so `startTime < endTime` is a plain string comparison —
  and so is the overlap test that step 8's conflict detection runs. Dates are stored as a date-only value at
  midnight in the pinned timezone, never as "now".
- `Appointment.status` is a closed set: `REQUESTED` · `CONFIRMED` · `CHECKED_IN` · `IN_CONSULTATION` ·
  `COMPLETED` · `CANCELLED` · `NO_SHOW`. Which transitions are legal is a service rule, not a schema rule —
  the schema only says which values exist. Statuses live in `types/appointment-status.ts` as a `const` object
  plus a derived union, the way roles do.
- `tokenNo` is the queue position for the doctor on that date. It is assigned when the patient checks in, not
  when the appointment is booked, because a queue is about who is present.
- **A vitals reading is a value object, not a document.** It is embedded in the encounter: whoever recorded it,
  when, and the readings themselves. A nurse in step 14 writes it; nothing else does.
- `LabReport.file` mirrors the reference's material shape, and `storageKey` is **absent from the DTO** — it
  describes where bytes sit on the server, and the download route resolves it after checking access.
- Diagnoses are free text plus an optional code field. No ICD dictionary is shipped; pretending to a coding
  standard the app cannot validate would be worse than a labelled free-text field. Logged in
  [Backlog](#backlog).
- Compound indexes that the queries in steps 8–12 will need are declared here, not retrofitted:
  `{ doctor, date }`, `{ patient, date }`, `{ patient, createdAt }`, `{ labOrder }`.

**Acceptance.** Verified against a real cluster with temporary records: every enum rejects a value outside its
set, `HH:mm` validation rejects `9:30` and `24:00`, an appointment cannot be saved without a patient and a
doctor, every DTO mapper emits exactly its named keys, and `LabReportDto` carries no `storageKey`.

---

<a id="step-4"></a>

### Step 4 — Authentication

**Goal.** Real sign-in, with the session carrying the role.

**Deliverables.**

```
lib/auth/session.ts         sign and verify the session JWT with jose
lib/auth/session-cookie.ts  set and clear the httpOnly cookie
lib/auth/current-user.ts    getSessionUser() for server components
lib/auth/guards.ts          requireSession() · requireRole()
lib/auth/index.ts
lib/services/auth.service.ts    credential verification, returns a Result
lib/schemas/sign-in.schema.ts · password-change.schema.ts
constants/auth.const.ts     cookie name, lifetime, issuer, audience, algorithm
constants/codes-auth.const.ts
proxy.ts                    the route guard — Next 16's middleware file
app/(auth)/layout.tsx · sign-in/page.tsx
app/unauthorized/page.tsx   403 for a signed-in visitor in the wrong area
components/auth/            auth-card · sign-in.form · form-error-alert · actions.ts
lib/utils/auth.utils.ts     resolveSignInErrorMessage(code)
```

**Notes.**

- A session JWT signed with `jose`, stored in an httpOnly cookie, `sameSite: lax`, `secure` in production,
  seven days. No auth library sits in between.
- The token carries `userId`, `role`, `email`, `name` and `isApproved`, so a guarded page knows who is asking
  without a database round trip. **It carries nothing clinical** — no MRN, no department, no patient id.
- `verifySessionToken()` does two things that are easy to leave out: it **pins the algorithm**
  (`algorithms: ['HS256']`, which is what refuses a token arriving with `alg: none`), and it **parses the
  payload with zod after checking the signature** — a signature proves the token was minted here, not that its
  shape still matches the current code.
- `proxy.ts` imports `@/lib/auth/session` **directly, not the barrel** — the barrel also exports the cookie
  helpers, which use `next/headers`, and that does not exist in the middleware runtime.
- **Refusals do not disclose.** `verifyCredentials()` checks the password first, then account state. An
  unknown email and a wrong password return the same `INVALID_CREDENTIALS` code; "waiting for approval" or
  "deactivated" is only ever disclosed to someone who has already proved they own the account.
- Reasons travel as codes, not sentences: the service returns a `SingleResult` carrying an `ErrorDto`, and the
  form renders the sentence for that code.
- Guards **redirect rather than returning `null`**, so no caller can forget the refused case and render a page
  to nobody. A wrong role gets `/unauthorized`, not sign-in — sending an authenticated nurse to sign in again
  reads as a bug rather than a refusal.
- Adds `jose`.

**Acceptance.** The super administrator signs in and lands on the admin home; a wrong password, an unknown
email, an unapproved account and a deactivated account each produce the correct message and no more; a
tampered token, an `alg: none` token and an expired token are all refused; a signed-out request to a protected
route redirects to sign-in with the intended destination in `?next=`; the cookie is `httpOnly` in the browser's
storage inspector.

---

<a id="step-5"></a>

### Step 5 — Dashboard shell & RBAC

**Goal.** One shell, five role areas, and the access rules that decide who sees which.

**Deliverables.**

```
app/(dashboard)/layout.tsx · loading.tsx · error.tsx · not-found.tsx
app/(dashboard)/admin/page.tsx · doctor/page.tsx · nurse/page.tsx · lab/page.tsx · patient/page.tsx
components/dashboard/       dashboard-sidebar · dashboard-topbar · dashboard-nav
                            dashboard-mobile-nav · dashboard-breadcrumb · account-menu
                            dashboard-stat · dashboard-title-sync · index.ts
components/ui/              page-header · empty-state · skeleton · spinner (as needed)
components/shared/          skip-to-content · container · app-logo
constants/navigation.const.ts   the nav tree, one entry per role
constants/a11y.const.ts     MAIN_CONTENT_ID
lib/auth/admin-area.gate.ts     a Result-returning gate for server actions
lib/utils/role.utils.ts     resolveRoleLabel · ROLE_HOME
```

**Notes.**

- **The proxy answers "is there a session"; the page answers "is it the right one".** Both guards are called
  at the top of the page or layout, before any data is fetched.
- One nav declaration, filtered by role — not five copies. The active item is computed with `startsWith` so a
  `/new` child highlights its parent, which the reference got wrong in one place and paid for in a polish
  step.
- The dashboard layout's metadata carries `robots: { index: false, follow: false }`, independent of
  `robots.ts`. Two mechanisms, because either alone can fail.
- `<main id={MAIN_CONTENT_ID} tabIndex={-1}>` lives in the group layouts; the skip link lives in the root
  layout.
- **Failure is a third state, never the empty state.** A screen whose data failed to load renders an inline
  `role="alert"` banner and returns early — it does not fall through to "nothing scheduled yet", which would
  paint an encouraging message over an unreachable database. `role="status"` is for non-failure advisories.
- Each role area takes its accent from step 0's token set, used for the sidebar active state and the role
  badge — nowhere else. Color is a label here, not decoration.

**Acceptance.** Each of the six roles signs in and lands on its own dashboard; the sidebar shows only that
role's links; typing another role's URL redirects to `/unauthorized` with a link back to the visitor's own
home; the shell is usable at 375px with the mobile drawer; keyboard tab order reaches the skip link first and
the main landmark after it.

---

<a id="step-6"></a>

### Step 6 — Admin: staff accounts

**Goal.** The administrator creates, approves, edits and deactivates every staff account in the hospital.

**Deliverables.**

```
app/(dashboard)/admin/users/page.tsx · page-search-params.ts · loading.tsx · new/page.tsx
components/admin/users/     actions.ts · users.types.ts · users-screen · users-table
                            users-table-row · users-filters · users-empty
                            user-create.form · user-edit.dialog · user-confirm.dialog
                            user-role.fields · index.ts
lib/services/user.service.ts
constants/codes-users.const.ts    extended
```

**Notes.**

- **The feature-folder anatomy is fixed** and every later feature repeats it: `actions.ts` (server actions),
  `{plural}.types.ts` (props and view types), `{plural}-screen.tsx` (the one client component on the screen),
  `{plural}-table.tsx` / `-table-row.tsx`, `{plural}-filters.tsx`, `{plural}-empty.tsx`,
  `{singular}-create.form.tsx`, `{singular}-edit.dialog.tsx`, `{singular}-confirm.dialog.tsx`, `index.ts`.
  Singular for anything that operates on one row, plural for anything that renders the collection.
- **Server actions**: `'use server'` on line one, the service instantiated once at module scope, one exported
  `async function {verb}{Entity}Action(values: unknown)` per operation, gate → validate → delegate, returning a
  `SingleResult` or `EmptyResult`. Never `FormData`, never `prevState`, never a `redirect()` and never
  `revalidatePath` — freshness comes from `router.refresh()` on the client after a successful result.
- The argument is typed `unknown` deliberately: a TypeScript annotation is erased at runtime, and a hand-built
  request can send `{ $ne: null }` where a string was expected.
- Filters live in the URL through `nuqs`, parsed by a `page-search-params.ts` beside the page so the server
  page and the client filter bar read one definition.
- **A staff account is created approved; a self-registered account is not.** The approval flag exists for
  step 15 and is exercised here so the column and the action are real from the start.
- The super administrator is invisible to this screen — it cannot be listed, edited, demoted or deleted.
- Adds `nuqs`, `react-hook-form`, `@hookform/resolvers`, `sonner`.

**Acceptance.** An administrator creates a doctor, a nurse and a lab account and each signs in; editing a name
updates the row without a full page load; deactivating an account refuses its next sign-in; the filter bar
survives a reload because it lives in the URL; a duplicate email is refused with a field-level message rather
than a stack trace; the super administrator appears nowhere in the list.

---

<a id="step-6b"></a>

### Step 6b — Admin: departments and service catalogue

**Goal.** The structures the rest of the app selects from — departments, and the priced services billing will
later invoice.

**Deliverables.**

```
app/(dashboard)/admin/departments/page.tsx · loading.tsx · new/page.tsx
app/(dashboard)/admin/services/page.tsx · page-search-params.ts · loading.tsx · new/page.tsx
models/service-item.model.ts    code · name · category · price · isActive
types/service-item.dto.ts · service-category.ts
lib/services/department.service.ts · service-item.service.ts
lib/schemas/service-item-create.schema.ts · service-item-update.schema.ts
components/admin/departments/   the standard eleven files
components/admin/services/      the standard eleven files
constants/codes-departments.const.ts · codes-services.const.ts · service.const.ts
```

**Notes.**

- A department has a head doctor, which is a doctor account — so this step depends on step 6 and not the other
  way round.
- Service categories are `CONSULTATION` · `LAB` · `PROCEDURE` · `BED` · `PHARMACY`. A consultation service
  links to a department; a lab service is what a lab order line refers to in step 12; both are what an invoice
  line prices in step 19. Getting the catalogue in early is what keeps billing from inventing prices.
- **Prices are stored as integers in the smallest currency unit.** Floating point money is a bug with a
  delay on it. The currency and its minor-unit factor live in `constants/app-data.const.ts`.
- Deactivating a service never deletes it — an invoice issued last month still has to render the name and
  price it was billed at, so historical invoice lines snapshot both rather than referencing the live record.

**Acceptance.** An administrator creates a department, assigns a head doctor and sees it offered wherever a
department is chosen; a service is created, priced and deactivated, and the deactivated one no longer appears
in a picker but still renders on an older record; a price entered as `500.50` is stored and re-rendered
exactly, with no drift.

---

<a id="step-7"></a>

### Step 7 — Patient registry and medical record numbers

**Goal.** Reception registers a patient at the counter, the patient gets a permanent medical record number,
and staff can find them again.

**Deliverables.**

```
app/(dashboard)/admin/patients/page.tsx · page-search-params.ts · loading.tsx · new/page.tsx
app/(dashboard)/admin/patients/[patientId]/page.tsx · loading.tsx
lib/services/patient.service.ts
lib/services/record-number.issuer.ts    issues the MRN
components/patients/        actions.ts · patients.types.ts · patients-screen · patients-table
                            patients-table-row · patients-filters · patients-empty
                            patient-create.form · patient-edit.dialog · patient-summary
                            patient-search · index.ts
constants/codes-patients.const.ts
lib/utils/patient.utils.ts  formatMedicalRecordNo · calculateAge
```

**Notes.**

- **The medical record number is issued once and never changes.** It is the identifier every clinical document
  in the system hangs off, and it is what a person reads out at a counter. Format is a prefix, a year and a
  zero-padded sequence — `HMS-2026-000417` — issued by a dedicated issuer module rather than inline in the
  service, because step 15 issues one down a different path and the two must not diverge.
- Issuing is **check-then-act and therefore racy** if written naively. The issuer takes the number from an
  atomic counter document, not from a `count()` plus an insert.
- Registration at the counter creates a `User` **without a password** and an unverified email. The account
  cannot sign in until the patient claims it in step 15; until then the record exists and staff can use it.
  This is the normal case in a hospital, not an edge case.
- Search matches on MRN, phone and name, in that order of precedence. **It never matches on a diagnosis or a
  condition** — a search box that finds "everyone with HIV" is a different feature with a different access
  rule, and it is not this one.
- The patient detail page is the spine steps 10–13 hang timelines off. It ships here with the demographic
  record and an empty clinical area that later steps fill.
- Adds nothing.

**Acceptance.** Reception registers a patient and gets a formatted MRN back; the same MRN is never issued
twice under two simultaneous registrations; searching by MRN, phone and partial name each find the record;
the detail page renders the demographic record and the emergency contact; a doctor and a nurse can open a
patient, and a patient signed into their own account cannot open anybody's.

---

<a id="step-8"></a>

### Step 8 — Doctor availability

**Goal.** When each doctor sits, in which room, for how long a slot — with conflicts refused at the point of
entry rather than discovered at the counter.

**Deliverables.**

```
app/(dashboard)/admin/availability/page.tsx · page-search-params.ts · loading.tsx · new/page.tsx
app/(dashboard)/doctor/availability/page.tsx · loading.tsx
lib/services/availability.service.ts
components/availability/    actions.ts · availability.types.ts · availability-screen
                            availability-week-view · availability-grid-cell · availability-filters
                            availability-empty · slot-create.form · slot-fields
                            slot-edit.dialog · slot-delete.dialog · conflict-notice
                            doctor-availability-screen · index.ts
constants/codes-availability.const.ts
lib/utils/availability.utils.ts     overlap detection, slot expansion
```

**Notes.**

- **Two conflicts, not one.** A doctor cannot be in two places at once, and a room cannot hold two doctors at
  once. Both are checked, both name what they collide with, and both are checked in the service — a
  client-side check is a convenience, never the enforcement.
- Overlap is `startA < endB && startB < endA` on the zero-padded `HH:mm` strings from step 3b. No date
  arithmetic, no timezone in the comparison.
- An availability block expands into bookable slots of `slotMinutes`. **The expansion is a pure function in
  `lib/utils`,** so the booking screen in step 9 and the availability screen here cannot disagree about how
  many slots a block holds.
- `effectiveFrom` / `effectiveTo` exist because a doctor's sitting hours change and last month's appointments
  must still render against the hours they were booked under. A change is a new block, not an edit of history.
- The week view is a per-day agenda rather than a time-of-day grid: empty hour rows waste height and a grid is
  unreadable on a phone, which is where a doctor actually checks this.

**Acceptance.** An administrator publishes a doctor's week; a block that overlaps the same doctor's existing
block is refused, naming it; a block that puts two doctors in one room at one time is refused, naming both;
the doctor sees their own week read-only; a block ending before it starts is refused by the schema, not the
service.

---

<a id="step-9"></a>

### Step 9 — Appointments and queue management

**Goal.** Booking against real availability, and a queue that tells everyone in the building who is next.

**Deliverables.**

```
app/(dashboard)/admin/appointments/page.tsx · page-search-params.ts · loading.tsx · new/page.tsx
app/(dashboard)/doctor/appointments/page.tsx · loading.tsx
app/(dashboard)/doctor/queue/page.tsx · loading.tsx
app/(dashboard)/nurse/queue/page.tsx · loading.tsx
lib/services/appointment.service.ts · queue.service.ts
components/appointments/    actions.ts · appointments.types.ts · appointments-screen
                            appointments-table · appointments-table-row · appointments-filters
                            appointments-empty · appointment-book.form · slot-picker
                            appointment-reschedule.dialog · appointment-cancel.dialog
                            appointment-status.badge · index.ts
components/queue/           queue-screen · queue-row · queue-empty · queue-actions · index.ts
constants/codes-appointments.const.ts
lib/utils/appointment.utils.ts
```

**Notes.**

- **A slot is bookable only if availability says it exists and no appointment already holds it.** Both checks
  are in the service, in one place, and the booking action re-checks at write time — the picker showing a slot
  is not permission to take it.
- Double-booking is the failure this step exists to prevent, and check-then-act cannot prevent it. The write
  goes through a unique index on `{ doctor, date, startTime }` so the second concurrent booking fails at the
  database and is reported as "that slot was just taken", not as a crash.
- Status transitions are enforced by the service: `REQUESTED → CONFIRMED → CHECKED_IN → IN_CONSULTATION →
COMPLETED`, with `CANCELLED` reachable before check-in and `NO_SHOW` only after the slot has passed. An
  illegal transition is a coded failure, not an exception.
- **The queue is derived, not stored.** It is the checked-in appointments for a doctor on a date, ordered by
  token number. A stored queue is a second source of truth that drifts the first time someone edits an
  appointment.
- The token number is assigned on check-in, atomically per doctor per date.
- The queue screen is the one place in the app that polls: a `setInterval` calling `router.refresh()` on a few
  seconds, cleared on unmount, with `aria-live="polite"` on the list. Everywhere else, freshness is a refresh
  after a mutation.
- Patients booking their own appointments arrives in [step 13](#step-13); this step books at the counter.

**Acceptance.** A booking lands on a real slot and the slot disappears from the picker; two simultaneous
bookings of one slot produce one appointment and one clear refusal; check-in assigns sequential token numbers
per doctor per day; the doctor's queue reorders as patients check in and updates without a manual reload;
cancelling after check-in is refused; an appointment cannot be booked outside the doctor's published hours.

---

<a id="step-10"></a>

### Step 10 — Encounters and medical records (EMR)

**Goal.** The consultation itself — what the patient came in with, what was found, what was decided — and the
history that makes the next consultation better than the last.

**Deliverables.**

```
app/(dashboard)/doctor/patients/page.tsx · loading.tsx
app/(dashboard)/doctor/patients/[patientId]/page.tsx · loading.tsx
app/(dashboard)/doctor/encounters/[encounterId]/page.tsx · loading.tsx
lib/services/encounter.service.ts · medical-record.service.ts
components/encounters/      actions.ts · encounters.types.ts · encounter-screen
                            encounter-form · encounter-vitals-panel · encounter-diagnosis.fields
                            encounter-notes.fields · encounter-timeline · encounter-timeline-row
                            encounters-empty · index.ts
components/patients/patient-clinical-summary.tsx
constants/codes-encounters.const.ts
lib/utils/encounter.utils.ts · vitals.utils.ts
```

**Notes.**

- An encounter is opened from an appointment in `CHECKED_IN` and moves it to `IN_CONSULTATION`; completing the
  encounter completes the appointment. **One transition, one place** — the encounter service owns it, the
  appointment service exposes it.
- **An encounter is append-mostly.** A doctor may edit their own notes while the encounter is open; once
  completed, a correction is a new dated addendum, not an overwrite. A medical record that can be silently
  rewritten is not a record.
- The timeline on the patient detail page is the whole point of the module: past encounters, their diagnoses,
  and the prescriptions and reports that hang off them, newest first. It is read by doctors and nurses and,
  from step 13, by the patient — three audiences, three scopes, one service method that takes the requester.
- **Access is by relationship, not by role alone.** A doctor sees the patients they have encounters or
  appointments with, plus any patient they open by MRN from a booking — and every such open is recorded from
  [step 21a](#step-21a). "Every doctor sees every patient" is the easy rule and the wrong one.
- Vitals are read-only here; step 14 writes them.
- A follow-up date set here is what step 18 turns into a reminder.

**Acceptance.** A doctor opens a checked-in appointment, records a complaint, examination, diagnosis and
notes, and completes it; the appointment and queue update accordingly; the patient's timeline shows the new
encounter above the old ones; editing a completed encounter is refused and an addendum is offered instead; a
doctor with no relationship to a patient cannot open their timeline by guessing the URL.

---

<a id="step-11"></a>

### Step 11 — Digital prescriptions

**Goal.** A prescription written once, readable by the patient and the pharmacy, and impossible to lose.

**Deliverables.**

```
app/(dashboard)/doctor/prescriptions/page.tsx · loading.tsx
app/(dashboard)/doctor/prescriptions/[prescriptionId]/page.tsx
app/(dashboard)/doctor/prescriptions/[prescriptionId]/print/page.tsx
lib/services/prescription.service.ts
components/prescriptions/   actions.ts · prescriptions.types.ts · prescription-screen
                            prescription-form · prescription-item.fields · prescription-item-row
                            prescription-preview · prescription-print-sheet
                            prescriptions-list · prescriptions-empty · index.ts
constants/codes-prescriptions.const.ts · prescription.const.ts
lib/utils/prescription.utils.ts     dose formatting, duration expansion
```

**Notes.**

- A prescription belongs to an encounter, which belongs to a patient and a doctor. There is no free-floating
  prescription; that is what keeps it attributable.
- An item is drug, strength, dose, frequency, duration and instructions — six fields, all validated, with
  frequency from a closed list so `1+0+1` and `twice daily` do not both appear in the same system.
- **No drug database ships.** The drug name is a validated free-text field. Interaction checking and a
  formulary are real features that need a licensed dataset, and a half-built one that misses an interaction is
  worse than none. Logged in [Backlog](#backlog).
- Printing is a **route with print styles**, not a generated PDF: no binary dependency, no font embedding, and
  the browser's own print dialog is what a clinic already uses. The print sheet carries the hospital header,
  the patient's name and MRN, the doctor's name and registration number, and the date.
- Once issued, a prescription is immutable. A change is a new prescription that supersedes it, and both stay
  on the timeline.

**Acceptance.** A doctor issues a prescription from an open encounter; it appears on the patient's timeline
immediately; the print view renders on one page with the header, both identities and every item; editing an
issued prescription is refused; a prescription cannot be issued against another doctor's encounter.

---

<a id="step-12"></a>

### Step 12 — Diagnostics: lab orders and reports

**Goal.** A doctor orders tests, the lab performs them and uploads the result, and the result lands on the
doctor's and the patient's screens without anyone carrying paper.

**Deliverables.**

```
app/(dashboard)/doctor/lab-orders/page.tsx · loading.tsx · new/page.tsx
app/(dashboard)/lab/orders/page.tsx · page-search-params.ts · loading.tsx
app/(dashboard)/lab/reports/page.tsx · loading.tsx · new/page.tsx
app/api/lab-reports/upload/route.ts
app/api/lab-reports/[id]/route.ts · [id]/download/route.ts · [id]/view/route.ts
lib/storage/gridfs.storage.ts · storage.types.ts · index.ts
lib/services/lab-order.service.ts · lab-report.service.ts · storage.guard.ts
lib/schemas/lab-report-upload.schema.ts
components/lab/             actions.ts · lab.types.ts · lab-orders-screen · lab-order-row
                            lab-order-create.form · lab-order-test.fields · lab-orders-empty
                            lab-report-upload.form · lab-report-row · lab-reports-list
                            lab-report-viewer · lab-status.badge · index.ts
constants/codes-lab.const.ts · storage.const.ts
lib/utils/file-signature.utils.ts · lab.utils.ts
```

**Notes.**

- **Bytes go through a route handler, never a Server Action.** Actions are for typed values; a multi-megabyte
  upload and a streamed download belong on a route with its own limits and its own status codes.
- Files live in **GridFS, not `public/uploads/`**. A writable public directory silently fails on a read-only
  filesystem, and a report served from a public path is a report anyone with the URL can read. Every download
  goes through a handler that checks who is asking.
- **The type check is the magic number, not the extension and not the `Content-Type` header.** Both of those
  are supplied by the caller. Allowed: PDF, JPEG, PNG, WebP. Anything else is refused before a byte is
  written.
- A report is served `inline` only for types that cannot execute, and always with
  `Content-Disposition` naming the file and `X-Content-Type-Options: nosniff`.
- **A result is released, not merely uploaded.** A lab report has a verifying user and a release timestamp;
  until it is released, the doctor sees "in progress" and the patient sees nothing. An unverified result
  reaching a patient is the failure this step is designed around.
- Order status runs `ORDERED → COLLECTED → IN_PROGRESS → REPORTED → RELEASED`, with `CANCELLED` reachable
  before collection.
- Upload failures compensate: if the record write fails after the bytes land, the bytes are deleted.
- Adds `sharp` for image handling.

**Acceptance.** A doctor orders three tests; the lab sees the order, uploads a PDF and releases it; the doctor
opens it inline and downloads it; a patient sees only their own released reports and gets a 404 — not a 403 —
for another patient's report id; a renamed `.exe` is refused by the signature check; an unreleased report is
invisible to the patient; a failed record write leaves no orphaned bytes in GridFS.

---

<a id="step-13"></a>

### Step 13 — Patient portal

**Goal.** Everything a patient is entitled to see, and nothing else — plus the one thing they can do:
book an appointment.

**Deliverables.**

```
app/(dashboard)/patient/page.tsx · loading.tsx
app/(dashboard)/patient/appointments/page.tsx · loading.tsx · new/page.tsx
app/(dashboard)/patient/records/page.tsx · loading.tsx
app/(dashboard)/patient/prescriptions/page.tsx · loading.tsx
app/(dashboard)/patient/reports/page.tsx · loading.tsx
app/(dashboard)/patient/doctors/page.tsx · loading.tsx
lib/services/patient-portal.service.ts
components/patient/         patient.types.ts · patient-dashboard · patient-appointments-list
                            patient-appointment-card · patient-record-timeline
                            patient-prescription-row · patient-report-row · doctor-directory
                            doctor-profile-card · patient-empty · index.ts
components/appointments/patient-book.form.tsx
constants/codes-portal.const.ts
```

**Notes.**

- **Every query is scoped from the session, never from a parameter.** There is no `?patientId=` anywhere in
  this area. `PatientPortalService` takes the requester and resolves the patient record from it; a method that
  accepts a patient id from the client does not exist in this service.
- The portal is read-only except for booking, rescheduling and cancelling the patient's **own** appointments.
  It reuses step 9's slot picker and step 9's service — the rules do not fork by who is booking.
- A patient sees released reports, issued prescriptions and completed encounters. **Open encounters and
  unreleased results are invisible** — a diagnosis in progress is not a finding.
- The doctor directory publishes name, department, specialization, designation and sitting hours. It publishes
  no personal contact detail and no patient list.
- Wrong-owner access returns **404, not 403** — confirming that a record exists is itself a disclosure when
  the record is a person's medical file.
- The dashboard shows the next appointment, the newest report, the newest prescription and any active
  reminder. Nothing on it is a number without a name.

**Acceptance.** A patient signs in and sees only their own records; every list is empty for a second patient
with no history; booking from the portal takes a real slot and shows up in the doctor's list; another
patient's prescription id, report id and encounter id each return 404; an unreleased report is absent; the
patient area has no route that accepts an identifier from the query string.

---

<a id="step-14"></a>

### Step 14 — Nurse workspace: triage and vitals

**Goal.** The first five minutes of a visit — check-in, vitals, triage priority — done by the person who
actually does them.

**Deliverables.**

```
app/(dashboard)/nurse/page.tsx · loading.tsx
app/(dashboard)/nurse/patients/page.tsx · loading.tsx
app/(dashboard)/nurse/vitals/[appointmentId]/page.tsx
lib/services/vitals.service.ts · triage.service.ts
components/vitals/          actions.ts · vitals.types.ts · vitals-form · vitals-fields
                            vitals-summary · vitals-history · vitals-empty
                            triage-priority.badge · triage-select · index.ts
constants/codes-vitals.const.ts · vitals.const.ts
lib/utils/vitals.utils.ts   ranges, BMI, out-of-range flagging
```

**Notes.**

- Vitals are blood pressure, pulse, temperature, respiratory rate, oxygen saturation, weight and height, each
  with a plausible range enforced by the schema. A typo that records a temperature of 986 is caught at
  validation, not noticed by a doctor later.
- **Out-of-range is flagged, never diagnosed.** The UI marks a reading outside the reference range and says
  nothing about what it means. Ranges live in `constants/vitals.const.ts` with their source noted, and they are
  adult ranges — the paediatric case is [Backlog](#backlog), and the app says so rather than quietly applying
  the wrong band.
- Triage priority is `ROUTINE` · `URGENT` · `EMERGENCY`, and it reorders the queue ahead of token order.
  Setting it is a nurse action and it is recorded with who set it.
- A nurse writes vitals and triage; a nurse **cannot** write a diagnosis, a prescription or a lab order, and
  the service refuses it rather than the screen hiding the button.
- Vitals attach to the appointment before the encounter exists, and the encounter reads them. That ordering is
  why vitals are embedded on the encounter as a value object with their own recorder and timestamp.

**Acceptance.** A nurse checks a patient in, records vitals and sets a triage priority; the doctor's encounter
screen shows those vitals without re-entry; an emergency priority moves the patient up the queue; a
temperature of 986 is refused; a nurse attempting to write a diagnosis through a hand-built request is refused
by the service.

---

<a id="step-15"></a>

### Step 15 — Accounts: self-registration and email verification

**Goal.** A patient registers themselves, proves their address, and is handed the record reception may already
have created for them.

**Deliverables.**

```
app/(auth)/register/page.tsx · registration-received/page.tsx
app/(auth)/verify-email/page.tsx · resend-confirmation/page.tsx
app/(auth)/forgot-password/page.tsx · reset-password/page.tsx
lib/mail/index.ts · smtp.mail.ts · log.mail.ts · mail.templates.ts · mail.types.ts
lib/services/registration.service.ts · token.hash.ts
lib/schemas/registration.schema.ts · verification-token.schema.ts · password-reset.schema.ts
components/auth/            register-patient.form · registration.actions.ts
                            email-verification · resend-confirmation.form
                            forgot-password.form · reset-password.form · register.types.ts
env/server.ts               gains SMTP_* and MAIL_TRANSPORT
constants/codes-registration.const.ts
```

**Notes.**

- **The transport is swappable and the default is a log.** `MAIL_TRANSPORT=log` writes the message and its
  link to the logger so the whole flow is testable with no mail server; `smtp` sends it. The interface is one
  function; both implementations satisfy it.
- Verification tokens are **stored hashed**, single-use and short-lived. A token in a database dump is not a
  usable token.
- A registration whose email matches a record reception already created **claims that record** rather than
  creating a second patient. Duplicate patient records are the classic failure of this workflow, and the MRN
  from step 7 is what makes claiming possible.
- A self-registered account is not approved on arrival. An account signs in only when its address is verified
  **and** the hospital has approved it — two conditions, checked in that order.
- The reference deliberately reveals whether an email is registered on the resend and forgot-password screens.
  **This project does not**: those screens report the same "if that address is registered, a link is on its
  way" either way. In a hospital, confirming an address is registered confirms that a person is a patient.
- Registration and resend are rate-limited by caller; the limiter itself lands in [step 21a](#step-21a) and
  this step calls into it.
- Adds `nodemailer`.

**Acceptance.** A patient registers, receives a link, verifies, waits for approval and then signs in; the
link works once and not twice; an expired link offers a resend; registering with an address reception already
holds claims that record and issues no second MRN; neither the resend nor the forgot-password screen
distinguishes a registered address from an unregistered one; with `MAIL_TRANSPORT=log` the whole flow
completes using the link from the log.

---

<a id="step-16"></a>

### Step 16 — Profiles

**Goal.** The four things a person may change about themselves, and the one that needs proof.

**Deliverables.**

```
app/(dashboard)/profile/page.tsx · loading.tsx
app/(auth)/verify-email-change/page.tsx
components/profile/         actions.ts · profile.types.ts · profile-summary
                            profile-edit.form · change-password.form · profile-identity
                            profile-emergency-contact.form · index.ts
lib/services/profile.service.ts
lib/schemas/profile-update.schema.ts
constants/codes-profile.const.ts
```

**Notes.**

- One route, every role, outside the role areas. What it shows differs by role; where it lives does not.
- Name, phone, gender and date of birth are editable. **Role, approval, MRN and registration number are
  not** — those are the hospital's record of you, not your description of yourself.
- A patient may edit their own emergency contact and address. They may **not** edit allergies, conditions or
  blood group: those are clinical entries, and a patient-supplied allergy that overwrites a clinician's is a
  patient-safety problem, not a convenience. Patient-reported information gets its own field in
  [Backlog](#backlog).
- **Changing an email address is not in force until its link is followed.** The pending address is stored
  separately and the session keeps the old one until confirmation.
- Because the session token is self-contained, editing your own profile **re-issues the cookie** — so the name
  in the topbar is the name you just saved. The address in it comes from the stored record, not the form.
- A password change requires the current password and ends every other consideration: it does not reveal
  whether the account exists, because you are already signed in.

**Acceptance.** Each role edits their own name and phone and sees the topbar update without signing out; an
email change sends a link and does not take effect until it is followed; the old address still works for
sign-in until then; a patient cannot edit their allergies or their MRN through the form or through a
hand-built request; a wrong current password refuses the change.

---

<a id="step-17"></a>

### Step 17 — Notices and announcements

**Goal.** The hospital tells people things — everyone, or just the staff, or just the patients.

**Deliverables.**

```
app/(dashboard)/admin/notices/page.tsx · new/page.tsx
app/(dashboard)/{doctor,nurse,lab,patient}/notices/page.tsx
app/api/notices/route.ts · [id]/route.ts · [id]/image/route.ts
models/notice.model.ts      title · body · image · audience · publishedBy · publishedAt
types/notice.dto.ts · notice-audience.ts · notice-category.ts
lib/services/notice.service.ts
components/notices/         notices.types.ts · notice-card · notice-badge · notice-list
                            notice-create.form · notice-edit-button · notice-delete-button
                            notices-empty · index.ts
components/dashboard/dashboard-notices.tsx
constants/codes-notices.const.ts · notice.const.ts
```

**Notes.**

- Audience is `EVERYONE` · `STAFF` · `PATIENTS` · a single department. Targeting is applied in the service, not
  by hiding a card the query already returned.
- Categories are `GENERAL` · `EMERGENCY` · `SERVICE` — an emergency notice pins to the top of every targeted
  dashboard and carries the `destructive` treatment. It is the only notice that does.
- **Notice images go through a route handler**, are magic-number checked, and are served with `nosniff`. The
  same discipline as lab reports, for the same reason: an image is bytes a stranger supplied.
- A notice is not clinical and carries no patient identity. The service refuses a body that contains an MRN
  pattern — a small guard against the most likely accidental disclosure in the whole app.
- The dashboard feed renders a failure banner, not an empty state, when the query fails.

**Acceptance.** An administrator publishes a notice to patients and it appears on patient dashboards and on no
staff dashboard; a department-targeted notice reaches only that department; an emergency notice pins and is
styled distinctly; an image uploads, renders and is refused when it is not really an image; a notice body
containing an MRN is refused.

---

<a id="step-18"></a>

### Step 18 — Notifications, reminders and alerts

**Goal.** The system reaches out — appointment reminders, result-ready messages, follow-up nudges — and keeps
a record of what it sent.

**Deliverables.**

```
models/notification.model.ts    recipient · channel · kind · subject · body · status
                                scheduledFor · sentAt · readAt · relatedTo
types/notification.dto.ts · notification-channel.ts · notification-kind.ts
lib/notify/index.ts · email.channel.ts · sms.channel.ts · log.channel.ts · notify.types.ts
lib/notify/notify.templates.ts
lib/services/notification.service.ts · reminder.service.ts
app/(dashboard)/{role}/notifications/page.tsx · loading.tsx
components/notifications/   actions.ts · notifications.types.ts · notification-list
                            notification-row · notification-bell · notifications-empty · index.ts
scripts/run-reminders.ts    the scheduled sweep
env/server.ts               gains SMS_TRANSPORT and SMS_* credentials
constants/codes-notifications.const.ts · notification.const.ts
```

**Notes.**

- **Every notification is a record first and a message second.** It is written, then dispatched; a failed
  dispatch leaves a `FAILED` row with a reason rather than vanishing. That row is also what the in-app bell
  reads, so the in-app channel is free.
- Channels are `IN_APP` · `EMAIL` · `SMS`. Email reuses step 15's transport. **SMS ships with a logging
  implementation** behind the same interface — the call sites and the records are real, the wire is not,
  until a provider is supplied. Nothing in the UI claims an SMS was delivered when the transport was a log.
- Kinds: appointment confirmed, appointment reminder, appointment cancelled, result released, follow-up due,
  emergency notice.
- **Reminders are a sweep, not a timer.** `scripts/run-reminders.ts` is idempotent, finds appointments in the
  window that have no reminder row yet, and writes one — so running it twice sends one message and missing a
  run sends it late rather than never. It runs under cron or PM2; there is no in-process scheduler, because
  a serverless instance is not alive when the reminder is due.
- **No clinical content in an outbound message.** "Your result is ready, sign in to view it" — never the
  result. An email is not a private channel and an SMS certainly is not.
- Emergency alerts are the one notification that fans out to a role rather than a person, and they reuse
  step 17's audience targeting rather than inventing a second one.

**Acceptance.** Booking an appointment writes a confirmation notification and the patient sees it in-app; the
reminder sweep run twice for the same day produces one reminder per appointment; releasing a lab report
notifies the patient without naming the test result; a failed email leaves a `FAILED` row carrying the reason;
with both transports set to log, every path completes and is inspectable in the log.

---

<a id="step-19"></a>

### Step 19 — Billing and payments

**Goal.** What a visit cost, what was paid, and what is still owed — for the counter and for the patient.

**Deliverables.**

```
models/invoice.model.ts     patient · encounter · lines[] · subtotal · discount · tax · total
                            paid · status · issuedAt · issuedBy
models/payment.model.ts     invoice · amount · method · reference · receivedBy · receivedAt
types/invoice.dto.ts · payment.dto.ts · invoice-status.ts · payment-method.ts
lib/services/invoice.service.ts · payment.service.ts
lib/billing/index.ts · manual.gateway.ts · gateway.types.ts
app/(dashboard)/admin/invoices/page.tsx · page-search-params.ts · loading.tsx · new/page.tsx
app/(dashboard)/admin/invoices/[invoiceId]/page.tsx · [invoiceId]/print/page.tsx
app/(dashboard)/patient/invoices/page.tsx · loading.tsx
components/billing/         actions.ts · billing.types.ts · invoices-screen · invoices-table
                            invoices-table-row · invoices-filters · invoices-empty
                            invoice-create.form · invoice-line.fields · invoice-detail
                            invoice-print-sheet · payment-record.dialog · payment-history
                            invoice-status.badge · index.ts
constants/codes-billing.const.ts · billing.const.ts
lib/utils/money.utils.ts · invoice.utils.ts
```

**Notes.**

- **Money is integer minor units everywhere** — in the model, in the DTO, in the form state. Formatting to a
  decimal string happens once, in `money.utils.ts`, at the edge. No float ever touches a total.
- An invoice line **snapshots** the service code, name and unit price at issue time. The catalogue may change;
  a bill that was already handed to someone may not.
- Totals are computed in the service from the lines, never accepted from the client. The form shows a total;
  the server calculates one; if they disagree, the server wins and says so.
- Status is `DRAFT` · `UNPAID` · `PARTIAL` · `PAID` · `VOID`, derived from payments rather than set by hand —
  except `VOID`, which is a deliberate act with a reason and never a delete.
- **The gateway is an interface with one implementation.** `manual` records a payment taken at the counter:
  amount, method, reference, who received it. A real provider is a second implementation plus a webhook route;
  the service does not change. See [Decisions](#decisions).
- A patient sees their own invoices and their payment history, read-only. They cannot pay online in this
  build, and the screen says so rather than showing a dead button.
- Refunds are [Backlog](#backlog) — a refund is not a negative payment, it is a decision with a policy behind
  it.

**Acceptance.** An invoice is raised from a completed encounter with a consultation line and a lab line, both
priced from the catalogue; a part payment moves it to `PARTIAL` and a second payment to `PAID`; a client
sending a tampered total gets the server's; the print sheet renders with the hospital header, the patient's
name and MRN, every line and the balance; a voided invoice keeps its history; the patient sees their own
invoices and nobody else's.

---

<a id="step-20"></a>

### Step 20 — Analytics and reporting

**Goal.** What the administration needs to run the place — and only numbers the data can actually support.

**Deliverables.**

```
app/(dashboard)/admin/analytics/page.tsx · page-search-params.ts · loading.tsx
lib/services/analytics.service.ts
components/analytics/       analytics.types.ts · analytics-screen · analytics-filters
                            metric-tile · metric-row · trend-chart · breakdown-table
                            analytics-empty · index.ts
constants/analytics.const.ts · codes-analytics.const.ts
lib/utils/analytics.utils.ts
```

**Notes.**

- The metrics that matter and can be computed honestly: appointments by status over a date range, attendance
  versus no-show rate, average wait between check-in and consultation, consultations per doctor and per
  department, lab turnaround from order to release, revenue billed versus collected, new patient registrations.
- **Every figure is aggregated in MongoDB, not in Node.** A page that pulls every appointment into memory to
  count them stops working the month it matters.
- **Aggregates only — no screen in this step names a patient.** Analytics is where clinical data most easily
  leaks as a convenience, and a "recent patients" list here would be exactly that.
- Charts are drawn with plain SVG against the design tokens. No charting dependency: four chart shapes do not
  justify the bundle, and a token-styled SVG matches the rest of the app in dark mode without configuration.
- The date range lives in the URL through `nuqs`, so a figure can be linked to.
- Every tile states its window and its denominator. A number without a period is not a metric.

**Acceptance.** Each metric matches a figure computed independently against the same seeded data; the date
range changes every tile and survives a reload; no query loads more than it aggregates; the charts are legible
in both themes and at 375px; no patient name or MRN appears anywhere on the screen.

---

<a id="step-21a"></a>

### Step 21a — Hardening

**Goal.** Close the gaps that only show up when someone is trying — and record who read what.

**Deliverables.**

```
models/rate-limit.model.ts      hashed key · hits · window, swept by a TTL index
models/audit-log.model.ts       actor · action · entity · entityId · at · ip · outcome
lib/services/rate-limit.guard.ts · audit.service.ts
lib/utils/caller.utils.ts       the caller identity behind a proxy
constants/rate-limit.const.ts · codes-audit.const.ts
app/(dashboard)/admin/audit/page.tsx · page-search-params.ts · loading.tsx
components/audit/               audit.types.ts · audit-screen · audit-table · audit-table-row
                                audit-filters · audit-empty · index.ts
```

**Notes.**

- Rate limits on sign-in (keyed on the identifier, counting **failures** rather than attempts), registration
  and confirmation resend (keyed on the caller), and file upload (keyed on the session).
- **The caller is read from `x-forwarded-for`, which is only trustworthy if the proxy sets it.** On Vercel the
  platform sets it and a client cannot override it; behind nginx it is whatever the config says, and with no
  config it is whatever the client typed. The README says this out loud and gives the one nginx line. The
  endpoints are not left bare either way: registration is still bounded by email uniqueness and the resend by
  a per-account cooldown.
- **The access trail records reads, not just writes.** Opening a patient record, a lab report, an encounter or
  a prescription is an audited event with the actor, the target and the outcome. This is the step the
  `User`/`Patient` split in [Decisions](#decisions) was drawn for, and it is what makes "which doctor opened
  this file" answerable.
- The audit log is **append-only and unexported** — no screen deletes from it, and it is visible to
  administrators only, filtered by actor, entity and date.
- Known and deliberately left: the session JWT is self-contained, so **deleting or deactivating a user does
  not end a session already in progress**. Deactivation takes effect at the next sign-in. Closing the gap
  needs a session version on the user record and a lookup per request, which reverses step 4's decision and is
  its own step. Logged in [Backlog](#backlog).
- A security pass over every route handler and every action: same-origin guard, ownership check, `unknown`
  argument, no identifier read from a query string in a clinical area.

**Acceptance.** Six wrong passwords lock the identifier for the window and a correct one before the limit does
not; the limiter survives a restart because the counter is in the database; opening a patient record writes an
audit row naming the actor and the patient; the audit screen filters by actor and date; a TTL index sweeps
expired limiter rows; a hand-built request that skips the UI hits the same refusal the UI would have shown.

---

<a id="step-21b"></a>

### Step 21b — Polish

**Goal.** The pass that makes it feel finished — loading, empty, error, contrast, keyboard, and the theme
toggle.

**Deliverables.**

```
app/**/loading.tsx              content-shaped skeletons for every list and detail route
components/shared/              theme-provider · theme-selector · loading-shapes · toaster
components/ui/                  empty-state · page-header · form-message adoption pass
constants/theme.const.ts
app/globals.css                 prefers-reduced-motion block, focus-visible sweep
```

**Notes.**

- **Skeletons are content-shaped**, not a grey block: a table skeleton has the table's columns, a detail
  skeleton has the detail's rows. A skeleton that does not match what arrives is a layout shift with extra
  steps.
- The theme is read from a cookie **on the server** and the class ships on `<html>` from the first byte — no
  blocking script, no flash. A three-way toggle writes the cookie: light, dark, or match the device.
- The accessibility sweep, in one pass rather than scattered: `aria-describedby` on every field that has an
  error sentence, an accessible name on every select trigger, links that announce as links rather than
  buttons, `sr-only` labels inside definition lists, `aria-live` on the queue and the upload panel.
- Contrast is re-measured, not assumed — every token pair used for text, and the focus ring at 3:1.
- The failure banner and the empty state are made consistent across all screens: one treatment for
  `role="alert"`, one for `role="status"`, one empty state component actually adopted rather than hand-rolled
  per screen.
- Every list screen adopts `PageHeader` and `EmptyState` instead of its own header row.

**Acceptance.** Every route has a skeleton that matches the screen it precedes; the theme survives a reload
with no flash and no layout shift; a screen reader announces field errors, select names and the queue updates;
every text token pair clears WCAG AA and the focus ring clears 3:1; `prefers-reduced-motion` neutralizes every
animation.

---

<a id="step-22"></a>

### Step 22 — Testing and deployment

**Goal.** Ship it, repeatably.

**Scope.**

- Verification scripts over the critical paths, in the reference's style — a script per service that exercises
  it against a real database and cleans up after itself: `verify:users`, `verify:patients`,
  `verify:availability`, `verify:appointments`, `verify:encounters`, `verify:lab`, `verify:billing`,
  `verify:notifications`, `verify:rate-limit`.
- Smoke tests over the flows that cross services: register → verify → approve → book → check in → vitals →
  consult → prescribe → order test → release result → invoice → pay.
- A seed script for a demo hospital: a super administrator, an administrator, three doctors across two
  departments, two nurses, one lab account, twenty patients, a week of availability and a day of appointments.
- Production environment checklist — `MONGODB_URI` at a real cluster, `AUTH_SECRET` freshly generated,
  `APP_BASE_URL` at the real domain, `ROBOTS_ENABLED=true`, `MAIL_TRANSPORT=smtp` with credentials that work.
- `npm run build:linux` + `ecosystem.config.js` under PM2, with the reverse proxy setting
  `X-Forwarded-For` — without which [step 21a](#step-21a)'s caller limits are a formality.
- The reminder sweep scheduled, and verified to run.
- README deployment section verified against an actual deploy.

**Acceptance.** A clean clone reaches a running production build with only `.env.local` supplied; every verify
script passes against it; the full smoke path completes end to end on the deployed instance; the reminder
sweep fires on schedule and is idempotent across two runs.

---

<a id="step-23"></a>

### Step 23 — Documentation and handover

**Goal.** The written deliverables the proposal's Phase 8 asks for, accurate against what was actually built.

**Scope.**

- **README.md** finished to the reference's shape: overview, roles matrix, tech stack, getting started,
  environment table, scripts table, project structure, conventions, design system, SEO, data layer,
  authentication, roadmap, toolchain notes, deployment. Written last so it describes the app that exists.
- **docs/project-overview.html** — a standalone visual walkthrough with no dependencies: request lifecycle,
  how a write travels through the layers, the data model, the clinical workflow end to end, and build
  progress. Open it in a browser.
- **An ERD** generated from the models as they finally are, not as step 3 imagined them.
- The final report and presentation material the proposal names, drawn from these two documents rather than
  written separately — anything maintained twice diverges.
- This plan's status table completed, with every deviation recorded under its step.

**Acceptance.** Someone who has never seen the repository can clone it, follow the README, and reach a running
instance with a seeded demo hospital; `project-overview.html` opens offline and describes the system that was
built; every claim in both documents is true of the code on the day it ships.

---

<a id="step-24"></a>

### Step 24 — Inpatient admissions and bed management

**Goal.** Patients who stay — admission, a bed, a ward round, and a discharge that produces a bill.

**Why it is its own step.** Everything up to here is outpatient: a visit begins and ends the same day, and an
encounter is a point in time. An admission is a **period** with a bed occupied for its duration, daily
charges accruing, and a discharge summary at the end. That is a different shape of record and a different
billing model, not a status on an appointment.

**Scope.**

- A `Ward` and `Bed` model, with occupancy that cannot double-book — the same unique-index discipline
  [step 9](#step-9) uses for slots.
- An `Admission` record: patient, admitting doctor, ward, bed, admitted at, expected stay, status, discharged
  at, discharge summary.
- Daily bed charges accruing onto the admission's invoice, so a discharge produces a final bill rather than a
  manual reconstruction.
- A ward-round view for doctors and nurses: the beds they are responsible for, today's vitals, today's notes.
- Bed availability on the admin dashboard, because "is there a bed" is the question that gets asked by phone.

**New surface.** `Ward` / `Bed` / `Admission` models; an `AdmissionService`; `/admin/wards`, `/admin/beds`,
`/doctor/rounds`, `/nurse/rounds`; an admission flow from an encounter; a discharge flow that closes the
admission, finalizes the invoice and writes the summary.

**Acceptance.** A patient is admitted to a free bed and that bed is unavailable to a second admission; daily
charges accrue for each night; discharge produces a final invoice with the bed lines and a discharge summary on
the patient's timeline; the ward round view shows only the beds the signed-in clinician is responsible for.

---

<a id="step-25"></a>

### Step 25 — Teleconsultation and referrals

**Goal.** A consultation that does not happen in the building, and a record that can follow a patient to
another one.

**Why it is its own step.** Both change the trust boundary rather than adding a screen. A teleconsultation
means an appointment with no physical check-in, which the queue and the encounter both assume. A referral means
clinical data leaving the system, which every rule in this plan has so far been written to prevent — so the
substance of the step is consent and scope, not a share button.

**Scope.**

- An appointment `mode` of `IN_PERSON` or `TELE`, with the tele path skipping check-in and the queue and
  opening the encounter directly at the scheduled time.
- A meeting link held on the appointment, visible to the patient and the doctor and to nobody else, and never
  in a notification body.
- A `Referral` record: from doctor, to a named external provider, the reason, and an **explicit scope** of what
  is shared — which encounters, which reports, and nothing beyond them.
- A **patient consent** step that is recorded, timestamped and revocable, before anything is shared.
- A time-limited, single-scope access link for the receiving provider, audited on every open by
  [step 21a](#step-21a)'s trail.

**New surface.** `Referral` and `Consent` models; a `ReferralService`; a consent screen in the patient portal;
an external-access route handler with its own guard; the tele branch through appointment, queue and encounter.

**Acceptance.** A tele appointment reaches an encounter without a check-in and without taking a queue token;
a referral shares exactly the encounters and reports named in its scope and nothing else; sharing is refused
until consent is recorded; revoking consent kills the link immediately; every open of an external link is in
the audit trail.

---

## Backlog

Real, out of scope for now, and here so they are not lost:

| Item                                      | Why it is parked                                                                                                                                                        |
| ----------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Revoking a live session                   | The JWT is self-contained, so deactivation takes effect at the next sign-in. A `sessionVersion` checked per request reverses [step 4](#step-4)'s no-round-trip decision |
| ICD-10 diagnosis coding                   | Needs a licensed dataset. [Step 3b](#step-3b) ships a labelled free-text field with an optional code rather than a coding standard the app cannot validate              |
| Drug database and interaction checking    | Same reason, higher stakes: a formulary that misses an interaction is worse than none. [Step 11](#step-11) validates the field, not the drug                            |
| Paediatric vitals reference ranges        | [Step 14](#step-14) ships adult bands and says so. Age-banded ranges are a data table plus a rule, and applying the wrong band silently is the failure to avoid         |
| Patient-reported allergies and conditions | [Step 16](#step-16) refuses patient edits to clinical fields. A separate patient-reported field that a clinician confirms is the right shape, and it is its own change  |
| Online payment                            | [Step 19](#step-19) ships the gateway interface with a manual implementation. A real provider needs credentials, a merchant account and a reachable webhook             |
| Refunds                                   | Not a negative payment — a decision with a policy behind it                                                                                                             |
| Insurance and claims                      | Not in the proposal scope                                                                                                                                               |
| Pharmacy stock and dispensing             | The catalogue has a `PHARMACY` category; stock, batches and expiry are a module, not a field                                                                            |
| Multi-hospital / multi-branch             | The proposal is one facility. Departments are the seam if it ever lands; nothing scopes data by branch                                                                  |
| Real SMS delivery                         | [Step 18](#step-18) ships the interface and a logging transport. A provider is one implementation away                                                                  |
| Push notifications                        | The proposal names push; it needs a service worker, a subscription store and a key pair. Email and in-app cover the same need first                                     |
| Appointment waitlist                      | Cancellations free slots nobody is told about. Needs a notification fan-out with a claim window                                                                         |
| E2E tests (Playwright)                    | Verification scripts and smoke tests first; full E2E once the flows settle                                                                                              |
| Storybook for the UI primitives           | Worth it if the component count grows past ~25                                                                                                                          |
