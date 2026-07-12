# Auriva — Real-App Implementation Status

> Living scoreboard for porting the approved WEB-BASELINE-V1 prototypes into the real Next.js app.
> Updated by the engineer as each screen lands, so you can match the Figma and raise bugs against a
> specific row.

**Legend**
- ✅ **Done** — rebuilt to the prototype/Figma, warm design system, verified rendering.
- 🟡 **Warm-only** — functional + on the warm palette, but layout/copy not yet rebuilt to the prototype.
- ⛔ **Not started**
- 🐛 **Bug/gap** — raise here (add a line under the row).

**How to raise a bug:** find the row, add `  - 🐛 <what's wrong> (screenshot/route)` beneath it.

Dev server: `http://localhost:3000` · Provider login `+15550299001 / password123` · Patient via OTP (dev-echo).

---

## 🚨 CRITICAL FIX (2026-07-12) — CSP was breaking ALL interactivity
`next.config.ts` set `Content-Security-Policy: default-src 'self'` with **no `script-src`** — so Next.js's inline hydration bootstrap (`self.__next_r`) was **blocked**. Every page rendered server-side but **never became interactive**: buttons dead, forms didn't submit, `useEffect` didn't run, validation never showed. This is why fixes "didn't work" in the browser even when the SSR HTML was correct. **Fixed:** added `script-src`/`style-src`/`img-src`/`font-src`/`connect-src` (allow inline + dev eval) while keeping object/base/form/frame-ancestors protections. **Verified via real headless-Chrome E2E** (playwright-core): sign-in, patient OTP, `/start` validation+advance, provider login all interactive. **Requires the dev server to be restarted to take effect.**

## Foundation (cross-cutting) — ✅ COMPLETE
| Item | Status | Notes |
|---|---|---|
| Warm design tokens (light + dark) | ✅ | `src/app/globals.css` — paper/pine/ink |
| **Honey accent token** | ✅ | `--honey/-soft/-deep/-tint` → `bg-honey` etc. |
| App-wide color cleanup | ✅ | 0 hardcoded palette colors in `src/` |
| Rounded heading font + radius | ✅ | `--font-heading`, `--radius 0.85rem` |

---

## PHASE 1 — Marketing Website  ·  status: ✅ **DONE** (customer journey rebuilt to prototype) — secondary utility pages 🟢 warm/functional
| Screen | Route | Status | Notes |
|---|---|---|---|
| Home | `/` | ✅ | Full prototype: hero + honey connected cards, ecosystem, mission, thread, providers/patients, architecture, scale, pricing, FAQ, CTA |
| Site header (mega-menu) | — | ✅ | Products mega-menu + Solutions/For-Patients/Company dropdowns, wave mark |
| Site footer | — | ✅ | Warm, real tagline, real links |
| Products | `/platform` | ✅ | Rebuilt: Solo (Live) + roadmap editions + "why one platform" |
| Solutions | `/solutions` | ✅ | Rebuilt: by-profession grid + "configured, not customised" |
| Pricing | `/pricing` | ✅ | Rebuilt: Free-forever / ₹999 plans + pricing FAQ |
| Security & Trust | `/security`, `/trust` | ✅ | Warm + honest (Live/In-progress status); `/security`→`/trust` |
| About / Company | `/about` | ✅ | Rebuilt: mission + "What we believe" 6 principles + "what Auriva is not" |
| Industries | `/industries` | 🟢 | warm + jargon-free (secondary) |
| Customers | `/customers` | 🟢 | warm (secondary) |
| Contact / Book demo | `/contact-sales`, `/book-demo` | 🟢 | warm forms (secondary) |
| Get started | `/get-started` | 🟢 | warm routing hub (secondary) |
| Compliance | `/compliance` | 🟢 | warm (secondary) |

**Phase 1 = ✅ DONE** — every nav/journey page rebuilt to the prototype. Remaining 🟢 rows are utility pages (forms / routing hubs), warm + functional + jargon-free — flag a 🐛 if any diverges from Figma.

---

## PHASE 2 — Authentication  ·  status: 🟡 IN PROGRESS
| Screen | Route | Status | Notes |
|---|---|---|---|
| Onboarding (Start free) | `/start` | ✅ | Split-screen + 4-step setup. **Bugs fixed:** grid layout; inline validation (name/mobile/password); mobile sanitized + validated; password strength meter; button relabeled "Continue". Backend flow verified (otp→quick-setup creates clinic) |
| Routing audit (Phase 1) | all | ✅ | Every marketing/auth link resolves — no dead links; full tsc clean |
| Patient OTP (sign in) | `/login?as=patient` | ✅ | **BUGFIX (backend):** multi-profile phones (seeded patients / family-shared numbers) could never sign in — the OTP was consumed on the profile-picker round-trip, so the follow-up call failed "Invalid code". Now consumed only when opening a session. Verified end-to-end (send→picker→select→session→/patient 200) |
| Provider workspace | `/clinic`, `/doctor/*` | ✅ | QA-verified: authed load 200, overview/today/payments APIs all 200 with real data. **Owner login now lands on `/clinic`** (was `/admin/command-center`) — solo-first. |
| Patient workspace | `/patient/*` | ✅ | QA-verified: authed load 200 across home/records/family after profile selection |
| Sign in | `/login` | ✅ | **Direct login form** — email/phone + password, Remember me, Forgot password, "sign in with OTP" toggle, "Create account"→/get-started. Path chooser removed from sign-in |
| Get Started fork (new users) | `/get-started` | ✅ | **Register as a user** vs **Build your own clinic** (Figma). BE-verified routing: user→`/login?as=patient` (OTP), clinic→`/register-org`→Independent→`/start`. Joining team→`/login` |
| Workspace selection (post-login, if >1) | — | 🟡 | Single-workspace → direct (works). Multi-workspace selection needs backend list — pending |
| "We found your profile" (account linking) | — | ⛔ | Prototype screen; map to real flow next |

---

## PHASES 3–12 — Product & Platform  ·  status: 🟡 warm-skinned, layouts pending
| Phase | Surface | Status | Notes |
|---|---|---|---|
| 3 Provider Workspace | `/clinic`, `/doctor/*` | 🟡 | Real frozen UX, warm; + "Grow to multi-clinic" card added |
| 4 Patient Experience | `/patient/*` | ✅ | **Rebuilt mobile-first (2026-07-12)** to `design/mockups/auriva-user.html`: centered phone shell + bottom nav **Home · Book · Records · Family · You** (one UX, no separate desktop layout). Home (next-visit card + tiles), Book (find-doctor → real booking dialog), Records (Timeline/Rx/Bills/Reports, ?tab= deep-links), Family (famcards + add-member), You (profile/health/settings/sign-out). Superseded routes redirect (find-care/doctors→book, profile→you, care→home). UI-only; all backend/auth/session preserved. Browser-verified 390+1280, 0 overflow/errors |
| 5 Clinical | `/clinic` consult | ✅ | **Phase 5 built:** full consultation workbench (chief complaint, exam, diagnosis chips, structured Rx builder + templates, investigations, follow-up) matching `design/mockups/auriva-clinical.html` + signed printable visit summary. Rx persisted as structured data; **investigations → real LabOrder**; **Lab worklist** view in `/clinic` results them (`/api/clinic/lab`). Browser-verified 1280/390, 0 errors |
| 6 Practice Ops | `/staff/*` | 🟡 | warm (multi-clinic) |
| 6B Financial | `/staff/billing` | 🟡 | warm |
| 7 Admin/Org | `/admin/*` | 🟡 | warm |
| 8 Platform Services | `/admin/events` | 🟡 | warm |
| 9 Notifications | — | ⛔ | not built (green-field) |
| 10 Reports/Analytics | `/admin/command-center` | 🟡 | warm |
| 11 Settings | `/clinic` settings, `/patient/settings` | 🟡 | warm |
| 12 Production readiness | — | ⛔ | a11y/routes/perf pass |

---

## Responsiveness — ✅ VERIFIED (2026-07-12)
All marketing + auth routes browser-checked at **390px (mobile) and 1280px (desktop)** — **0 horizontal overflow, 0 console errors** on every screen: `/`, `/platform`, `/solutions`, `/pricing`, `/about`, `/trust`, `/get-started`, `/login`, `/login?as=patient`, `/start`, `/book-demo`, `/contact-sales`. Homepage provider **timeline** and patient **phone-mock** render at both widths. Fixed: provider-timeline grid track `1fr`→`minmax(0,1fr)` (min-content was forcing mobile overflow). Decorative dark-section glows confirmed clipped by `overflow-hidden`.

---

_Last updated: 2026-07-12 — **PATIENT APP ✅ rebuilt mobile-first** (phone shell + bottom nav Home/Book/Records/Family/You; superseded routes redirected; browser-verified 390/1280) + **PHASE 1 ✅** (responsiveness verified 390/1280) + **PHASE 5 clinical ✅** (consultation workbench + signed visit summary + structured Rx + investigations→LabOrder + `/clinic` Lab worklist; browser-verified) + auth **account-linking screen ✅** (`329a82e`). Prototype HTML mockups in `design/mockups/` (13 files). Working on branch `claude-code-work` (worktree `/Users/goldy/Desktop/healthcare-platform`); parallel branch `claude-web-work` (worktree `/Users/goldy/Desktop/Auriva-web`). Next: Phase 3/4 workspace pixel-match, then multi-clinic phases 6–11._
