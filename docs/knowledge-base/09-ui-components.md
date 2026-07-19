# 09 — UI Components

← [08 Business Rules](./08-business-rules.md) · [Index](./00-README.md) · Next: [10 Design System](./10-design-system.md)

Auriva's rule: **one canonical component name → one implementation → one QA vocabulary.** This table is that vocabulary (Deliverable C of the UXS-043 Phase 2 consistency audit). Build each once; reuse everywhere; never hand-roll a second empty/error/loading/permission block.

## The Resilience State System — `src/components/ui/states.tsx`

The keystone deliverable of PKG-6. Replaces what had been ~20 hand-rolled "empty" blocks and ~47 ad-hoc loading spinners with one shared vocabulary.

| Component | Purpose | Behaviour |
|---|---|---|
| `EmptyState` | Nothing here yet | Neutral, dashed border, muted icon chip (default `Inbox`), title + optional description + optional action. **Empty ≠ error** — often good news, said warmly ("Waiting room is clear. You're all caught up.") |
| `ErrorState` | Something failed — **3 tiers** | `tier="recoverable"` (default, calm, **Retry**) · `tier="action"` (amber, an action failed, **Try again**) · `tier="critical"` (red, **Contact support**). Every tier: icon + plain-language cause + one recovery action — never a stack trace or an error code |
| `PermissionState` | Signed in, but this area isn't in the caller's role | Calm, non-alarming; explains in plain language + names a path ("Ask your practice owner if you need it") — never a bare 403 |
| `SuccessState` | A completed action worth a full-page moment | Used for booking confirmation and checkout — not for every small win (those are `Toast`) |
| `LoadingState` | A centred spinner for the loading *moment* itself (bootstrapping/indeterminate cases) | Content-shaped loading always prefers `Skeleton` instead — `LoadingState`'s spinner is reserved for cases with no known final shape |

**Shared visual grammar (`StateShell`):** dashed rounded-xl card (empty) or solid/tinted card (error/permission/success), a size-12 muted icon chip, `text-sm font-medium` title, `text-xs text-muted-foreground` description — this consistent shape is *why* adoption across five workspaces was a clean swap, not a redesign.

## Other shared `components/ui/*` primitives

| Component | File | Purpose / where used |
|---|---|---|
| `Skeleton` | `ui/skeleton.tsx` | Content-shaped loading placeholders that mirror the final layout (card/row/lane/hero/timeline) — never spinner-only for content regions. Shimmer respects `prefers-reduced-motion` (static tint when reduced) |
| `OfflineBanner` | `ui/offline-banner.tsx` | Mounted globally in the root layout. Non-blocking banner: "You're offline. We'll sync automatically when you're back online." Reads stay visible from last sync; writes queue locally |
| `Toaster` / `Toast` | `ui/sonner.tsx` (via `sonner`) | Transient confirmation, auto-dismiss ~2.5s. The default for most small wins (saved, sent, collected) |
| `Dialog` | `ui/dialog.tsx` | Blocking decisions / destructive confirmation (Suspend, Archive, Checkout, Walk-in) |
| `Sheet` | `ui/sheet.tsx` | Slide-in drawer pattern (e.g. appointment detail drawer) |
| `DropdownMenu` | `ui/dropdown-menu.tsx` | Row actions (⋯ menu on Team roster rows) |
| `Select` | `ui/select.tsx` | Structured single-choice pickers (role, doctor filter, payment method) |
| `Badge` | `ui/badge.tsx` | Status chips (role chips, membership status, appointment status dot+label) |
| `Button` | `ui/button.tsx` | Primary/secondary/destructive hierarchy; staff = pine primary, patient = honey primary (see [10](./10-design-system.md)) |
| `Avatar` | `ui/avatar.tsx` | Initials-based avatars throughout (staff roster, patient headers) |
| `Table` | `ui/table.tsx` | Structured lists (Team roster, Doctor's Patients table) |
| `Command` | `ui/command.tsx` | ⌘K command palette (staff, via `admin/command-palette.tsx`) |
| `Input` / `Textarea` / `Label` | `ui/input.tsx`, `ui/textarea.tsx`, `ui/label.tsx` | Form primitives |
| `ScrollArea` | `ui/scroll-area.tsx` | Contained scroll for wide content (tables/boards/calendars) — the page body itself never scrolls sideways |
| `Separator`, `Tooltip` | `ui/separator.tsx`, `ui/tooltip.tsx` | Layout/affordance primitives |

## Notification pattern taxonomy (when to use which)

| Pattern | Use for | Duration |
|---|---|---|
| **Toast** | Transient confirmation (saved, sent, collected) | auto-dismiss ~2.5s |
| **Banner** | Persistent context (offline, plan expiring) | until resolved |
| **Inline / `InlineMessage`** | Field/section validation & recoverable errors | until fixed |
| **Modal** | Blocking decisions / destructive confirmation | until actioned |
| **`Callout`** | Contextual guidance/instruction inside a card | persistent, non-dismissive |

## `WorkspaceSwitcher` — `src/components/shared/workspace-switcher.tsx`

- **Where it lives:** the top bar of every staff shell (doctor, staff, admin/workspace).
- **Behaviour:** renders `[mark] Clinic · Role ▾` on **every** staff surface. A single-membership account gets a **static label** (no dropdown affordance — there is nothing to switch to). 2+ memberships: clicking opens the Selector overlay (same component family as `/workspace`); picking a workspace triggers `POST /api/workspace/switch`, then a decisive content reload.
- **This was a real Phase-1 finding (F2):** the chip existed in three different visual formats across P1/P2/P3 and was **entirely absent** from Reception (P4) — standardized as part of the Phase 2 consistency audit and added to the reception topbar.

## `WorkspaceSelector` — `src/components/workspace/workspace-selector.tsx`

Backs both the `/workspace` full-page selector (post-login, 2+ memberships) and the switcher's dropdown overlay (mid-session switch) — one implementation, two entry points.

## Surface-specific composites

| Component | Surface | Purpose |
|---|---|---|
| `QueueBoard` / `QueueColumn` / `QueueCard` (`staff/queue-board.tsx`, `queue-column.tsx`, `queue-card.tsx`) | Reception | The 3-lane front-desk board — lanes, per-card wait-aging colour, per-stage action button |
| `ConsultWorkbench` (`doctor/consult-workbench.tsx`) | Doctor | The 3-column consultation surface — stepper, safety strip, form, sticky Sign & complete footer |
| `QueueSidebar` (`doctor/queue-sidebar.tsx`) | Doctor | The left queue rail inside the Workbench |
| `ContextPanel` (`doctor/context-panel.tsx`) | Doctor | The right context rail — allergy/condition alerts, last-visit timeline, up-next preview |
| `MissionControlBar` (`doctor/mission-control-bar.tsx`) | Doctor | The Today daybar — greeting, date, clinic, "N min behind," next-patient chip |
| `PrescriptionEditor` (`doctor/prescription-editor.tsx`) | Doctor | Medicine rows + template application |
| `ActionCenter` (`doctor/action-center.tsx`) | Doctor | Quick actions row on Today |
| `AnalyticsStrip` (`doctor/analytics-strip.tsx`) | Doctor | Metrics row (patients/waiting/completed) |
| `ReceptionCalendar` (`staff/reception-calendar.tsx`) | Reception | Wraps `ClinicCalendar` in read-only mode for the front desk |
| `BillingBoard` (`staff/billing-board.tsx`) | Reception | The Desk's to-collect list + checkout entry point |
| `WalkinModal` (`staff/walkin-modal.tsx`) | Reception | The walk-in registration dialog |
| `SummaryCards` (`staff/summary-cards.tsx`) | Reception | Awareness-strip style stat cards |
| `LabWorklist` (`staff/lab-worklist.tsx`) | Reception/Technician | Diagnostics/results worklist |
| `PatientTimeline` (`staff/patient-timeline.tsx`) | Reception | A patient's visit history, reception view |
| `GlobalSearch` (`staff/global-search.tsx`) | Reception | Cross-record search |
| `CommandCenter` (`admin/command-center.tsx`) | Owner | The full Command Center layout |
| `StaffTable` (`admin/staff-table.tsx`) | Owner | The Team roster table |
| `InviteDialog` (`admin/invite-dialog.tsx`) | Owner | The 6-role invite modal |
| `ActivityPanel` (`admin/activity-panel.tsx`) | Owner | Recent-activity feed on Command Center |
| `EventHub` (`admin/event-hub.tsx`) | Owner | Event Platform visibility view |
| `SetupChecklist` (`admin/setup-checklist.tsx`) | Owner | Guided onboarding checklist |
| `CommandPalette` (`admin/command-palette.tsx`) | Owner | ⌘K quick-navigation |
| `PatientShell` (`patient/patient-shell.tsx`) | Patient | The bottom-tab mobile shell + centered phone frame on desktop |
| `HealthVault` (`patient/health-vault.tsx`) | Patient | Recommended-tests + prep + status + report upload |
| `HealthSummaryDialog` (`patient/health-summary-dialog.tsx`) | Patient | Allergies/chronic-conditions/emergency-contact editor |
| `NotificationCenter` (`patient/notification-center.tsx`) | Patient | In-app notification list |
| `AppointmentDrawer` (`shared/appointment-drawer.tsx`) | Cross-surface | Appointment detail slide-in, reused wherever an appointment needs a closer look |
| `TimelineCard` (`shared/timeline-card.tsx`) | Cross-surface | The visit-timeline entry, used by both patient Records and staff patient-detail views |
| `PrintButton` (`shared/print-button.tsx`) | Cross-surface | Triggers the browser-native `/print/*` routes |
| `WhatsNew` (`shared/whats-new.tsx`) | Cross-surface | The Release Management bell/unread-count UI |
| `ClinicCalendar` (`clinic/clinic-calendar.tsx`) | Solo + Reception | The single calendar implementation reused read-only by Reception and read-write by the solo owner-doctor |
| `ConsultationWorkbench` (`clinic/consultation-workbench.tsx`) | Solo | The solo-surface's consult flow (parallel to the Doctor Workbench, tuned for the consolidated `/clinic` context) |
| `TeamPanel` / `TeamRoster` (`clinic/team-panel.tsx`, `team-roster.tsx`) | Solo | The solo surface's simplified team view |
| `PracticeSetup` (`clinic/practice-setup.tsx`) | Solo/Doctor | Clinic profile editor (logo, cover, about, facilities, gallery, documents, social) |
| `DiagnosticsSelector` (`clinic/diagnostics-selector.tsx`) | Solo/Doctor | The recommend-a-test picker feeding `TestRecommendation` |
| `ConsultTemplates` (`clinic/consult-templates.tsx`) | Solo/Doctor | SOAP template management (`ClinicalTemplate`) |
| `PlanScreen` (`clinic/plan-screen.tsx`) | Solo | Seat usage + upgrade-request UI |
| `AvailabilitySettings` / `TimeOffSettings` (`clinic/availability-settings.tsx`, `time-off-settings.tsx`) | Solo/Doctor | `DoctorAvailability` + `DoctorTimeBlock` editors |

## Marketing components

| Component | Purpose |
|---|---|
| `SiteHeader` / `SiteFooter` (`marketing/site-header.tsx`, `site-footer.tsx`) | Public nav/footer, dropdown mega-menus (Products/Solutions/For Patients/Company) |
| `PageHero` / `Container` (`marketing/page-hero.tsx`, `container.tsx`) | Shared marketing page layout primitives |

## Experience Behaviour Matrix (the contract every component above must satisfy)

| Situation | Rule (all surfaces) |
|---|---|
| Loading | Skeletons matching final layout — never spinner-only; perceived-instant < 400ms |
| Empty | Always a reason + one next action; never "No data" |
| Offline | Non-blocking banner + auto-sync; reads stay from last sync; never a blocking wall |
| Error | Icon + plain cause + recovery action; never a raw/technical message |
| Permission | Explain + offer a path; capabilities absent, not greyed; never a 403 wall |
| Slow network | Micro-state feedback ("Saving…" → "Saved"); optimistic where reversible |
| Destructive | Modal + explicit consequence, separated from the primary action |
| Success | Confirmation + optional next action; toast for most, a full screen only for booking/checkout |
| Long-running | Show progress · run in background · notify on completion · never freeze the UI |

Any new screen must satisfy every relevant row of this matrix before it ships — this is Principle 14 of [02-product-constitution.md](./02-product-constitution.md).
