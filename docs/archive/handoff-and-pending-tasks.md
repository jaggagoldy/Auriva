# Auriva — Handoff: What's Done, What's Pending, and the Implementation Prompt

This is a self-contained handoff. It has three parts:
1. **Report — what's already implemented** in the real app.
2. **The prompt — paste this into any AI model** to implement the pending work exactly to the mockups.
3. **Design system + conventions** the AI must follow to match the mockups.

Design source of truth = the **WEB-BASELINE-V1 prototypes** (the "auriva-site" HTML mockups). The live tracker is [`docs/implementation-status.md`](./implementation-status.md).

---

## PART 1 — REPORT: what is already done (verified in a real browser)

**Foundation (cross-cutting)**
- Warm "paper / pine / honey / ink" design tokens (light + dark) in `src/app/globals.css`.
- **Honey** is a first-class token: `bg-honey`, `text-honey-deep`, `bg-honey-soft`.
- App-wide color cleanup — **0 hardcoded palette colors** in `src/`.
- **CRITICAL FIX:** the CSP (`next.config.ts`) was `default-src 'self'` with no `script-src`, which blocked Next.js hydration → the whole app was non-interactive in the browser. Now fixed (script/style/img/font/connect-src added). Requires a dev-server restart.
- `Button` with `render={<Link/>}` now always sets `nativeButton={false}` (Base UI requirement).

**Phase 1 — Marketing site (done, routing-audited, no dead links)**
- **Home** `/`: hero + honey connected-cards, ecosystem grid, fragmentation/mission, connected-healthcare thread, **provider timeline**, **patient phone-mock**, platform-architecture, built-to-scale, pricing (**dark-green Solo card**), FAQ, final CTA.
- **Header**: Products mega-menu + Solutions/For-Patients/Company dropdowns, Auriva wave mark. **Footer**: warm, real links.
- **Products** `/platform`, **Solutions** `/solutions`, **Pricing** `/pricing`, **About** `/about`, **Security/Trust** `/security`→`/trust`. Secondary pages (industries, customers, contact-sales, book-demo, get-started) warm + jargon-free.
- **0 customer-facing jargon** ("kernel / configurations / zero forks / operational primitives / archetype").

**Phase 2 — Authentication (done + bugfixes)**
- **Sign in** `/login`: direct login form — email/phone + password, Remember me, Forgot password, "sign in with OTP" toggle, "Create account" → `/get-started`.
- **Get Started** `/get-started`: **Register as a user** (→ `/login?as=patient`, OTP) vs **Build your own clinic** (→ `/start` directly; register-org chooser skipped for now).
- **`/start` onboarding**: split-screen brand panel + inline validation (name/mobile/password), mobile-number sanitization, password-strength meter. Backend verified end-to-end (otp→quick-setup creates clinic+session).
- **BUGFIX (backend):** multi-profile / family-shared phone numbers could not sign in (OTP consumed on the profile-picker round-trip). Fixed — code consumed only when a session opens.
- **Owner landing:** a solo owner now lands on `/clinic` (was `/admin/command-center`).

**Phase 3 / 4 — Workspaces (QA-verified functional + warm; not yet pixel-matched to mockups)**
- Provider `/clinic`, `/doctor/*`: authed load + overview/today/payments APIs return real data.
- Patient `/patient/*`: authed load across home/records/family.

---

## PART 2 — THE PROMPT (paste into any AI to implement the pending work)

> **You are implementing the Auriva healthcare app (Next.js 16 App Router, React 19, Tailwind v4, Base UI + shadcn components, Prisma/PostgreSQL). Your job is to make the real app match the approved HTML mockups (WEB-BASELINE-V1) exactly — layout, spacing, components, and responsiveness — without breaking the working backend flows.**
>
> **Non-negotiable rules**
> - Match the mockup **frame-for-frame**: hierarchy, spacing rhythm, component shapes, and copy. Not just colors.
> - **Verify every change in a real browser** (headless Chrome via `playwright-core`, `channel:'chrome'`). Check: (a) no console/hydration errors, (b) the intended content renders, (c) **no horizontal overflow at 390px and 1280px** widths. Do NOT trust `curl` — it only sees SSR HTML and passes even when the live page is broken.
> - Use the **design tokens**, never hardcoded palette colors (see Part 3).
> - Preserve real routing + backend contracts; check each CTA lands in a working flow for the intended user (logged-out vs authed).
> - Keep the solo-first focus: independent clinic + patient are the live paths; multi-clinic surfaces are "coming soon".
>
> **Pending work, in priority order:**
>
> **A. Responsiveness pass (do first, all shipped screens).** Audit every marketing + auth screen at 390px, 768px, 1280px. Fix horizontal overflow, cramped grids, and phone/mockup scaling. The mockups are mobile-first; match their breakpoints.
>
> **B. Phase 5 — Clinical consultation** (inside `/clinic` "Start consultation"): consultation canvas (patient context rail: vitals/allergies/current-meds/past-visits; chief complaint; diagnosis chips; **prescription builder** with add/remove rows + templates; investigations; follow-up) and a **printable signed visit summary**. Match the clinical mockup. Wire to the existing consultation/prescription/billing backend.
>
> **C. Internal workspace pixel-match** (they're functional + warm but not matched): provider `/clinic` (Today/queue/consult/pay), patient `/patient/*` (home/book/records/family/profile) — rebuild layouts to the mockups.
>
> **D. Later phases** (mostly multi-clinic; lower priority): 6 Practice Ops (`/staff/*`), 6B Financial (`/staff/billing`), 7 Admin (`/admin/*`), 8 Platform Services (`/admin/events`), 9 Notifications (**green-field — not built**), 10 Reports (`/admin/command-center`), 11 Settings, 12 production-readiness (a11y audit, nonce-based CSP, perf).
>
> **E. Small auth screens still missing:** multi-workspace **Workspace Selection** (only for users in >1 clinic), **"We found your profile"** account-linking screen.
>
> After each screen: update `docs/implementation-status.md`, mark ✅ only after browser verification, and flag any gap as 🐛 rather than papering over it.

---

## PART 3 — DESIGN SYSTEM & CONVENTIONS (so any AI matches the mockups)

**Tokens (`src/app/globals.css`)** — use these, never hardcoded hex (except the fixed brand darks `#0B4A41` night, `#083F37` pine-deep, and honey text `#4A3413`):
- Ground: `bg-background` (paper), `bg-card`, `bg-secondary` (sand), `text-foreground` (ink), `text-muted-foreground`.
- Brand: `bg-primary` / `text-primary` (pine), `bg-accent` / `text-accent-foreground` (pine tint).
- **Honey accent:** `bg-honey`, `bg-honey-soft`, `text-honey-deep` — patient surfaces, provider-money, highlights.
- Status: `text-success` / `bg-success/15`, `text-warning`, `text-destructive`, `text-info` / `bg-info/15`.
- Headings: `font-heading` (rounded display). Radius token `--radius: 0.85rem`.
- Dark section blocks: `bg-[#0B4A41]` with `text-white`, honey accents, and an optional radial honey glow.

**Component conventions**
- `Button` (Base UI): for links use `<Button nativeButton={false} render={<Link href="…" />}>…</Button>`. Icon buttons keep `aria-label`.
- `Container` = `max-w-6xl px-6` (import from `@/components/marketing/container`).
- Section rhythm: `py-16 md:py-24`; alternate `bg-secondary` bands.
- Eyebrow: `text-xs font-bold uppercase tracking-[0.16em] text-primary`.
- Cards: `rounded-2xl border border-border bg-card`; featured = filled `bg-[#0B4A41] text-white`.

**Backend field names (don't guess)**
- OTP: `POST /api/auth/otp/send` and `/verify` expect `phone_number` (+ `code`, optional `healthcare_profile_id`).
- Provider login: `POST /api/auth/login` accepts `email` OR `phone` + `password`.
- Solo onboarding: `POST /api/onboarding/quick-setup` `{owner_name, mobile, password, code}` → creates clinic+session; `PATCH` names clinic + hours.

---

## PART 4 — MOCKUPS (the visual source of truth)

The approved HTML mockups (self-contained, warm design system) — these are what "exactly the same" means:
- **Marketing site** (home / products / solutions / pricing / patients / provider / security / about / contact / careers / resources / help): the multi-page "auriva-site" prototype.
- **App phase prototypes:** Auth, Provider Workspace, Patient app, Clinical consultation, Practice Ops, Financial, Admin, Platform, Comms, Reports, Settings, Production-readiness.

> The raw prototype HTML files live in this session's scratchpad; ask the owner to drop them into `design/mockups/` so the implementing AI can open the exact HTML. Each is a single self-contained `.html` file (inline CSS/JS) — open in a browser to see the target, and match the real screen to it.

_Last updated: 2026-07-12._
