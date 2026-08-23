# Unified Healthcare Management Solution

Patient records, appointments and queueing, prescriptions, diagnostics, billing and hospital
communication in one platform, with role-based dashboards for **administrators**, **doctors**, **nurses**,
**diagnostic staff** and **patients**.

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS v4 · MongoDB

> **Current state: steps 0–12 of 27 complete.** The toolchain, the design system, the public landing page, the
> validated environment, the result/error layer, the SEO surface, the whole data model, credential sign-in,
> the role-scoped dashboard shell, admin staff-account management, the departments and service catalogue, the
> patient registry with medical record numbers, doctor availability with conflict detection, appointment
> booking with a live queue, the encounter/EMR record with a relationship-gated patient timeline, immutable
> digital prescriptions with a printable sheet, and diagnostic lab orders and reports with GridFS file
> upload/download are in place. Everything below marked _(from step N)_ describes a convention this project
> follows but has not reached yet; see [docs/IMPLEMENTATION-PLAN.md](docs/IMPLEMENTATION-PLAN.md).

---

## Contents

1. [Overview](#overview)
2. [Roles](#roles)
3. [Tech stack](#tech-stack)
4. [Getting started](#getting-started)
5. [Environment](#environment)
6. [Scripts](#scripts)
7. [Project structure](#project-structure)
8. [Conventions](#conventions)
9. [Design system](#design-system)
10. [SEO and structured data](#seo-and-structured-data)
11. [Data layer](#data-layer)
12. [Authentication](#authentication)
13. [Roadmap](#roadmap)
14. [Toolchain notes](#toolchain-notes)
15. [Deployment](#deployment)

---

## Overview

Hospital work is usually spread across tools that were never meant to carry it. Records sit in one
department's filing cabinet, appointments are a phone call and a paper ledger, prescriptions are handwritten,
and a lab result travels back to the doctor by whatever means the patient can manage. Three problems follow:
a history nobody can assemble in one place, waiting that nobody can see the shape of, and clinical
information reaching people by proximity rather than by entitlement.

This system replaces all three with one platform, scoped deliberately to **a single facility** so the
functionality stays focused before any thought of scaling.

| Objective             | How it is met                                                                           |
| --------------------- | --------------------------------------------------------------------------------------- |
| **Centralization**    | Registration, scheduling, encounters, diagnostics and billing under one roof            |
| **Role-based access** | Every route and action gated by role, and clinical reads gated by relationship          |
| **Efficiency**        | Queues derive from the appointments; results reach both parties the moment they release |
| **Confidentiality**   | DTOs name every field, portals resolve the patient from the session, reads are audited  |

## Roles

| Capability                                | Admin | Doctor | Nurse | Lab | Patient |
| ----------------------------------------- | :---: | :----: | :---: | :-: | :-----: |
| Create and approve staff accounts         |  ✅   |   —    |   —   |  —  |    —    |
| Manage departments and the price list     |  ✅   |   —    |   —   |  —  |    —    |
| Register a patient and issue an MRN       |  ✅   |   —    |  ✅   |  —  |    —    |
| Publish hospital announcements            |  ✅   |   —    |   —   |  —  |    —    |
| Check in a patient, record vitals, triage |  ✅   |   —    |  ✅   |  —  |    —    |
| Consult, diagnose, prescribe, order tests |   —   |   ✅   |   —   |  —  |    —    |
| Upload and release a diagnostic report    |   —   |   —    |   —   | ✅  |    —    |
| Read a patient's clinical timeline        |  —¹   |   ✅   |  ✅   | —²  |   ✅³   |
| Raise invoices and record payments        |  ✅   |   —    |   —   | ✅  |    —    |
| Book, reschedule and cancel appointments  |  ✅   |   ✅   |  ✅   |  —  |   ✅³   |

¹ An administrator manages the hospital's record of itself, not its patients' records. What they can see is
the audit trail, not the contents. ² The lab sees the orders addressed to it and the reports it produced.
³ Their own, resolved from the session — never from a URL.

## Tech stack

| Layer      | Choice                          | Why                                                              |
| ---------- | ------------------------------- | ---------------------------------------------------------------- |
| Framework  | Next.js 16 (App Router)         | Server rendering and the API layer in one codebase               |
| UI         | React 19 + Tailwind CSS v4      | Design tokens, responsive by default                             |
| Primitives | shadcn (`base-nova`) on Base UI | Accessible components that match the token system                |
| Language   | TypeScript (strict)             | No `any`, no unchecked casts                                     |
| Database   | MongoDB + Mongoose              | Document-shaped data: encounters, orders, nested clinical values |
| Auth       | `jose` session JWT              | Signed httpOnly cookie carrying the role — no library in between |

**The app ships in English only.** There is no next-intl, no `[locale]` segment and no `l10n/` folder; every
user-facing string is a literal in the component that renders it. The reasoning, and the full list of what
that changes relative to the reference project this one follows, is in the plan's
[Differences](docs/IMPLEMENTATION-PLAN.md#differences-from-the-reference-project) section.

## Getting started

**Prerequisites:** Node.js 20+, npm, and a MongoDB you can reach — a local `mongod` or a free Atlas cluster.
The build validates `MONGODB_URI` before it starts, so set up [the environment](#environment) first.

```bash
npm install
```

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment

```bash
cp .env.example .env.local
```

| Variable            | Required                  | Notes                                                                                             |
| ------------------- | ------------------------- | ------------------------------------------------------------------------------------------------- |
| `LOG_LEVEL`         | No, defaults `info`       | `fatal` · `error` · `warn` · `info` · `debug` · `trace`                                           |
| `APP_BASE_URL`      | No, defaults to localhost | Absolute origin — canonical, sitemap and OG URLs use it (step 2)                                  |
| `ROBOTS_ENABLED`    | No, defaults `false`      | Set `true` on production only; anything else stays out of the index                               |
| `MONGODB_URI`       | **Yes**                   | Local or Atlas. The database name is set in code, not read from this                              |
| `AUTH_SECRET`       | **Yes**                   | At least 32 random characters — `openssl rand -base64 32`                                         |
| `STORAGE_CAP_BYTES` | No, defaults 1 GiB        | Total the GridFS lab-report bucket may hold; the upload quota guard measures against it (step 12) |

Every variable is declared in [env/server.ts](env/server.ts) and validated with zod. That module is imported
by [next.config.ts](next.config.ts), so an invalid value **fails the build** rather than surfacing on some
request later:

```
❌ Invalid environment variables: [ { path: [ 'APP_BASE_URL' ], message: 'Invalid URL' } ]
```

Read variables through `env`, never `process.env` — that is what keeps the validation honest.

```ts
import { env } from '@/env/server';
```

For the three variables that **have a default**, a blank value is read as absence, so blanking a line in
`.env.local` rather than deleting it means "use the default" instead of failing on an empty string.

`MONGODB_URI` and `AUTH_SECRET` have no safe default and a blank one **fails**, by design — which is why
`cp .env.example .env.local` is the first step and filling those two in is the second.

## Scripts

| Script                          | Description                                                                         |
| ------------------------------- | ----------------------------------------------------------------------------------- |
| `npm run dev`                   | Start the dev server                                                                |
| `npm run build`                 | Production build (`output: 'standalone'`)                                           |
| `npm run start`                 | Serve the production build                                                          |
| `npm run lint`                  | ESLint — import order, cspell, canonical classes, Prettier                          |
| `npm run lint:fix`              | ESLint with `--fix`                                                                 |
| `npm run format`                | Prettier check                                                                      |
| `npm run format:write`          | Prettier write                                                                      |
| `npm run seed:super-admin`      | Create the super administrator (see below)                                          |
| `npm run verify:data-model`     | Exercise the identity and directory models, then clean up                           |
| `npm run verify:clinical-model` | Exercise the scheduling and clinical models, then clean up                          |
| `npm run verify:auth`           | Exercise the session token and credential refusals, then clean up                   |
| `npm run verify:users`          | Exercise the staff-account rules against the database, then clean up                |
| `npm run verify:departments`    | Exercise the department rules (head, uniqueness, delete guard), then clean up       |
| `npm run verify:services`       | Exercise the service catalogue and money handling, then clean up                    |
| `npm run verify:patients`       | Exercise registration, the atomic record-number issuer and search, then clean up    |
| `npm run verify:availability`   | Exercise the doctor/room clash checks and slot expansion, then clean up             |
| `npm run verify:appointments`   | Exercise booking, the double-booking race, tokens and the queue, then clean up      |
| `npm run verify:encounters`     | Exercise relationship-gated access and the append-only encounter, then clean up     |
| `npm run verify:prescriptions`  | Exercise issue-from-open-encounter, immutability and supersede, then clean up       |
| `npm run verify:lab`            | Exercise the magic-number check, the access matrix and GridFS upload, then clean up |

The remaining `verify:*` scripts arrive with the services they exercise. Each writes to and deletes
from the database `MONGODB_URI` points at (the lab script also writes to and clears its GridFS bucket). Every
fixture is tagged with a run-scoped suffix and removed in a
`finally` block, and the removal is itself asserted — but they run against a real cluster, which is worth
knowing before running them anywhere that matters.

## Project structure

```
app/
  layout.tsx        The document, the fonts, the skip link — no page chrome
  (marketing)/      Landing page — site header and footer
  (auth)/           Sign-in — register and verify-email arrive in step 15
  (dashboard)/      admin · doctor · nurse · lab · patient — one shell, sidebar, topbar, drawer
  unauthorized/     403 for a signed-in visitor in the wrong area
  api/              Route handlers — bytes never go through a Server Action
  globals.css · global-error.tsx · not-found.tsx · robots.ts · icon.svg
proxy.ts            The route guard (Next 16's middleware file)
components/
  home/             Landing sections — hero, roles, features, stack, roadmap
  layout/           SiteHeader, SiteFooter
  shared/           AppLogo, Container, SkipToContent
  ui/               shadcn (base-nova) primitives
constants/          Structural data, route table and the error-code registry
env/                Zod-validated server and client environment
models/             Mongoose models — the ten below
scripts/            seed-super-admin · verify-data-model · verify-clinical-model
lib/
  api/              Route-handler response helpers — withOk, withBadRequest, withForbidden…
  auth/             session · session-cookie · current-user · guards
  result/           SingleResult · ListResult · EmptyResult and their factories
  schemas/          Zod schemas, {entity}-{action}.schema.ts
  services/         One class per entity — auth.service.ts is the first
  utils/            Every helper, barrelled — `@/lib/utils` resolves here
  logger.ts         pino — JSON in production, pretty in development
  mongodb.ts        globalThis-cached Mongoose connection
types/              One type per file, re-exported from types/index.ts
docs/               IMPLEMENTATION-PLAN.md
.husky/             pre-commit, commit-msg and pre-push guards
```

Every folder exposes a barrel `index.ts`, and components import through it (`@/components/home`,
`@/constants`, `@/types`).

The one exception: components inside a `'use client'` graph import their siblings by **relative path**. Going
through the folder barrel there pulls the whole feature into the bundle and can re-cross the server boundary.

## Conventions

This project follows the house style of `academic-workflow-synchronization-system`. The rules that are not
enforced by ESLint matter most, because that is where code drifts.

**Imports** — groups separated by a blank line, alphabetized: `react`/`next` first, then external packages,
then `@/*` aliases, then relative, and `import type` **always last**. `npm run lint:fix` sorts this for you.

**Components** — `function` declarations, never arrow consts. Named exports only, except App Router
`page.tsx` / `layout.tsx`, which must default-export. Server Components are the default; `'use client'` only
for controlled inputs, browser APIs or event-heavy state, and it goes on line one.

**Types** — `type` aliases, never `interface`. Props types are named `<Component>Props`, declared immediately
above the component and never exported. No `any`, no unchecked casts; use a DTO mapper instead of asserting a
database row into a shape.

**Styling** — design tokens only, never a raw hex or `oklch()` in a component. Merge classes with `cn()` and
keep the caller's `className` last so overrides win. Conditional classes go through `cn()`, never a template
literal. **Write classes directly on the element** — no `const CARD_CLASS = '…'` pulled out above the
component, even when the same set repeats across siblings. Repetition is easier to read and to edit than a
name that has to be resolved.

**Helpers** — a function that is not a component and not an event handler belongs in
`lib/utils/{domain}.utils.ts`, not beside the component that happened to need it first. Components and pages
hold JSX and the handlers wired to it. Import through the barrel: `import { cn } from '@/lib/utils'`.

Anything in that barrel must be safe in a client bundle, so utils that reference mongoose import it with
`import type`. `lib/mongodb.ts` and the models import the specific constant module rather than `@/constants`,
because the barrel drags `lucide-react` in with it.

**Naming** — files `kebab-case`; `{entity}-{action}.schema.ts`, `{entity}.const.ts`, `{entity}.dto.ts`,
`*.form.tsx`, `*.dialog.tsx`, `*.types.ts`. Singular for anything that operates on one row, plural for
anything that renders the collection. Module constants are `SCREAMING_SNAKE_CASE`.

**Copy** — user-facing text is a literal in the component that renders it, **until a second consumer exists**.
Then it moves to that feature's `constants/{feature}.const.ts`, beside the structural data. That is why the
landing page's four lists live in `constants/home.const.ts`: `/llms.txt` and `/llms-full.txt` restate them, and
copy maintained in two files drifts. Prose that only one place renders stays in the component. There is no
`constants/copy.const.ts`. Two constants files carry strings unconditionally:
`constants/app-data.const.ts` (the product's own name, tagline and description) and
`constants/codes-*.const.ts` (server-side error messages).

**Business logic** — never in a component. Validation lives in zod schemas, logic in services, transformation
in DTO mappers. Components render what they are given.

**Server actions** (from step 6) — the file is always `actions.ts`, the function always ends in `Action`, the
argument is one parameter named `values` typed `unknown`. It gates, validates with zod, calls a service and
returns a Result. Expected failures come back as a failure result; they are not thrown.

**Clinical safety** — no patient identifier, name or clinical value in a log line, a URL query string, or a
DTO that did not name it. A portal resolves the patient from the session. Wrong-owner access to a clinical
record returns 404, not 403 — confirming a record exists is itself a disclosure when the record is a person's
medical file.

**Spelling** — a new domain word goes in `cspell.config.json`, not behind an inline disable. Because copy
lives in the JSX rather than a dictionary file, cspell reads all of it; medical vocabulary will need adding
as it appears.

**Definition of done** — `npm run format:write`, then green `npm run lint`, then a successful `npm run build`.

### Git hooks

Husky enforces the definition of done rather than trusting anyone to remember it. A failing check aborts the
operation; the hooks install themselves through the `prepare` script on `npm install`.

| Hook         | Runs                                                     | Blocks     |
| ------------ | -------------------------------------------------------- | ---------- |
| `pre-commit` | Branch-name check, then `npm run lint`, `npm run format` | The commit |
| `commit-msg` | commitlint — Conventional Commits                        | The commit |
| `pre-push`   | `npm run build`, which is the type check                 | The push   |

Branch names must be `feature/`, `bugfix/`, `release/` or `hotfix/` followed by lowercase `a-z0-9-`
(`feature/step-3a-data-model`); `master` and `develop` are exempt. Commit messages need a Conventional
Commits type — `feat:`, `fix:`, `chore:`, `docs:`, `refactor:`.

Lint and format run on every commit because they are fast. The build runs once per push, because it is what
catches a type error, a broken metadata route or an invalid env schema — cheap here, expensive in CI or in a
branch someone else has pulled.

If the hooks ever stop firing, `npm run prepare` reinstalls them. `--no-verify` skips them; treat that as a
last resort, not a shortcut.

## Design system

Colors, radii and fonts are CSS variables in [app/globals.css](app/globals.css), mapped into Tailwind through
`@theme inline`. Use the token classes rather than raw palette values —
`eslint-plugin-tailwind-canonical-classes` checks every class name against that file.

| Token group                                    | Purpose                                               |
| ---------------------------------------------- | ----------------------------------------------------- |
| `background` / `foreground` / `card` / `muted` | Surfaces and text                                     |
| `primary`                                      | Clinical teal-blue, used for actions and accents      |
| `success` / `warning` / `destructive` / `info` | Status feedback                                       |
| `accent-violet/blue/teal/amber/rose`           | Admin / doctor / nurse / lab / patient, in that order |
| `sidebar-*`                                    | Reserved for the dashboard shell (step 5)             |

Typography helpers (`.tagline`, `.text-medium-normal`, `.text-page-title`), section padding (`.section-py`,
`.section-px`) and `.surface-card` are defined alongside the tokens.

**Every contrast figure in that file was measured, not estimated** — oklch converted to sRGB, then the WCAG
relative-luminance formula, with tinted backgrounds composited first. Text pairs are held to 4.5:1 and
control boundaries to 3:1. Two consequences worth knowing before retuning anything: `--input` is split from
`--border` because a field boundary is what tells somebody where to type and WCAG 1.4.11 asks 3:1 of it,
while a card edge may stay faint; and the dark status colors sit higher than symmetry suggests, because a 10%
tint over a dark card lands _above_ the card and the text has to climb further to clear it.

The palette ships **light by default** with a complete `.dark` block already written. The toggle that switches
between them lands in step 21b; until then, dark is verified by setting the `dark` class on `<html>`.

### Type

Inter (body) and Poppins (headings), loaded through `next/font/google`. `@theme inline` points `--font-sans`
at `--font-body` rather than straight at the next/font variable, so swapping a face is one reassignment
rather than an edit at every call site.

## SEO and structured data

Everything here is derived from `APP_BASE_URL` and `constants/app-data.const.ts`, so nothing has to be kept
in sync by hand.

| Route              | What it serves                                                    |
| ------------------ | ----------------------------------------------------------------- |
| `/sitemap.xml`     | One entry per public route, enumerated in `SEO.PUBLIC_ROUTES`     |
| `/robots.txt`      | Gated on `ROBOTS_ENABLED`; disallows the private segments when on |
| `/llms.txt`        | Short index for LLM crawlers, per the llmstxt.org convention      |
| `/llms-full.txt`   | The long form — every landing section as markdown                 |
| `/opengraph-image` | 1200×630 social card, generated by `next/og`                      |

The page head carries `metadataBase`, an absolute canonical, the `og:` set with the card wired in
automatically, and a JSON-LD `@graph` of `Organization` → `WebSite` → `SoftwareApplication`, cross-linked by
`@id` fragments.

### Three things to know

**Indexing is off unless a deploy opts in.** `ROBOTS_ENABLED` defaults to `false`, which makes `robots.txt`
emit `Disallow: /` _and_ the page metadata emit `noindex, nofollow`. Two independent signals, because getting
a staging site back out of the index is far more work than setting one variable — and a staging copy of a
hospital system is the kind of thing that must never be found.

**The sitemap is a list, not a discovery.** `SEO.PUBLIC_ROUTES` names its entries explicitly. This app will
grow routes that name a patient, and a self-discovering sitemap publishes one the first time somebody forgets
to think about it. `SEO.DISALLOWED_PATHS`, by contrast, _is_ derived — from `PROTECTED_SEGMENTS`, so the
crawler rules and the route guard cannot drift apart.

**Structured data is typed.** [constants/json-ld.const.ts](constants/json-ld.const.ts) builds a `Graph` from
`schema-dts`, so a node or property outside the schema.org vocabulary fails the build instead of failing a
validator after deploy. It exports a builder rather than a static object, because the base URL is server-only
env and the constants barrel is imported by client components.

The organization node currently describes the project itself. When a real facility's identity is known it
becomes a `MedicalOrganization` with address, contact details and accreditation — inventing those now would
put false clinical credentials in front of crawlers.

## Data layer

### MongoDB

[lib/mongodb.ts](lib/mongodb.ts) exports `connectToDatabase()`. It caches the connection on `globalThis`,
because Next.js re-evaluates server modules on every change in development and would otherwise open a new
connection per reload until the pool is exhausted. It also refuses to reuse a cached-but-disconnected
instance, which is what otherwise leaves the first request in a newly opened tab waiting on a dead socket.

**The database name is set in code**, not read from the connection string. Atlas hands out URIs without a
path segment, and a missing one silently routes every write to a database called `test` — the app works and
nothing complains. `connectToDatabase()` passes `dbName: DATABASE_NAME` explicitly, so no environment can get
it wrong.

### Models

One per file in `models/`, each guarded with `mongoose.models.X ?? mongoose.model('X', schema)` so hot reload
re-uses the compiled model instead of redefining it.

| Model          | Holds                                                                                |
| -------------- | ------------------------------------------------------------------------------------ |
| `User`         | Identity, credentials, role and the approval flags. **Nothing clinical**             |
| `Department`   | Name, code, description, head doctor                                                 |
| `Doctor`       | Account, department, specialization, registration number, fee, room                  |
| `Patient`      | Account, medical record number, blood group, allergies, conditions, next of kin      |
| `Availability` | A doctor's recurring weekly block: day, hours, slot length, room, effective dates    |
| `Appointment`  | Patient, doctor, day, slot, status, triage, token — and the vitals taken at check-in |
| `Encounter`    | The consultation: complaint, examination, diagnoses, notes, and dated addenda        |
| `Prescription` | Items with a closed frequency list, advice, issue time, supersession                 |
| `LabOrder`     | Tests requested, priority, and where the order has reached                           |
| `LabReport`    | Findings, the stored file, who verified it and when it was released                  |

**Times are `HH:mm` strings and calendar dates are `YYYY-MM-DD` strings**, both zero-padded. That is not
laziness about types: it makes `startTime < endTime` a plain string comparison, makes the overlap test between
two blocks arithmetic-free, and — most importantly — makes the double-booking index an equality match on a
value produced by exactly one helper. A `Date` would carry an instant, and "the 17th" would mean whatever
timezone each caller happened to apply.

**Double-booking is prevented by an index, not by a check.** Reading "is this slot free" and then writing the
booking are two round trips, so two requests arriving together both read free and both write. The unique index
on `{ doctor, date, startTime }` is partial over the statuses that still hold their slot, so a cancelled
appointment gives its time back instead of reserving it forever.

**Vitals sit on the appointment, not the encounter.** A nurse records them at check-in and the doctor opens
the encounter afterwards, so at the moment they are taken there is no encounter to put them in.

**A patient's clinical record is a separate document from their account**, and that line is the one the whole
data model is drawn along. `User` answers "who is asking" and is read on every sign-in; `Patient` answers
"what is known about them" and is read deliberately. Keeping allergies and conditions off the account means
they are never in the document a session token is minted from, and it is what lets step 21a audit a _clinical_
read as distinct from an ordinary one.

Passwords are hashed in the model's `pre('save')` hook, so every path that saves a user gets it, including the
seed script. The field carries `select: false`: it is absent unless a query asks for it with
`.select('+password')`. It is also **optional** — reception registers a patient before that person has an
account they can open, and `comparePassword` refuses rather than throwing when there is none.

Two constraints are indexes rather than service checks, because a check is a rule the next caller can forget:
exactly one super administrator (a partial unique index on the role), and one doctor or patient record per
account.

### DTOs

Nothing reaches a component as a Mongoose document. Each entity has a mapper in `types/{entity}.dto.ts` that
names every field explicitly — so `password`, `_id` and `__v` cannot leak by being forgotten, and a new
clinical field stays invisible until someone deliberately adds it. Mappers take a structural entity type
rather than a `HydratedDocument`, so they accept both hydrated documents and `.lean()` results.

**`Patient` has two mappers, and which one you reach for is a decision.** `patientFromEntity` is the full
clinical record. `patientSummaryFromEntities` is a name, a record number, an age and a phone — what a queue
row, a search result or an appointment line actually needs. The summary is the default for lists, because a
list screen is exactly where a clinical record leaks by being convenient.

### Seeding the first administrator

Every account is created by somebody already signed in, which leaves the first one with no way in. That is
what the seed script is for — and it seeds the **super administrator**, not an administrator: there is exactly
one, it cannot be created or changed through any screen, and it is the account that creates the first
administrator. Pass the credentials in the environment rather than on the command line, so the password stays
out of shell history:

```bash
SEED_SUPER_ADMIN_NAME="Hospital Director" SEED_SUPER_ADMIN_EMAIL="director@hospital.example" SEED_SUPER_ADMIN_PASSWORD="…" npm run seed:super-admin
```

Re-running it never resets an existing password — if the email is already registered it reports and stops.

### The Result pattern

Services and server actions never throw for an expected failure — they return a result. Three shapes cover
everything: `EmptyResult` (nothing to return), `SingleResult<T>` (one item), `ListResult<T>` (many, with
optional paging info). All three carry `success`, `errors` and `messages`.

```ts
import { CODES } from '@/constants';
import { createError, singleFailure, singleSuccess } from '@/lib/result';

if (!patient) {
  const { CODE, MESSAGE } = CODES.VALIDATION.COMMON.RESOURCE_NOT_FOUND;
  return singleFailure<PatientDto>(createError(CODE, MESSAGE));
}

return singleSuccess(patientFromEntity(patient));
```

Error codes live in [constants/codes.const.ts](constants/codes.const.ts) as five digits —
`[layer][feature][sequence]`, so `20002` is a common validation error and `50001` an authorization one. The
feature digits are allocated up front; the file that fills one arrives **with the service that raises those
codes**, not before. Zod messages carry their code inline (`encodeZodMessage`), and `mapZodErrorsToErrorDto()`
unpacks a whole `ZodError` into field-level `ErrorDto`s a form can render.

Only genuinely exceptional things throw. A refused action is data, not an exception.

### Logging

[lib/logger.ts](lib/logger.ts) exports pino — pretty in development, single-line JSON in production, gated by
`LOG_LEVEL`. `createLoggerWithContext('patient.service')` tags every line with where it came from.

**No patient identifier, name, address or clinical value is ever a log field.** An id is fine, a diagnosis is
not. Logs travel to places this app's access rules do not reach.

## Authentication

A session JWT signed with [`jose`](https://github.com/panva/jose), stored in an httpOnly cookie. No auth
library sits in between — the pieces are small enough that owning them costs less than working around
somebody else's abstraction.

**Everybody signs in with their email address.** There is no separate identifier scheme: a patient who comes
in twice a year will not have kept one, and a scheme half the users cannot remember is a support burden
pretending to be security.

### The pieces

| File                           | Runs            | Does                                     |
| ------------------------------ | --------------- | ---------------------------------------- |
| `lib/auth/session.ts`          | Server and edge | Signs and verifies the token             |
| `lib/auth/session-cookie.ts`   | Server only     | Sets and clears the cookie               |
| `lib/auth/current-user.ts`     | Server only     | `getSessionUser()` for pages and layouts |
| `lib/services/auth.service.ts` | Server only     | Checks credentials, returns a Result     |

`proxy.ts` imports **`@/lib/auth/session` directly, not the barrel** — the barrel also exports the cookie
helpers, which use `next/headers`, and that does not exist in the middleware runtime. Verifying a token needs
only `jose`, which runs there fine.

### What the session carries

`userId`, `role`, `email`, `name` and `isApproved`, so a guarded page knows who is asking without a database
round trip. **Nothing clinical** — no medical record number, no department, no patient id. A token is a bearer
credential sitting in a cookie; anything minted into it is disclosed to whoever holds it and goes stale the
moment the record changes.

Two things `verifySessionToken()` does that are easy to leave out:

- **Pins the algorithm.** `algorithms: ['HS256']` is what refuses a token arriving with `alg: none`.
- **Parses the payload with zod after checking the signature.** A signature proves the token was minted here,
  not that its shape still matches the current code — a token issued before a field was renamed verifies
  perfectly and then hands back nonsense.

The cookie is `httpOnly`, `sameSite: lax`, `secure` in production, and lives **one hour**. That is short for a
web application and deliberate: these sessions are opened on shared machines at a nurses' station and a
reception desk.

Clearing it re-sets the cookie with `maxAge: 0` and the identical attribute block rather than calling
`delete(name)` — a bare delete lands on the path the action ran at, leaving the real cookie in place.

### Revocation

`getSessionUser()` loads the live row on every call and refuses a session whose account has been deleted,
deactivated, de-approved or had its role changed. So those actions take effect **at once** rather than waiting
out the token — which matters more here than in most applications, because the accounts being revoked are the
ones that read medical records.

If the database cannot be reached the check **fails open** to the verified token. An outage must not lock a
hospital out mid-shift, and the one-hour lifetime still bounds the exposure. That is a judgement call, and it
is the one to revisit first if the threat model changes.

`getSessionUser` is wrapped in React's `cache()`, so it runs **once per request** however many guards call
it. A guarded page calls it at least twice — the layout, then the page's own role guard — and Next dedupes
`fetch`, not Mongoose.

### Refusals

`AuthService.verifyCredentials()` checks the password **first**, then account state. An unknown address and a
wrong password return the same code and the same sentence; "waiting for approval" or "deactivated" is only
ever disclosed to somebody who has already proved they own the account. Otherwise the sign-in form doubles as
a way to ask whether a given person is a patient here.

**The same words are not enough — the refusals also cost the same time.** bcrypt at cost 12 is roughly 200ms,
so returning early when no account is found would let anyone separate "no account" from "wrong password" with
a stopwatch, whatever the response body said. The comparison therefore runs either way, against
`ABSENT_PASSWORD_HASH`; `npm run verify:auth` times all three refusal paths and asserts they stay comparable.

Reasons travel as codes, not sentences: the service returns a `SingleResult` carrying an `ErrorDto`, and the
form renders the sentence for that code.

### The route guard

`PROTECTED_SEGMENTS` in [constants/routes.const.ts](constants/routes.const.ts) is the single source for both
the guard and the `Disallow` list in robots.txt. The proxy answers "is there a session"; the page answers "is
it the right one". Two guards, in [lib/auth/guards.ts](lib/auth/guards.ts):

```ts
const sessionUser = await requireSession(); // redirects to sign-in
const admin = await requireAdminArea(); // redirects to /unauthorized
```

Both redirect rather than returning `null`, so no caller can forget the refused case and render a page to
nobody.

**A wrong role is not a missing session.** Sending both to sign-in would tell an already-authenticated nurse
to sign in again, which reads as a bug rather than a refusal — so the wrong role gets `/unauthorized`, a 403
naming the role and linking to the visitor's _own_ area.

`requireAdminArea()` exists instead of `requireRole(ADMIN)` because the super administrator holds every
administrator power and then some; `requireRole(ADMIN)` would lock the one account that owns the area out of
it.

## Roadmap

Straight from the project proposal, mapped onto the
[implementation plan](docs/IMPLEMENTATION-PLAN.md).

| Phase | Activity             | Estimate | Steps    |
| ----- | -------------------- | -------- | -------- |
| 1     | Requirement analysis | Week 1   | 0        |
| 2     | System design        | Week 2   | 0–3b     |
| 3     | Backend development  | Week 3–4 | 3a–9     |
| 4     | Frontend development | Week 5–6 | 5, 10–14 |
| 5     | Integration          | Week 7   | 15–20    |
| 6     | Testing & bug fixing | Week 8   | 21a–22   |
| 7     | Deployment           | Week 9   | 22       |
| 8     | Documentation        | Week 10  | 23       |

`typedRoutes` is on, so a `<Link>` to a route that does not exist yet is a build error. That is why the
landing page uses in-page anchors and `ROUTES` currently holds only `HOME`.

## Toolchain notes

Two dev dependencies are intentionally **not** on their newest major, because the rest of the toolchain
cannot load them yet. Revisit when the upstream issues close.

| Package      | Pinned   | Why                                                                                                                 |
| ------------ | -------- | ------------------------------------------------------------------------------------------------------------------- |
| `typescript` | `6.0.3`  | `typescript-eslint` refuses to load under TS 7.0, which breaks `npm run lint` entirely                              |
| `eslint`     | `9.39.5` | `eslint-plugin-react` (pulled in by `eslint-config-next`) still calls `context.getFilename()`, removed in ESLint 10 |

Dependencies are pinned to exact versions — no `^` or `~`.

`eslint-import-resolver-typescript` is declared at the root on purpose. `eslint-config-next` keeps its own
nested copy, which `eslint-plugin-import` cannot find — it then falls back to loading the `typescript`
compiler package as a resolver and every `@/*` import fails to resolve.

`next/font/google` downloads Inter and Poppins at build time, so `npm run build` needs network access to
`fonts.googleapis.com`. A failed font fetch is a build error, not a warning.

## Deployment

[next.config.ts](next.config.ts) sets `output: 'standalone'`, but only when `VERCEL` is unset. On Linux,
`npm run build:linux` copies `.next/static` and `public` into the standalone bundle, and
[ecosystem.config.js](ecosystem.config.js) runs it under PM2 on port **3102**.

On Vercel the option is skipped. The platform traces and packages the output itself, and leaving
`standalone` on makes the build fail on a missing `.next/next-server.js.nft.json` — the file the standalone
copy step reads.

```bash
npm run build:linux
```

```bash
pm2 start ecosystem.config.js
```

## Naming

`CareSync` is a placeholder short name. It is defined once in
[constants/app-data.const.ts](constants/app-data.const.ts) and used everywhere, so renaming it is a one-line
change.
