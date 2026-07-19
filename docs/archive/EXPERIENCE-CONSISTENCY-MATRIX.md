# Experience Consistency Matrix (F3B-1)

Executive consistency view across every major workspace, against the frozen PKG-1→6 baseline + shared resilience system.
Legend: ✅ consistent · 🟡 minor variance (P2/P3, tracked) · — n/a · Status = overall readiness.

| Workspace | Navigation | Header | Empty | Loading | Error | Success | Responsive | A11y | Status |
|---|---|---|---|---|---|---|---|---|---|
| **Identity** (`/login`, `/workspace`, `/change-password`) | — | ✅ split-shell / auth-card | — | ✅ button spinner | ✅ inline (3-tier avail.) | — (redirect) | ✅ collapses < lg | ✅ labels, focus | ✅ Frozen |
| **Owner** (`/clinic`, `/admin`) | ✅ sidebar spine | ✅ date/Practice-Health | ✅ EmptyState | ✅ skeletons | ✅ ErrorState + retry | ✅ toast + action-links | 🟡 dense dashboards | ✅ | ✅ Frozen |
| **Reception** (`/staff`) | ✅ sidebar + Calendar | ✅ "Today's flow" hero | ✅ EmptyState | ✅ skeletons | ✅ ErrorState + retry | ✅ toast / checkout screen | 🟡 dense queue | ✅ | ✅ Frozen |
| **Doctor** (`/doctor`) | ✅ sidebar spine | ✅ daybar (greeting/metrics/behind) | ✅ EmptyState | ✅ skeletons | ✅ ErrorState | ✅ toast | 🟡 3-col workbench dense | ✅ | ✅ Frozen |
| **Patient** (`/patient`) | ✅ bottom nav (5) | ✅ mobile hero | ✅ EmptyState (warm) | ✅ skeletons | ✅ ErrorState | ✅ toast / booking screen | ✅ mobile-first | ✅ | ✅ Frozen |
| **Public Booking** (`/find-care`, `/book`) | — | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | 🟡 lighter audit |
| **Global** (offline) | — | — | — | — | — | — | — | — | ✅ `OfflineBanner` app-wide |

## Consistency notes
- **Shared vocabulary** (`states.tsx`): Empty / Loading (skeleton) / Error (3-tier) / Success / Permission / Offline — one implementation, adopted across all workspaces.
- **Two intentional header conventions** (consistent *within* context): compact sticky-bar titles (`text-sm`, dense tool surfaces) vs content-page heroes (`text-lg/xl`). Documented as a convention, not a defect (P3).
- **Densest screens** (Doctor Workbench, Reception Queue, Owner Dashboard) flagged 🟡 for manual responsive spot-check at tablet width (P2, browser verification).
