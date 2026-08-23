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
| [1](#step-1)     | Foundations                             | Phase 2        | ✅ Done        |
| [2](#step-2)     | SEO, structured data, llms.txt          | Phase 2        | ✅ Done        |
| [3a](#step-3a)   | Data model — identity & directory       | Phase 2–3      | ✅ Done        |
| [3b](#step-3b)   | Data model — clinical & scheduling      | Phase 2–3      | ✅ Done        |
| [4](#step-4)     | Authentication                          | Phase 3        | ✅ Done        |
| [5](#step-5)     | Dashboard shell & RBAC                  | Phase 3        | ✅ Done        |
| [6](#step-6)     | Admin — staff accounts                  | Phase 3        | ✅ Done        |
| [6b](#step-6b)   | Admin — departments & service catalogue | Phase 3        | ✅ Done        |
| [7](#step-7)     | Patient registry & medical record no.   | Phase 3        | ✅ Done        |
| [8](#step-8)     | Doctor availability                     | Phase 3        | ✅ Done        |
| [9](#step-9)     | Appointments & queue management         | Phase 3–4      | ✅ Done        |
| [10](#step-10)   | Encounters & medical records (EMR)      | Phase 4        | ✅ Done        |
| [11](#step-11)   | Digital prescriptions                   | Phase 4        | ✅ Done        |
| [12](#step-12)   | Diagnostics — lab orders & reports      | Phase 4        | ✅ Done        |
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
- **Copy is literal English text in the JSX**, written in the component that renders it — _until a second
  consumer exists_, at which point it moves to that feature's `constants/{feature}.const.ts` beside the
  structural data. There is no `constants/copy.const.ts` and there will not be one: a single file for all text
  would recreate the indirection i18n forced without the payoff. Two constants files carry strings
  unconditionally and are precedented in the reference: `constants/app-data.const.ts` (the product's own name,
  tagline, description) and `constants/codes-*.const.ts` (server-side error messages).
  [Step 2](#step-2) is where the second-consumer clause was earned — `/llms.txt` restates the landing lists —
  and its deviations record what moved.
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
live by three real failures it caught during the pass — it is not a rule that is merely configured.

The hooks were exercised rather than assumed: `pre-commit` ran the branch check, `npm run lint` and
`npm run format` on the real commit; a message with no Conventional Commits type was refused by `commitlint`
with `type-empty`; and a commit from a branch named `Feature/BadName` was aborted before lint even started.

`pre-push` was verified later, on the first real push to `origin`: it intercepted the push, ran
`npm run build` to completion and let it through only once the build was green.

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
- **The `pre-commit` branch check reads `git symbolic-ref`, not `git rev-parse --abbrev-ref HEAD`.** The
  reference's version aborts the very first commit in a repository with `fatal: ambiguous argument 'HEAD'` —
  on an unborn branch there is no commit for `rev-parse` to resolve. `symbolic-ref --short -q` reads the ref
  `HEAD` points at whether or not anything is committed there, with `rev-parse` kept as the fallback for a
  detached HEAD. Found by hitting it, and fixed rather than worked around with `--no-verify`.
- **Verified without screenshots.** The browser pane does not composite frames in this session, so the visual
  acceptance was done by reading computed styles, resolved custom properties, the accessibility tree and
  response codes out of the live page. That is stricter than looking at it for everything except layout
  aesthetics, which remain unverified by eye.

---

<a id="step-1"></a>

### Step 1 — Foundations ✅ Done

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

**Acceptance.** ✅ Verified. `APP_BASE_URL=not-a-url npm run build` fails **before the build starts**, printing
`❌ Invalid environment variables` with `path: [ 'APP_BASE_URL' ], message: 'Invalid URL'` and pointing at
`env/server.ts`; `LOG_LEVEL=chatty` fails the same way and lists the six values it will accept. The opposite
branch was checked too: a `.env.local` copied from `.env.example` — which really does ship `MONGODB_URI=` and
`AUTH_SECRET=` blank — compiles, so `blankAsAbsent` does what it exists for.

The Result, codes and zod layers were exercised at **runtime**, not just type-checked: 26 assertions covering
every factory's shape (`emptySuccess` has no `result` key at all; `singleFailureWithErrors` nulls the result
and keeps `field`; `listFailure` returns `[]` rather than `null`; an empty errors array throws instead of
producing a failure with no reason), the five-digit code layout (`20002` validation, `50001` auth), the
encode/decode round trip **including a message that itself contains the delimiter**, and `ZodError` mapping —
two issues in, two `ErrorDto`s out, codes unpacked, `email` and the nested `contact.phone` both named, no
message still carrying `__|__`.

The logger was run in both transports: pretty and colorized in development with the context bound by
`createLoggerWithContext` and `err` serialized, single-line JSON under `NODE_ENV=production`, and
`LOG_LEVEL=debug` genuinely letting through the line that `info` suppresses.

Lint, format and build are green, and the landing page still renders in a fresh tab with **no console messages
of any level** and every request 200.

**Deviations from the plan, and why.**

- **`MONGODB_URI` and `AUTH_SECRET` ship optional, not required.** Nothing reads the database until
  [step 3a](#step-3a) and nothing signs a session until [step 4](#step-4), so a clean clone still runs with no
  `.env.local` at all. Each becomes required in the step that starts using it. This is why acceptance was
  proven with an **invalid** value and an unknown enum rather than a missing one — there is nothing mandatory
  yet to leave out.
- **`env/client.ts` ships with an empty `client: {}`.** The app has no `NEXT_PUBLIC_*` variable; the file
  exists so the first one gets declared and validated there instead of being read off `process.env`.
- **`constants/rate-limit.const.ts` landed here, not in [step 21a](#step-21a).** `withTooManyRequests()` was
  in this step's deliverables and needs a `Retry-After` value; a magic number in a response header is a value
  nobody can find later. The file holds that one constant. The limiter — windows, keys, counter collection —
  is still 21a.
- **`tsx` was installed here rather than in [step 3a](#step-3a).** It is the tool this project uses to run
  TypeScript outside Next, and without it the Result and zod layers could only be _claimed_ to work. Running
  the check was worth pulling one dev dependency forward by two steps.
- **`lib/logger.ts` exports pino directly**, with no adapter wrapper. There is no older call signature here to
  preserve, so an adapter would be indirection with nothing behind it. Call sites use pino's own API:
  `log.info({ patientId }, 'message')`.
- **`next.config.ts` gained `serverExternalPackages`.** The pino transport worker breaks when bundled, so
  `pino` (plus `pino-pretty` outside production) has to be required at runtime from `node_modules`.
- **`lib/mongodb.ts` now reads `env.MONGODB_URI`**, replacing the `process.env` seam step 0 left. Its
  `if (!uri) throw` stays for now and becomes unreachable in step 3a, when the schema makes the variable
  required — which is the point of moving the check into the schema rather than leaving it in the caller.
- **`withNotFound()` carries a clinical note.** It is also the correct answer for a record the caller may not
  read, because confirming that a medical file exists is itself a disclosure. Written down where the helper
  is, so the choice between it and `withForbidden()` is not made fresh at every call site.
- **A trap worth recording for whoever repeats the blank-value check:** in PowerShell, `$env:X = ''` _deletes_
  the variable rather than setting it empty, so that spelling tests "unset" and silently proves nothing about
  `blankAsAbsent`. The real test is a `.env.local` file with blank right-hand sides, which is also exactly
  what `cp .env.example .env.local` produces.

---

<a id="step-2"></a>

### Step 2 — SEO, structured data and llms.txt ✅ Done

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

**Acceptance.** ✅ Verified in the browser. All five routes return 200 with absolute URLs built from
`APP_BASE_URL` — `/sitemap.xml` carries one `<url>` with `<changefreq>monthly</changefreq>` and
`<priority>1</priority>`, `/llms.txt` and `/llms-full.txt` serve `text/plain; charset=utf-8` built from the
same lists the page renders, `/opengraph-image` returns `image/png`. The rendered head has an absolute
canonical, nine keywords, the full `og:` set with the 1200×630 card wired in automatically, `twitter:card`
`summary_large_image`, and **zero `hreflang` links** — which is the whole point of the no-localization delta.

The JSON-LD graph is `Organization` → `WebSite` → `SoftwareApplication`, and the `@id` cross-links were
checked rather than eyeballed: every `publisher` reference resolves to a node inside the same document.

Both branches of the robots gate were exercised by flipping the real variable and restarting: default emits
`Disallow: /` plus `noindex, nofollow`; `ROBOTS_ENABLED=true` emits `Allow: /` plus `index, follow`, with no
`Disallow` lines because nothing private exists yet.

Lint, format and build are green; the build prerenders eight routes. The landing page renders in a fresh tab
with no console messages beyond React's devtools notice — five role cards, six module cards, six stack cards,
eight roadmap rows — and no horizontal scroll at either 1265px or 375px.

**Deviations from the plan, and why.**

- **The landing page's list copy moved into `constants/home.const.ts`, and this revises a rule I set in
  [Differences](#differences-from-the-reference-project).** That section says copy is a literal in the
  component that renders it and constants hold structural data only. `/llms.txt` and `/llms-full.txt` are the
  first thing to want that copy from outside the component, and they restate all four lists. The reference
  could keep its cards inline because both readers pulled from one translation dictionary; with no dictionary,
  inline means six module descriptions maintained in two files — exactly the drift the dictionary prevented.
  **The rule is now: copy stays inline until something other than the component needs it, and then it moves to
  the feature's constants file beside the structural data it belongs with.** Prose only one place renders —
  the hero, the section headings — stayed in the components. Four list constants moved: `ROLES`, `FEATURES`,
  `TECH_STACK`, `ROADMAP_PHASES`, each `as const satisfies` its model type, and the four sections now map
  over them instead of repeating markup five times.
- **Four new type files** — `role-card.ts`, `feature-card.ts`, `tech-card.ts`, `roadmap-phase.ts` — because
  those lists now carry content and not just an icon. The visual-only `RoleVisual` / `FeatureVisual` survive
  as the half the card component actually renders.
- **`SEO.PUBLIC_ROUTES` enumerates the sitemap explicitly** rather than deriving entries from the filesystem.
  This app will grow routes that name a patient, and a self-discovering sitemap publishes one the first time
  somebody forgets to think about it.
- **`DISALLOWED_PATHS` is empty today** and that is correct, not an omission: `PROTECTED_SEGMENTS` is empty
  until [step 5](#step-5) and there is no sign-in route until [step 4](#step-4). It is derived rather than
  written out so it fills itself as those routes land. `PRIVATE_SEGMENTS` stays module-private inside
  `seo.const.ts`, as in the reference, rather than being exported from `routes.const.ts`.
- **`lib/utils/url.utils.ts` holds `buildAbsoluteUrl`**, not the reference's `buildLocaleUrl` /
  `splitLocaleFromPathname`. Both of those existed only to add and strip a `/bn` prefix. What survives is the
  slash arithmetic every metadata route would otherwise reinvent.
- **`buildJsonLdGraph` drops the `language` parameter** and hardcodes `inLanguage: 'en'`.
  `applicationCategory` is `HealthApplication`. The organization node still describes the project itself — it
  becomes a `MedicalOrganization` with address and accreditation when a real facility is named, because
  inventing clinical credentials for a crawler is worse than publishing a vague node.
- **`env/server.ts` needed no change.** `ROBOTS_ENABLED` was already declared in [step 1](#step-1), so this
  step only started reading it.
- **`/llms.txt` and `/llms-full.txt` build as dynamic (`ƒ`) routes**, not static, because they read
  `env.APP_BASE_URL` at request time. That is the same trade the reference makes and it costs nothing: they
  are cached for an hour by their own `Cache-Control`.
- **One opengraph card at the app root**, not one per locale. Its gradient is the measured sRGB of `--primary`
  and `--primary-hover` from the light palette, so the card is the same teal the app is; satori has no
  stylesheet, so those two values are repeated as literals with a comment saying where they came from.

**A note on how this was verified.** The first console read after the change showed a wall of
`Export ROLE_VISUALS doesn't exist` errors, which were **stale** — buffered in a tab from the dev-server
session that was running while `home.const.ts` had been rewritten but the sections had not. The build was
already green at that point. Re-checked in a fresh tab against the restarted server, which is the only
reading worth trusting after a server restart.

---

<a id="step-3a"></a>

### Step 3a — Data model: identity and directory ✅ Done

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

**Acceptance.** ✅ Verified against the real Atlas cluster by `npm run verify:data-model` — **51 checks, all
passing**, every fixture removed afterwards and the removal itself asserted.

What it proves, beyond the obvious: the password is a bcrypt hash and never the plaintext; `select: false`
keeps it out of an ordinary query; **re-saving an unrelated field does not double-hash an already-hashed
password**; `comparePassword` refuses rather than throwing on an account that has none. A **second super
administrator is refused by the partial unique index** while other roles are untouched. A doctor record and a
patient record are each one-per-account, and a duplicate registration number or medical record number is
refused. `userFromEntity` emits no `password`, `_id` or `__v`; `PatientSummaryDto` carries **no allergies, no
conditions, no blood group, no address and no emergency contact** — each asserted separately, because that
DTO is the one standing between a list screen and a clinical record.

The schemas were exercised for the property they are easiest to get wrong: **re-parsing a schema's own output
succeeds and changes nothing**, for both `phone` and `dateOfBirth`. A Server Action re-validates what the
browser already parsed, and a non-idempotent transform would fail on that second pass and break every save.
A future date of birth is refused _and_ reported on the `dateOfBirth` field; a fractional consultation fee is
refused; blank clinical rows are dropped rather than error-reported; and a caller supplying its own
`medicalRecordNo` has it discarded rather than honoured.

`MONGODB_URI` is now genuinely required: blanking it in `.env.local` fails the build with
`path: [ 'MONGODB_URI' ], message: 'MONGODB_URI is required'`. Both of the seed script's validation failure
paths report the offending variable by name — missing values and malformed ones separately.

**Not verified by me:** the seed script's _create_ path. Running it mints a real super administrator whose
password only I would know, so it is one command for you to run:

```bash
SEED_SUPER_ADMIN_NAME="Hospital Director" SEED_SUPER_ADMIN_EMAIL="director@hospital.example" SEED_SUPER_ADMIN_PASSWORD="…" npm run seed:super-admin
```

**Deviations from the plan, and why.**

- **`User.password` is optional.** Reception registers a patient at the counter before that person has an
  account they can open — the record exists, staff can book against it, and the patient claims it later by
  proving the address in [step 15](#step-15). That is the normal case in a hospital, not an edge case, so the
  field is optional and `comparePassword` returns false rather than letting `bcrypt.compare` throw on
  `undefined`.
- **`isEmailVerified`, not the reference's `emailVerified`.** It sits beside `isApproved` and `isActive` and
  reads as one set.
- **`constants/directory.const.ts` was added**, holding the department and doctor field limits. The plan
  itemized `roles`, `users` and `patient`; the directory entities needed the same treatment and putting their
  bounds in `users.const.ts` would have made that file about three things.
- **`lib/utils/phone.utils.ts` was added.** `userFields.phone` needs a normalizer, and the idempotence that
  normalizer guarantees is what the whole re-parse story rests on.
- **`state-change.schema.ts` collects the flag-flippers** — approve, activate, delete, department activate,
  doctor accepting — rather than one file each. They are all `{ id, boolean }`, and five files agreeing on
  one shape is five places for it to stop agreeing.
- **Only the user schemas carry encoded error codes.** Department, doctor and patient use plain messages,
  which decode to code 0 and still render. Their codes arrive with the services that raise them, in steps 6b
  and 7 — inventing a taxonomy for a service that does not exist is how a registry fills with codes nothing
  emits.
- **`scripts/verify-data-model.ts` is one script for all four models**, not four. They are created and
  verified together and the cleanup is shared; splitting them would mean four connections and four cleanups.
  Wired as `npm run verify:data-model`.
- **The verify script tags every fixture with a run-scoped suffix** and deletes by that tag. It is pointed at
  a real cluster, and a verification script that empties collections is one bad day away from being a data
  loss incident.
- **`Doctor` carries `isAcceptingPatients` separately from the account's `isActive`.** A doctor on leave has
  a live account, owns their past encounters, and simply is not taking bookings — one flag could not say both.
- **A compound index `{ department, isAcceptingPatients }` on `Doctor` is declared now**, before step 8 asks
  the query it serves. Adding an index to a collection that already has rows is a different operation from
  declaring one on an empty collection.

---

<a id="step-3b"></a>

### Step 3b — Data model: clinical and scheduling ✅ Done

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
  and so is the overlap test that step 8's conflict detection runs. **Calendar dates are `YYYY-MM-DD` strings
  for the same reason**: a day is not an instant, and the double-booking index matches on the value, so it
  must be produced by one helper rather than computed per caller.
- `Appointment.status` is a closed set: `REQUESTED` · `CONFIRMED` · `CHECKED_IN` · `IN_CONSULTATION` ·
  `COMPLETED` · `CANCELLED` · `NO_SHOW`. Which transitions are legal is a service rule, not a schema rule —
  the schema only says which values exist. Statuses live in `types/appointment-status.ts` as a `const` object
  plus a derived union, the way roles do.
- `tokenNo` is the queue position for the doctor on that date. It is assigned when the patient checks in, not
  when the appointment is booked, because a queue is about who is present.
- **A vitals reading is a value object, not a document** — embedded on the **appointment**, carrying whoever
  recorded it and when. It sits there rather than on the encounter because a nurse records it at check-in and
  the encounter is not opened until the doctor starts; the encounter reads it. A nurse in step 14 writes it;
  nothing else does.
- `LabReport.file` mirrors the reference's material shape, and `storageKey` is **absent from the DTO** — it
  describes where bytes sit on the server, and the download route resolves it after checking access.
- Diagnoses are free text plus an optional code field. No ICD dictionary is shipped; pretending to a coding
  standard the app cannot validate would be worse than a labelled free-text field. Logged in
  [Backlog](#backlog).
- Compound indexes that the queries in steps 8–12 will need are declared here, not retrofitted:
  `{ doctor, date }`, `{ patient, date }`, `{ patient, createdAt }`, `{ labOrder }`.

**Acceptance.** ✅ Verified against the real Atlas cluster by `npm run verify:clinical-model` — **60 checks,
all passing**, every fixture removed afterwards. `npm run verify:data-model` was re-run and still passes, so
step 3a did not regress.

The headline is the **double-booking index, proven rather than assumed**. A second appointment for the same
doctor, date and start time is refused with a duplicate-key error; cancelling the first **frees the slot** and
a third booking of it succeeds; and the same time on another day is not a clash. That is the partial unique
index doing exactly what it was written for, and it settled an open question — `$in` inside a
`partialFilterExpression` is accepted by this cluster, so the slot-holding status set can be expressed
directly rather than through a maintained boolean.

Also proven: `9:00` and `24:00` are both refused by the model's `HH:mm` pattern; a block ending before it
starts is refused by the `pre('validate')` hook, and so is one whose `effectiveTo` precedes its
`effectiveFrom`; an appointment without a patient or without a doctor is refused; a status, a day of the week,
a prescription frequency and a report MIME type outside their sets are each refused; **a lab report cannot be
released without a verifier**; one appointment cannot hold two encounters and one order cannot hold two
reports; a temperature of 986 is refused by the model _and_ by the schema; a blank vitals box parses to
absent rather than to zero; and `LabReportDto` carries **no `storageKey`** while still carrying the file's
name, type and size.

Lint, format and build are green.

**Deviations from the plan, and why.**

- **Vitals live on the `Appointment`, not the `Encounter`** — and this corrects a contradiction in the plan
  itself. Step 3b said vitals are embedded in the encounter; [step 14](#step-14) said a nurse records them at
  check-in and the encounter reads them; and [step 10](#step-10) says the encounter is opened from an
  appointment that is already `CHECKED_IN`. All three cannot hold: at check-in there is no encounter to embed
  anything in. The appointment is the document that exists at that moment, so the vitals hang off it and the
  encounter reads them. Step 14's description was right and step 3b's was wrong.
- **`triagePriority` ships on the appointment now**, defaulting to `routine`, even though a nurse sets it in
  step 14. The queue in [step 9](#step-9) sorts on it, and a field that two later steps both need is a data
  model decision rather than a feature one.
- **`date` is a `YYYY-MM-DD` string, not a `Date`.** The plan said "a date-only value at midnight in the
  pinned timezone". That would make every equality query depend on every caller computing the same instant the
  same way — and **the double-booking index is an equality match on this field**, so two code paths drifting
  by an hour would not collide where they must. A string produced by one helper cannot drift. It is also the
  same argument the plan already makes for storing times as `HH:mm`.
- **`Encounter` carries an `addenda` array**, which the plan did not itemize. Step 10 says a completed
  encounter is corrected by addendum rather than edit; that needs a place to put them, and inventing it in
  step 10 would mean a migration.
- **`constants/prescription.const.ts` landed here**, not in [step 11](#step-11). The model needs the closed
  frequency list to enumerate it.
- **`lib/utils/datetime.utils.ts` landed here.** It was named in the plan's localization delta but had no
  consumer until a calendar date needed producing. It holds the `Intl` formatters, `toCalendarDate`,
  `dayOfWeekFor`, the minutes/time conversions and `ageInYears` — the last computed by comparing calendar
  dates rather than dividing milliseconds, because a division gets leap years subtly wrong and a subtly wrong
  age is the difference between an adult and a pediatric reference range.
- **`LabOrder.tests` records names, not references to the priced catalogue.** `ServiceItem` arrives in
  [step 6b](#step-6b), and an order raised today should not change meaning if a service is renamed tomorrow.
  Linking an order line to a priced item is billing's job in [step 19](#step-19).
- **A second verification script**, `verify:clinical-model`, rather than extending `verify:data-model`. One
  file covering ten models is one nobody reads.
- **`vitals-record.schema.ts` and the appointment status/triage schemas** were split out rather than folded
  into the create schemas. Recording vitals, moving a status and setting triage are three different
  permissions held by three different roles; one schema for all of them would be one action for all of them.
- **The three "invalid enum" assertions go through `Document.set`, not a cast.** `npm run build` caught what
  `tsx` did not: `tsx` strips types without checking them, so a script can run green and still not compile.
  The compiler was right to refuse `'someday'` as a day and `'maybe'` as a status — casting around it would be
  the unchecked cast this project bans, so the values are written by path, which is how a request that never
  saw the types would arrive, and validation still runs on save. **Worth carrying forward: a verify script
  passing is not the same as it type-checking, and only the build tells you the difference.**

---

<a id="step-4"></a>

### Step 4 — Authentication ✅ Done

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

**Acceptance.** ✅ Verified two ways — `npm run verify:auth` (**41 checks, all passing**, fixtures removed)
and the real sign-in flow driven through the browser.

**The token half attacks its own format**, because a signature check that is never handed a bad signature has
not been tested. Refused: a tampered payload, a tampered signature, a missing signature, an **`alg: none`**
header, an expired token, a token from another issuer, a token for another audience, a token signed with a
different secret, and — correctly signed but still refused — a token carrying an unknown role or missing a
claim, which is the case the post-signature zod parse exists for. The minted token pins `HS256` in its
header, carries the issuer, audience and a one-hour expiry, and contains **no password and no clinical
field**.

**The credential half was checked for what it discloses.** An unknown address and a wrong password return the
same code _and_ the same sentence, word for word. Account state is only ever revealed after the password
matched: an unverified, unapproved or deactivated account gets its own message with the right password and a
flat `INVALID_CREDENTIALS` with a wrong one. An account with **no password at all** — a patient registered at
the counter — refuses rather than throwing, and is indistinguishable from a wrong password.

**In the browser**, signed out: all five role areas redirect, and `/admin` lands on `/sign-in?next=%2Fadmin`.
Signing in as a nurse through the real form: a wrong password shows "That email address and password do not
match" and stays put; the right one lands on `/nurse`; **every other role area redirects to `/unauthorized`,
not to sign-in**; `/unauthorized` names the role and offers the way back to `/nurse`; `/sign-in` redirects an
already-signed-in visitor to their own area; and the landing header swaps "Sign in" for "My area".
`document.cookie` is **empty throughout**, which is `httpOnly` doing its job. Signing out returns to
`/sign-in`, and `/nurse` immediately redirects again.

Lint, format and build are green; all three verify suites pass.

**Deviations from the plan, and why.**

- **Everybody signs in with their email address.** The reference issues login IDs like `S-2026-0042`; this
  project does not. A patient who comes in twice a year will not have kept an issued identifier, and a scheme
  that half the users cannot remember is a support burden pretending to be security. One field, one lookup.
- **Five role-home pages and a thin `(dashboard)` layout were pulled forward from [step 5](#step-5).** The
  step's whole subject is who may go where, and that cannot be verified against pages that do not exist. They
  are one shared `RoleAreaPlaceholder` component rather than five near-identical pages, so step 5 replaces
  them with one deletion.
- **`PROTECTED_SEGMENTS` was filled in.** It shipped empty in step 2 because nothing private existed; it now
  holds the five role segments and feeds both the proxy guard and the robots `Disallow` list, exactly as it
  was designed to.
- **No rate limiting in `verifyCredentials`.** The reference throttles by identifier before checking the
  password. That belongs with the limiter in [step 21a](#step-21a), and adding half of it here would mean a
  counter with no sweep.
- **`constants/codes-auth.const.ts` does not exist.** The plan named it; the auth codes went into
  `codes-users.const.ts` in [step 3a](#step-3a), where they sit beside the account they refuse.
- **`signOutAction` takes no arguments.** The reference threads a locale through a hidden form field; with no
  i18n there is one thing to do and no input that could change it.
- **`guards.ts` has no `redirectTo` wrapper.** The reference needs one because next-intl's `redirect` is not
  typed `never`, so it wraps it in a synchronous function ending in an unreachable `throw`. `redirect` from
  `next/navigation` **is** typed `never`, so the guards call it directly and the compiler narrows correctly.
- **`blankAsAbsent` now applies only to the three defaulted variables.** With `MONGODB_URI` and `AUTH_SECRET`
  both required, reading a blank one as absent would turn a missing secret into a confusing failure further
  down. A blank value should mean "use the default" only where there is a default.
- **`SignOutButton` and five UI primitives** (`Input`, `Label`, `PasswordInput`, `FormMessage`, `Spinner`)
  were added. The plan did not itemize them; a sign-in form and a verifiable sign-out need them.
- **`components/auth/index.ts` deliberately omits `actions.ts`.** It is a `'use server'` module, and
  re-exporting it through a barrel that client components import pulls every action into their graph. The two
  components that call one import it by relative path, with the reason written in both places.
- **The site header now reads the session**, which opts the landing page out of static generation. That is the
  right trade for a header that has to reflect who is looking at it — a crawler carries no cookie and still
  gets the signed-out version — but it is a real change to how `/` renders and is worth knowing.
- **`/unauthorized` is not in `PROTECTED_SEGMENTS`.** Its own `requireSession()` guards it, which was verified:
  a signed-out request to it redirects to sign-in rather than announcing an area the visitor cannot see.

**A note on verification.** The console read after the change showed a wall of stale errors again — buffered
in a long-lived tab across several server restarts, exactly as in [step 2](#step-2). Restarting the preview
cleared them and the real console showed only HMR reconnect noise. **Second time this has cost a re-check: a
tab that has survived a server restart is not a trustworthy console.**

**Adversarial review, and what it caught.** Because this is the security-critical step, the finished surface
was reviewed by four independent readers — one each for authorization bypass, session integrity, information
disclosure and plain correctness — and every finding was then put to three separate skeptics instructed to
refute it. Four findings survived all three, and all four are fixed:

- **A timing oracle defeated the shared refusal, and this is the one that mattered.** `verifyCredentials`
  returned early when no account was found, skipping the bcrypt comparison entirely — measured at **~0ms
  against ~220ms** for a wrong password. The identical error code and the identical sentence hide _what_ was
  wrong; they do nothing about a caller with a stopwatch, and in a hospital "does this address have an
  account" is "is this person a patient here". The comparison now runs either way, against
  `ABSENT_PASSWORD_HASH` — a real cost-12 hash of a value nothing will ever submit — and `comparePassword`
  does the same for an account that has no password yet. **Verified, not asserted:** the script now times all
  three refusals and they came back **283ms / 288ms / 284ms**.
- **`getSessionUser` ran twice per guarded request.** The dashboard layout calls `requireSession()` and the
  page then calls its own role guard, so one page view cost two `jwtVerify` calls and two database round
  trips. Next dedupes `fetch`; it does not dedupe Mongoose. It is now wrapped in React's `cache()`.
- **`types/session-user.ts` said the cookie lasts "a week".** It lasts an hour, and `auth.const.ts` argues
  for the hour in as many words two files away. A comment that contradicts the constant it describes is worse
  than no comment.
- **My own expiry assertion was flaky.** `verify-auth.ts` asserted `exp - iat === MAX_AGE`, but jose reads
  the clock twice in one builder chain, so a second boundary between them yields 3601 and fails the run at
  random. It now asserts a one-second range, because a check nobody trusts gets ignored when it matters.

Five further findings were reported and **refuted unanimously**, recorded here so they are not re-litigated:
the omission of `isEmailVerified` from the session re-check (nothing in the app can un-verify an account, and
sign-in still gates on it); the matcher excluding dotted paths (real regex reading, but there is no `app/api`
directory and no protected path contains a dot); sign-out leaving the client router cache (a cookie write
inside a Server Action already triggers Next's cache eviction); `.lean<UserEntity>()` over-typing a
projection (the four unselected fields are never read); and `/unauthorized` answering 200 while presenting
403 (`forbidden()` is experimental and unflagged in Next 16.3, and the refusal is the 307 that got you there).

---

<a id="step-5"></a>

### Step 5 — Dashboard shell & RBAC ✅ Done

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

**Acceptance.** ✅ Verified in the browser against one seeded account per role. Signed in as a doctor: the
shell renders with the sidebar, the role badge in **doctor blue**, the Overview nav entry carrying
`aria-current="page"`, the breadcrumb reading "Overview", and the account menu naming the account. **Role
isolation holds** — navigating to `/admin` as the doctor lands on `/unauthorized` ("This area is not yours"),
which offers the way back to `/doctor`; navigating to `/doctor` renders the doctor home. At 375px the sidebar
is hidden, the hamburger appears, the drawer opens with the same nav and a backdrop and an `sr-only` title,
and there is no horizontal scroll. The skip link is first in the tab order and the `<main>` carries
`id="main-content"` after it. Dark tokens resolve correctly across the shell. No console messages of any
level. Lint, format and build are green; the build prerenders the shell routes as dynamic (`ƒ`), correct for
a session-guarded surface.

**A verification note worth keeping.** A `fetch('/admin')` from the doctor's session returned **200 with the
URL unchanged**, which reads like an authorization failure — and is not. Next serves a Server Component
`redirect()` to an RSC/`fetch` request as a 200 carrying a redirect _instruction_, not a 3xx that `fetch`
follows, so `response.url` stays `/admin`. The real browser **navigation** redirects to `/unauthorized`
correctly. **`fetch` is not a trustworthy probe for a server redirect; only a navigation is.** This is the
same lesson the stale-console note keeps teaching in a different costume: verify the thing the user actually
does.

**Deviations from the plan, and why.**

- **The nav model bakes its labels in rather than taking a `labels` prop.** The reference threads translated
  strings down because of i18n; here the nav is the archetypal second-consumer case — the sidebar, the
  breadcrumb and the mobile drawer all read it — so under this project's rule the copy moves to
  `lib/utils/navigation.utils.ts` beside the structural data. `resolveNavModel(role)` returns the sections
  directly.
- **Every role's model currently holds only its Overview entry.** `typedRoutes` refuses a `<Link>` to a route
  that does not exist, and the sub-pages do not exist yet — so `NavItem.href` is typed `Route`, not `string`,
  and each entry appends to the model in the step that builds the route it points at. The sidebar is sparse
  today and correct; it is not faked full with dead links.
- **No theme selector and no language selector in the topbar.** The theme toggle is [step 21b](#step-21b);
  there is no language to select. The topbar's right side is the account menu alone, and its labels are
  literal because it has one caller.
- **`RoleAreaPlaceholder` was deleted and replaced by `RoleHome`.** The step-4 placeholder announced that the
  shell was coming; now it is here. `RoleHome` renders inside the shell — a `PageHeader` welcome, the area's
  purpose, and the capabilities each later step will turn into a real screen. **Deliberately not a wall of
  stat tiles:** numbers with no data behind them are the vanity surface the design brief warns against, so
  there are none until there is something real to count.
- **Role accent is the badge colour, not the active-nav background.** The plan said "sidebar active state and
  the role badge". The five accents were contrast-verified as _text on card_; the active nav uses the
  `sidebar-accent` token pair verified for _that_ job. Tinting the active background per role would need five
  more contrast checks for a weaker result, so the accent marks the role badge (in the sidebar block, the
  drawer block and the account menu) and the nav keeps its verified pair. Colour is still a label, just a more
  legible one.
- **`dashboard-stat.ts` and `dashboard-title-sync.tsx` were not built.** The stat tile has no honest data to
  show until a real dashboard needs it; the title-sync fixes a tab flicker that only appears with many
  client-navigated sub-routes, of which there are none yet. Both arrive with the first screen that needs
  them, rather than shipping unused now.
- **`lib/auth/admin-area.gate.ts` was built here as planned**, ahead of its first caller. [Step 6](#step-6)'s
  actions need `gateAdminArea`, and building it with the shell keeps the auth surface in one place.
- **`role.utils.ts` holds `resolveRoleLabel` and `roleAccentClassName`**, not `ROLE_HOME` — that lives in
  `routes.const.ts` where the routes are, and duplicating it here would be a second source of the same truth.
- **Five UI primitives landed** — `avatar`, `dropdown-menu`, `breadcrumb`, `page-header`, `empty-state`,
  `skeleton` — on top of step 4's set. The dropdown-menu is fuller than the account menu strictly needs,
  because [step 6](#step-6)'s table row actions use the same primitive; building it once now is cheaper than
  twice.

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

**Acceptance.** ✅ The rules — which are the substance of the step — are proven end-to-end against the real
database by `scripts/verify-user-service.ts` (`npm run verify:users`, **26 checks, all green, fixtures torn
down**). It drives `UserService` directly, because a Server Action is a public endpoint and the screen that
hid a button proves nothing about the caller: the super administrator creates an administrator and _only_ an
administrator; an ordinary administrator creates a doctor and a nurse but is refused the `admin` role and
refused editing or deactivating another administrator; a patient cannot be created here; a second super
administrator cannot be created and the seeded one cannot be edited, demoted or deleted; nobody changes their
own approval, activation or existence; the five-administrator ceiling refuses the sixth; a duplicate email —
on create and on edit — is refused with a **field-level** `email` error, not a stack trace; deleting an
account that owns a clinical record is refused (deactivate instead); and the list excludes the super
administrator while the role filter and the name search narrow correctly. Build, lint and format are green;
the build emits `/admin/users` and `/admin/users/new` as dynamic (`ƒ`). In the browser, signed in as the
super administrator, the shell renders, the sidebar carries the new **Administration → Staff accounts** entry,
and both pages are served (`200`) with the correct DOM — the list empty of the super administrator, the
create form's role locked to **Administrator** (the only role the super administrator may create).

**A verification note worth keeping.** The interactive click-through — submit → toast → `router.refresh()`,
filter-survives-reload, deactivate-then-refused-at-sign-in — **could not be exercised in this run's preview**.
The in-app browser pane could not composite (the tab stayed `document.hidden`), and React 16/19 streaming
**defers revealing a `loading.tsx` Suspense boundary while the document is hidden** — so the page under
`admin/users/loading.tsx` sat on its skeleton with the real, correct markup parked in React's `<div hidden>`,
while a sibling route with no such boundary (`/admin`) rendered fully. No external Chrome was connected to
fall back to. The wiring behind that click-through was instead confirmed by reading it: each action is the
fixed **gate → validate → delegate** wrapper over the DB-verified service, and `UsersScreen` runs every
mutation through a transition, checks `isSuccess`, then toasts and calls `router.refresh()` — the same pattern
step 4's sign-in form was verified on. The lesson is the shell's own, in a new costume: the preview is a tool,
not the truth, and when it cannot show the thing the user does, verify the thing itself.

**Deviations from the plan, and why.**

- **`user-role.fields.tsx` was not built.** The plan listed it as a shared role-field component; in practice
  the role control appears in exactly one place — the create form, where the super administrator sees it
  locked to `Administrator` and an administrator picks doctor/nurse/lab. The edit dialog shows the role as
  read-only text because the role never moves on an edit. One consumer, so the field stays inline under this
  project's second-consumer rule rather than becoming a premature abstraction.
- **`UserService` is typed against the schema's _output_, not a hand-written filter type.** `list()` and
  `buildConditions()` take `UserFiltersOutput` (the zod-inferred `{ role, status, query }` with `'all'` in the
  unions), so the `!== 'all'` narrowing hands Mongo a real `UserRole` with no cast. `types/user-filters.ts`
  was deleted as a second, weaker source of the same shape.
- **`update()` writes only name, email and phone.** The staff form does not collect gender or date of birth,
  and passing them through the shared `toUpdateDocument` would `$unset` them on every save (the schema returns
  `undefined` for a field the form never rendered). A patient's demographics belong to the registry in
  [step 7](#step-7), which owns those fields.
- **The super administrator is excluded at the query, not filtered after.** `buildConditions` seeds
  `role: { $ne: SUPER_ADMIN }`, so the seeded account is absent from the list _and_ from any count the screen
  might show — invisible by construction rather than by a post-filter that a later `count()` could forget.
- **Two error codes were added** — `CANNOT_CREATE_PATIENT_HERE` (31005) and `ACCOUNT_HAS_CLINICAL_RECORD`
  (31006) — because both refusals are business rules a caller must be told apart, and in this no-i18n app the
  code's English `MESSAGE` is the sentence the user reads.
- **Four UI primitives landed** — `table`, `badge`, `dialog`, `select` — on top of the earlier sets, and the
  root layout gained `<NuqsAdapter>` while the dashboard layout mounted `<Toaster />`. The dialog carries a
  literal `"Close"` label rather than a translation provider, and `sonner` is themed `system`.

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

**Acceptance.** ✅ The rules are proven against the real database by two scripts. `npm run verify:departments`
(**17 checks, all green**, fixtures torn down) drives `DepartmentService`: name and code are each unique with a
field-level error naming the one that clashed; a named head must resolve to a real doctor whose account is
active — a non-existent record and a deactivated account are both refused, clearing the head is allowed, and
the assignable-heads picker offers active doctors only; a department a doctor still sits in cannot be deleted
(deactivate instead) but a free one can; the status filter and the name/code search narrow correctly.
`npm run verify:services` (**all green**, fixtures torn down) drives `ServiceItemService` and the money
handling: `toMinorUnits`/`formatMoney` and the create schema turn `'500.50'` into the integer `50050` and back
into `'500.50'` with **no floating-point drift**, a non-numeric price is refused, name and code are unique, and
the category/status/search filters narrow. Build, lint and format are green; the build emits
`/admin/departments`, `/admin/departments/new`, `/admin/services` and `/admin/services/new` as dynamic (`ƒ`).
In the browser, signed in as the super administrator, both list pages serve `200`, the sidebar carries the new
**Departments** and **Service catalogue** entries, and the pages render their headings, add-links, fields and
copy.

**An adversarial review caught one real defect, now fixed.** A department keeps its head-doctor id after that
doctor's account is later deactivated (nothing clears the reference, by design — the head may return). Because
`update()` re-checked the head on **every** edit, and the check requires an active account, an administrator
correcting only the description of such a department was blocked by a "head doctor is not active" error on a
field they never touched. The fix validates the head **only when it is actually changing**; an unchanged head
is left as it stands. `verify:departments` gained a regression check that fails without the fix, and the
"assigning a **new** deactivated head is refused" check still passes — the validation is skipped only for a
head that is not moving.

**The same browser note as the shell step applies.** The interactive click-through — create → toast →
`router.refresh()`, deactivate-then-hidden-from-picker, filter-survives-reload — could not be exercised in this
run's preview: the in-app pane could not composite (`document.hidden` stayed true), so React deferred revealing
the `loading.tsx` Suspense boundary, and no external Chrome was connected. The wiring behind it was confirmed
by reading it (each action is the fixed gate → validate → delegate over the DB-verified service; each screen
runs mutations through a transition then toasts and `router.refresh()`s) and, for the money round trip and
every service rule, by the verify scripts above.

**Deviations from the plan, and why.**

- **Departments take error-code feature digit 3 (Scheduling); services take 6 (Billing).** The taxonomy has no
  "directory" digit, and every one of the nine is semantically allocated. Services are unambiguous — they are
  the priced catalogue invoices draw on. For departments the choice was ratified rather than assumed: digit 3
  is the currently-empty digit whose eventual feature (appointments, availability) most directly consumes a
  department id, so `codes-departments.const.ts` occupies `13xxx/23xxx/33xxx` and later scheduling codes take a
  separate sub-range under the same digit. No `*_AUTH` groups — `COMMON_AUTH` plus the area gate cover both.
- **Money is an integer count of minor units, entered in major units for services only.** `constants/app-data.const.ts`
  gains a `CURRENCY` block (BDT, two minor-unit digits); `lib/utils/money.utils.ts` parses `'500.50' → 50050`
  and formats back with integer-only arithmetic (no float ever touches a price). The service price field
  accepts the decimal a person types; the **doctor consultation fee stays as it shipped in step 3b** — whole
  minor units, rejecting decimals — rather than being retrofitted, so an already-verified schema is left
  untouched. Two entry conventions in one app, ratified deliberately.
- **The head references a `Doctor` record, and the picker is empty until doctor records exist.** The step-3a
  model deliberately points `headDoctor` at a `Doctor`, not a `User` account ("the head of cardiology is a
  doctor in that capacity"), so the picker lists doctor **records** joined to their account name and filters to
  active accounts. No screen creates a `Doctor` record yet, so today the picker is empty and the head stays
  unassigned — which the field allows; the verify script seeds a doctor to prove the assignment and its rules.
  A head whose account is **later** deactivated still renders on the row as "—" (its name is not in the
  active-only set) — a cosmetic display gap, since the id is still stored and the reference intact.
- **A shared `<Feature>Fields` component backs both the create page and the edit dialog** — unlike step 6's
  users feature, whose create and edit differed (the role was locked on edit) and so shared no field body.
  Here the two forms edit an identical shape, so one component serves both, typed on the **create** input; the
  edit dialog holds the row's id outside the form and merges it in at submit, where the Server Action
  re-validates the whole object against the update schema. No hidden id input, no generics, no cast.
- **Services have a hard delete with no live reference guard yet.** Nothing references a `ServiceItem` today
  (invoices will _snapshot_ name and price rather than point at the live row, and diagnostics land later), so
  `delete()` simply removes. `SERVICES_BUSINESS.CANNOT_DELETE_REFERENCED` is declared ahead of the feature that
  will raise it — the same "codes arrive with their raiser" convention the registry documents.
- **Two new pieces of shared kit**: a `textarea` UI primitive (departments and services both take an optional
  description) and the `CURRENCY` constant. Both are the archetypal second-consumer case, built once here.

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

**Acceptance.** ✅ Proven against the real database by `npm run verify:patients` (**29 checks, all green**,
fixtures torn down). Registration mints an account with **no password**, unverified but approved and active,
alongside a `Patient` record and a well-formed number (`HMS-2026-000417`); the two hang together, and the
passwordless account is **refused at sign-in** until it is claimed in step 15. **Five simultaneous
registrations receive five distinct numbers** — the issuer takes each from an atomic `$inc` on a counter
document, not a `count()` plus an insert, so the race the plan warns about cannot mint a collision. Search
finds a record by its **number, phone and partial name**, and deliberately **not** by an allergy or a
condition. A duplicate email is refused on the `email` field. The detail read returns the demographics and the
full clinical record; a clinical edit changes the record while leaving the name and number untouched, and an
emergency contact can be cleared. Build, lint and format are green; the build emits `/admin/patients`,
`/admin/patients/new` and the dynamic `/admin/patients/[patientId]`. In the browser, signed in as the super
administrator, the pages serve `200`, the sidebar carries the new **Patients** entry, and the registration
form renders its demographic, clinical and emergency-contact sections.

**An adversarial review caught three real defects, all fixed and regression-tested.**

- **A registered patient leaked onto the step-6 staff screen (medium).** `UserService.buildConditions()`
  excluded only the super administrator (`role: { $ne: SUPER_ADMIN }`); before this step no `patient` account
  existed, so nothing exercised it, but the registry now mints them — and every one appeared as a manageable
  staff row an administrator could deactivate or un-approve, silently breaking the account claim the patient
  needs in step 15. The staff list is now scoped to `STAFF_ROLES` at the query (`$in`), the constant that was
  defined for exactly this and had gone unused. `verify:patients` now asserts a registered patient is absent
  from the staff list.
- **The registry search truncated at 50 with no signal (medium).** A common surname matching more than the
  page cap dropped the older matches invisibly — the exact way a second record with a fresh number gets
  created for someone already registered. `list()` now returns the **total** match count in `resultInfo`, and
  the screen says "Showing 50 of 60 — narrow your search to see the rest." `verify:patients` asserts the count
  is reported.
- **`calculateAge` aged a patient up a day early west of UTC (low).** A date of birth is stored as UTC
  midnight, and reading the local `getDate()` off that instant lands on the previous day in a negative-offset
  timezone. It now reads the birthday with `getUTC*`. Regression-tested.

**Deviations from the plan, and why.**

- **Step 7 is the admin-area registry; the doctor/nurse/patient views arrive with their own steps.** The plan
  puts every patient route under `/admin/patients`, an admin-area location, so registration, search, the
  detail page and editing are all guarded by `requireAdminArea` (administrator and super administrator). The
  acceptance's "a doctor and a nurse can open a patient, and a patient cannot open anybody's" is an
  **access-model** statement the `PatientService` reads are built for — they take a patient id and do not
  themselves decide who may look, so the doctor workspace (step 10), the nurse workspace (step 14) and the
  patient portal (step 13) reuse them behind their own guards. Building those cross-role routes now would be
  those steps' work, not this one's.
- **Registration uses a dedicated `PatientRegisterSchema`, not `UserCreateSchema` + `PatientCreateSchema`.**
  The existing `PatientCreateSchema` takes a `userId` — it is the **step-15** path, where a patient
  self-registers an account first and the clinical record is hung off it. Reception has no account to hang
  off, and `UserCreateSchema` requires a password a counter patient does not set, so step 7 composes the
  demographic half of `userFields` (no password, no role) with the clinical fields into one register schema.
  The MRN **issuer** is shared between the two paths, exactly as the plan requires.
- **The allergy and condition lists live in component state, not react-hook-form.** RHF's `useFieldArray` is
  built around arrays of objects; forcing a `string[]` through it fights the types the whole way. The two
  lists are held in ordinary state by a shared `PatientClinicalEntries` widget and merged into the payload at
  submit, where the schema drops the blank rows. The emergency contact is a real RHF field whose schema maps
  an all-blank object to "no contact" (via superRefine-then-transform, so the **input** type stays a real
  object the form can register), and the blood-group/gender "none" option submits `''` that a transform maps
  to `undefined`.
- **`patient-search` was folded into the list's filter bar, not built as a separate component.** The plan
  listed both; a standalone patient-picker earns its own component when a **second** consumer needs it — the
  appointment booking flow in step 9 — under this project's second-consumer rule. Today the one consumer is
  the registry search, which is `patients-filters`.
- **A `Counter` model and a `record-number.issuer.ts` were added.** The counter is a single document advanced
  by an atomic `$inc`, keyed by year; the issuer formats `HMS-YYYY-NNNNNN` from it and is the one place a
  number is minted. `patient.utils.ts` holds `formatMedicalRecordNo` and `calculateAge`. Patients take error
  codes under feature digit 2 (`12xxx`/`22xxx`).

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

**Acceptance.** ✅ Proven against the real database by `npm run verify:availability` (**26 checks, all green**,
fixtures torn down). The two clashes are the substance and are attacked directly: an overlapping block for the
**same doctor** is refused, its error naming the day and hours it hit; an overlapping block that puts **another
doctor in the same room** is refused, its error naming the doctor already there. A block starting exactly when
another ends is **allowed** (the overlap is half-open), the same hours on a different day are allowed, and the
same room and hours in an **effective window that never ran at once** (last spring vs this autumn) are allowed.
The clash check excludes the block being edited, so a block can be re-timed without clashing with itself, and a
reactivation re-runs the check. `expandSlots` turns a 09:00–13:00 block of twenty-minute slots into twelve and
drops the short tail of one that does not divide evenly; the booking screen in step 9 imports the same
function. A block ending before it starts is refused by the schema, not the service. Build, lint and format are
green; the build emits `/admin/availability`, `/admin/availability/new` and `/doctor/availability`. In the
browser, signed in as the super administrator, the pages serve `200`, the sidebar carries **Availability**, and
the publish form renders its day, time, slot-length, room and effective-date fields; a doctor with no
professional record sees a "no doctor profile yet" empty state rather than a failure.

**An adversarial review caught three real defects, all fixed and regression-tested.**

- **A slot longer than its own block was accepted (medium).** Only `start < end` and the effective-date order
  were checked, so a 09:00–09:30 block with a 60-minute slot passed — and expanded into **zero** bookable
  slots, unbookable by reception, yet still reserving the doctor and room against a block that genuinely could
  be booked there. A block must now hold **at least one whole slot**, checked in the create schema, the update
  schema, and the model's `pre('validate')` backstop (scripts and services write straight to the model). The
  model already guarded the analogous zero-length case; this closes its sibling. `verify:availability` gained
  two checks — the schema refusal and the model backstop.
- **The reactivate toast dropped the second clash reason (low).** A reactivation can hit both clashes at once,
  the same two-at-once shape the publish and edit forms render in full through `ConflictNotice`; the toast
  showed only the first. It now joins every reason.
- **A transient database error on a doctor's own page read as "no profile yet" (low).** A genuinely-missing
  record and a failed query both come back as an empty result; the page now tells them apart by the code and
  throws to the error boundary on a real failure, rather than telling a doctor who has a profile that they have
  none.

**Deviations from the plan, and why.**

- **Availability is exercised through seeded doctors — the picker is empty until `Doctor` records exist.** As
  with [step 6b](#step-6b)'s head-doctor picker, a `Doctor` professional record has no creation screen yet
  (step 16's "Profiles" edits an existing record; it does not mint one), so the admin doctor-picker and a
  doctor's own week are populated by seeded records, which the verify script creates. The whole availability
  service — the two clashes, the window overlap, slot expansion — is fully proven that way; only the click-path
  waits on a doctor-profile flow. A small `DoctorService` (`listForSelection`, `findByUser`) was added here for
  the picker and the doctor's own screen, and step 9's booking will reuse it.
- **A block that would hold no slot is refused, not merely warned.** The plan named the two clashes and the
  end-before-start rule; the zero-slot rule is the review's addition, in the same "a block that vanishes into
  nothing is a data error, not a block" spirit as the model's existing zero-length guard.
- **Deactivate and reactivate fire straight from a block's menu; only delete asks first.** The plan listed a
  `slot-delete.dialog` but no shared confirm dialog, so deactivation is a one-click toggle (its refusal, which
  a reactivation can still hit, surfaces as an error toast) and only the irreversible delete opens a dialog.
- **Availability codes share feature digit 3 with departments** — departments hold `x30xx`, availability takes
  `x31xx`, and step 9's appointments will continue from `x32xx`: one scheduling digit, non-overlapping
  sequences, as [step 6b](#step-6b) reserved.
- **The week is a per-day agenda, not a time-of-day grid** — every weekday present so an empty day reads as
  "nothing scheduled" rather than collapsing, each block a card with its hours, room, slot count and effective
  window. The doctor's own week is the same view, read-only.

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

**Acceptance.** ✅ Proven against the real database by `npm run verify:appointments` (**26 checks, all green**,
fixtures torn down). A booking lands on a real slot and the slot disappears from the picker; the **department is
derived from the doctor, not trusted from the request**; a slot outside the published hours is refused. **Two
simultaneous bookings of one slot produce exactly one appointment and one refusal** — the loser is turned away
by the partial unique index on `{ doctor, date, startTime }`, not a check a race can beat, and is reported as
"that slot was just taken" rather than a crash. Check-in assigns **sequential token numbers per doctor per
day** from an atomic counter; the lifecycle is enforced — a checked-in appointment cannot jump to completed and
**cannot be cancelled**, a no-show is refused until the slot has passed; the queue is derived and orders an
emergency ahead of a lower token; a reschedule moves the slot and frees the old one. Build, lint and format are
green; the build emits `/admin/appointments`(+`/new`), `/doctor/appointments`, `/doctor/queue` and
`/nurse/queue`. In the browser, signed in as the super administrator, the pages serve `200`, the sidebar
carries **Appointments** (and, for a doctor, **Appointments** + **Queue**; for a nurse, **Queue**), and the
booking form renders the patient/doctor pickers, the date, and the slot grid.

**An adversarial review caught four defects — a self-found authorization hole and three from the review — all
fixed and regression-tested.**

- **The queue actions gated the role but trusted the request's status (self-found, medium).** Each queue
  action admitted a role, then passed the client's `status` straight to `changeStatus`, so a nurse admitted to
  `checkInAction` could send `cancelled` and perform an **administrator-only** cancellation, or a doctor's
  `in-consultation`. Each action now **pins its own status** — the client chooses the appointment, never the
  move — so the role gate means what it says.
- **The reschedule picker hid the appointment's own current slot (medium).** The write path excludes the
  appointment from its own availability check, but the picker's read did not, so the slot it currently holds
  showed as taken — a dialog with the Save button live and nothing selectable, or "no free slots" on a busy
  day when the save would in fact succeed. `computeAvailableSlots` now takes an `excludeAppointmentId` that the
  reschedule picker passes, matching the write. `verify:appointments` asserts the excluded slot shows free.
- **A doctor's appointment list capped at 100 and dropped today (medium).** It listed every date, and the
  service's page cap kept the 100 **furthest-future** rows, so a busy doctor opening the page to see today's
  patients could see none. The page is now bounded to **today** and shows a "showing X of N" note.
- **A failed queue read rendered as an empty queue (low).** A transient database error and an empty queue
  both come back empty; the doctor and nurse queue pages now throw a real failure to the error boundary rather
  than telling a doctor with a full queue that it is empty.

**Deviations from the plan, and why.**

- **Appointments are exercised through seeded doctors** — the same `Doctor`-record dependency [step 6b](#step-6b)
  and [step 8](#step-8) carry: a booking needs a doctor with published availability, and no doctor-profile
  creation screen exists yet, so the pickers are populated by seeded records and the whole booking/queue engine
  is proven that way. `DoctorService.listForSelection` gained a `departmentId` so the booking form has the
  doctor's department to submit (which the service re-derives and does not trust).
- **A counter booking starts `confirmed`, and the status is pinned by the action, never the request.** The
  lifecycle lives in `appointment.utils` (`canTransition`) and is consumed by both the appointments feature
  (book, reschedule, cancel) and the queue feature (check-in, call-next, complete, no-show), each action gating
  to the role that owns the move via a new `gateRoles` helper (the sibling of `gateAdminArea` for actions that
  belong to a role rather than the admin area). `requested` and the confirm move are reserved for step 13's
  patient self-booking.
- **The token counter reuses the step-7 `Counter`**, keyed `appointment-token-{doctorId}-{date}`, so two
  nurses checking two patients in at once are handed two consecutive numbers.
- **The queue is derived on every read**, never stored, and it is the one screen that **polls** — a five-second
  `setInterval` calling `router.refresh()`, cleared on unmount, over an `aria-live="polite"` list. Appointment
  codes take scheduling digit 3, block `x32xx` (departments `x30xx`, availability `x31xx`).
- **The doctor's appointments page shows today only, the nurse queue picks a doctor.** The doctor page is
  bounded to today (see the review fix); the nurse queue reads `?doctorId` validated against the doctors on
  file, falling back to the first — a nurse's queue is always some doctor's queue.

---

<a id="step-10"></a>

### Step 10 — Encounters and medical records (EMR) ✅ Done

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

**Acceptance.** ✅ Verified. `npm run verify:encounters` — **24 checks, all green**, fixtures torn down —
proves the two rules the screen cannot vouch for: **access is by relationship** (a doctor with no appointment
or encounter linking them to a patient is refused the encounter, the timeline and the record, even by guessing
the id), and a completed encounter is **append-only** (an edit is refused and a dated, attributed addendum is
taken instead). Opening derives the patient and doctor from the appointment and moves it into consultation;
completing completes the appointment; the timeline shows the new encounter above the old with the writing
doctor named. `npm run build` compiles and every route serves.

**Deviations.**

- **The queue is the entry point, and completion moved into the record.** Reconciling with
  [step 9](#step-9): a doctor's "Start consultation" now opens the encounter and navigates into it (moving the
  appointment into consultation as one act), and "Resume consultation" returns to an open record. The visit is
  **completed inside the encounter**, which retired the queue's own completion control — so a completed
  appointment can never strand an open record — and the queue's `start`/`complete` status actions were dropped.
- **Ordered for retry-safety.** `open` and `complete` do the recoverable appointment move _before_ the
  irreversible encounter write, so a failed move leaves the record openable rather than a locked encounter
  stranded against a live appointment.
- Addendum authors are resolved to names in the record view rather than shown as raw account ids.

---

<a id="step-11"></a>

### Step 11 — Digital prescriptions ✅ Done

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

**Acceptance.** ✅ Verified. `npm run verify:prescriptions` — **15 checks, all green** — proves a prescription
is issued only from the doctor's **own open encounter** (patient and doctor derived from it), is **immutable**
(there is no edit path; the only change is a replacement that supersedes the original, and both stay on the
record), and that superseding is a single-writer compare-and-set so two concurrent replaces cannot fork two
live scripts. The print sheet renders on its own page, hiding the dashboard chrome; a doctor guessing another
patient's prescription id gets a 404, gated by the same relationship check the encounter enforces.

**Deviations.**

- **Issuing and replacing live on the open encounter**, in a Prescriptions panel on the encounter screen,
  rather than a standalone `new` page — a prescription is written during the visit. The doctor's
  `/doctor/prescriptions` list and the `[id]` / `[id]/print` pages are read-only.
- The print sheet uses a `@media print` visibility rule to hide the shared dashboard shell rather than a
  separate print-only layout, so it needs no route outside the protected area.

---

<a id="step-12"></a>

### Step 12 — Diagnostics: lab orders and reports ✅ Done

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
- Upload failures compensate: if the record write — or the order move that follows it — fails after the bytes
  land, the row is deleted and then the bytes, so no orphan is left and a retry starts clean.

**Acceptance.** ✅ Verified. `npm run verify:lab` — **33 checks, all green**, fixtures and stored files torn
down — against a real database and GridFS bucket. It proves the file is trusted by its **magic number** (a
`.pdf` whose bytes are not `%PDF` is refused, as is an empty file), the caller matrix (**the lab always; the
ordering doctor and the owning patient only once released; everyone else a 404, never a 403**), that the
storage key never reaches a DTO or the client, and that a failed upload leaves no orphaned bytes or dangling
row. Release stamps a verifier from the session and moves the order; the work list is ordered by clinical
urgency (stat before urgent before routine), not by the priority's spelling. `npm run build` compiles all four
route handlers.

**Deviations.**

- **One `lab.service.ts`** rather than split order/report services, and **one storage driver** (`lib/storage`,
  `save`/`read`/`remove`/`usage`) with **no background compression** — `sharp` is not added: a diagnostic file
  is served byte-for-byte, since re-encoding a report would change what a clinician reads.
- **Routes live under `/api/lab/reports/…`** (`upload`, `[id]`, `[id]/download`, `[id]/view`), not
  `/api/lab-reports/…`. Ordering is done from the encounter's Lab-orders panel; the lab works its list at
  `/lab/orders` and the doctor reads theirs at `/doctor/lab-orders`.
- `CANCELLED` is reachable from `ORDERED`, `COLLECTED` **and** `IN_PROGRESS` (not only before collection), but
  not once a report is filed. Storage policy lives in `constants/storage.const.ts`, the per-deployment cap in
  `env.STORAGE_CAP_BYTES`; the download/view responses carry `nosniff` + `Content-Security-Policy: sandbox` +
  `Cache-Control: private, no-store`.

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
  adult ranges — the pediatric case is [Backlog](#backlog), and the app says so rather than quietly applying
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
| Pediatric vitals reference ranges         | [Step 14](#step-14) ships adult bands and says so. Age-banded ranges are a data table plus a rule, and applying the wrong band silently is the failure to avoid         |
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
