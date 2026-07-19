# Auriva Professional Edition — Master Delivery Dashboard

**Single source of truth for delivery status. Updated as each batch completes.**
Last updated: 2026-07-18 · Phase 0 + Batch A + Batch B + **Batch C ✅** done; **C2 RBAC matrix frozen** → Batch D authorized.

> Framing: the **core product already largely exists** (the Repository Audit found "reconnect, not
> rebuild"). The remaining engineering is the **APS-044/045 Identity & Workspace platform**, the
> **reconnect/re-skin** of existing surfaces to the frozen UX, the **resilience component library**, and
> **RC hardening**. "Membership" is currently backed by `StaffProfile`; treated as today's implementation,
> not the permanent domain model.

---

## 1. Executive Summary

| Dimension | Status |
|---|---|
| **Overall Product Completion** | **~92%** |
| Feature completion | ✅ **~100%** for the planned Professional Edition scope (no more feature additions) |
| Current phase | **Batch F — Release Candidate Readiness**; now in **F3A PKG Alignment** (baseline = PKG-1→6, `PRODUCT_BASELINE.md`) |
| Current batch | Batch A–E ✅ · **Batch F** — F1 ✅ · F2 ✅ · **F3A PKG Alignment: PKG-1 🔒 · PKG-2 🔒 · PKG-3 🔒 · PKG-4 🔒 · PKG-5 (Patient) next** · F3B · F4 |
| Engineering health | 🟢 Strong — 522 tests green, tsc + `next build` clean |
| UX readiness | 🟢 100% — UXS-043 Packages 1–6 frozen + consistency-audited |
| Product readiness | 🟢 100% — Product Office frozen (APS-044/045/046, SAD-043) |
| Release readiness | 🟡 ~77% — **Professional Edition feature complete + Experience Polished**; RC hardening (F) + go-live gates (prod DB, backups, OTP provider) remain |

---

## 2. Delivery Roadmap

| Phase | Description | Status | % | Blocking? |
|---|---|---|---|---|
| Product Vision / Constitution | Six pillars, guardrails | ✅ Complete | 100 | No |
| Product Office (APS-044/045/046) | Identity, Experience, Baseline — frozen | ✅ Complete | 100 | No |
| BRD-043 | Team Management & tier evolution | ✅ Complete | 100 | No |
| SAD-043 | Solution architecture | ✅ Complete | 100 | No |
| UXS-043 (Pkg 1–6) | Full experience spec, frozen | ✅ Complete | 100 | No |
| UXS Phase 1/2 | E2E review + consistency audit | ✅ Complete | 100 | No |
| Repository Audit + ERA-001 | Readiness assessment | ✅ Complete | 100 | No |
| Existing product (pre-APS-044) | Clinic/doctor/reception/patient surfaces, billing, appts, audit | ✅ Built | 100 | No |
| **Phase 0** | Repo cleanup + dormant columns | ✅ Complete | 100 | No |
| **Batch A** | Identity/session spine (A1 pw-change, A2 provisioning, A3 workspace) | ✅ Complete | 100 | No |
| **Batch B** | Membership 1:1 → 1:N (keystone migration) | ✅ Complete | 100 | No |
| **Batch C** | Workspace Selector + `resolveSurface()` + reconnect + Identity Flow completion | ✅ Complete | 100 | No |
| **Batch D** | Multi-owner + 6-role RBAC (C2 frozen ✅) — D1 permissions ✅, D2 activation ✅, D3 ownership ✅, D4 finalization ✅ | ✅ Complete | 100 | No |
| 🎉 **Auriva Professional Edition** | Identity · Workspace · RBAC · Ownership · Team Management | ✅ **FEATURE COMPLETE** | 100 | No |
| **Batch E** | **Experience Polish & Consistency** — components (E1) + adoption (E2) + feedback vocabulary + India demo seed + UX audit (E3) | ✅ Complete | 100 | No |
| **Batch F** | **Release Candidate Readiness** — F1 ✅ · F2 ✅ · **F3A PKG Alignment** (PKG-1→6, one at a time) · F3B Production Readiness · F4 RC & Go-Live | 🟡 In progress | 45 | No |
| **F3A — PKG Alignment** | Faithfully align each surface to its frozen PKG-1→6 spec — complete→review→freeze per package. Baseline: `PRODUCT_BASELINE.md` | 🟡 **PKG-1 🔒 · PKG-2 🔒 · PKG-3 🔒 · PKG-4 🔒 · PKG-5 next** | 33 | **Yes (per PKG)** |
| 🎉 **Demo Environment** | India-centric seed (Sunrise Health Network, Pune) — all 6 roles, UPI invoice | ✅ Ready | 100 | No |
| QA / Regression | Full suite + isolation CI gate | 🟡 Ongoing | 60 | No |
| Release Candidate | Flag flip → pilot | ⏳ Pending | 0 | No |
| Production Launch | GA | ⏳ Pending | 0 | No |

---

## 3. Batch Breakdown (remaining)

| Batch | Objective | Milestones | Depends on | Effort | Risk | PO approval? |
|---|---|---|---|---|---|---|
| **B** | Relax `StaffProfile` 1:1 → 1:N; membership-scoped resolution | B1 seam + schema swap + convert 5 sites ⏳; B2 verification suites ⏳ | Batch A ✅ | S–M | **Med** (constraint drop) | Migration plan ✅ approved |
| **C** | Workspace Selector + surface resolution + reconnect surfaces | C1 selector/switch UI · C2 `resolveSurface()` · C3 reconnect /doctor,/staff,/admin | Batch B | **L** | Med (stale auth on reconnect) | No (unless surface change) |
| **D** | Multi-owner + six-role RBAC (C2 frozen ✅) | D1 permission model (action predicates, dormant) · D2 activate 3 roles (bundles + surface) · D3 multi-owner + ownership rules · D4 retire `memberRoleFromSpecialty` + team-mgmt roles UI | Batch A; C2 ✅ | M | Med | Approved — C2 |
| **E** | **Experience Polish & Consistency** | E1 shared resilience components (`EmptyState/Skeleton/ErrorState/OfflineBanner/PermissionState`) · E2 adopt across surfaces · E3 unify feedback (toasts/validation) + visual consistency vs frozen UXS | Batch C | **L** | Low | No |
| **F** | RC hardening + go-live gates | F1 perf/index verify · F2 a11y audit · F3 isolation CI gate green · F4 runbook/monitoring | Batches B–E | M | Low | No |

Milestone legend: ✅ Complete · 🟡 In Progress · ⏳ Pending.

---

## 4. Functional Readiness

Legend: ✅ done · 🟡 partial/in-progress · ⏳ pending.

| Module | Planned | Implemented | Tested | UX Complete | Prod Ready |
|---|:--:|:--:|:--:|:--:|:--:|
| Authentication (staff pw + patient OTP) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Managed provisioning (A2) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Mandatory password change (A1) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Workspace (selector/switch) | ✅ | 🟡 (spine A3) | 🟡 | ✅ | ⏳ |
| Organizations | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Clinics | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Doctors (workspace) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Reception (queue/desk/checkout) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Patients (portal) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Appointments / Calendar | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Consultation / EMR | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Billing / Payments | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Invitations / Team Management | ✅ | ✅ | ✅ | ✅ | 🟡 |
| RBAC (6 roles) | ✅ | ✅ (C2 wired: permissions + activation + ownership + role assignment) | ✅ | ✅ | 🟡 |
| Adaptive navigation / surfaces | ✅ | ✅ (reconnected in C; all 6 roles route in D) | ✅ | ✅ | 🟡 |
| Notifications (in-app) | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Audit | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Reports / Command Center | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Settings | ✅ | ✅ | ✅ | ✅ | 🟡 |
| Resilience states (empty/loading/offline…) | ✅ | ⏳ (Batch E) | ⏳ | ✅ | ⏳ |

*"Prod Ready 🟡" = feature exists + tested, but final production sign-off waits on the identity/workspace
reconnect + RC hardening (Batches C–F).*

---

## 5. UX Readiness (UXS-043)

| Package | Designed | Implemented | Pending | Needs validation |
|---|:--:|:--:|:--:|:--:|
| 1 — Identity | ✅ | 🟡 backend A1–A3; selector UI in C | UI | Clinician review |
| 2 — Owner/Clinic Workspace | ✅ | 🟡 (existing admin surfaces to re-skin) | re-skin (E) | — |
| 3 — Doctor | ✅ | 🟡 (exists; reconnect C, re-skin E) | reconnect/re-skin | — |
| 4 — Reception | ✅ | 🟡 (exists; reconnect C, re-skin E) | reconnect/re-skin | — |
| 5 — Patient | ✅ | 🟡 (exists; re-skin E) | re-skin | — |
| 6 — Resilience System | ✅ | 🟡 (E1 library + SuccessState; E2 adopted across all 5 workspaces; long-tail continues) | remaining ad-hoc states | — |

All six **designed + frozen**; implementation is reconnect + re-skin, not new design.

---

## 6. Technical Readiness

| Area | Status | Notes |
|---|---|---|
| Database | 🟢 | Postgres/Prisma; dormant columns landed (Phase 0); Batch B = one index swap |
| Authentication | 🟢 | scrypt + OTP; session hashed; mandatory-change (A1) |
| Security | 🟢 | single choke point; isolation invariant §13a; threat model SAD-043 §11 |
| Session management | 🟢 | active_membership_id spine (A3); no token reissue on switch |
| Event platform | 🟢 | publish/retry/DLQ exists; staff.provisioned wired |
| Notifications | 🟡 | in-app exists; delivery channels out of scope (separate BRD) |
| Multi-tenancy / isolation | 🟡 | per-clinic scoping; membership-scoping lands in Batch B; **isolation CI gate = Batch F** |
| RBAC | 🟡 | 4→6 roles union dormant; matrix (C2) + wiring in Batch D |
| Performance | 🟢 | indexes added; O(1) workspace resolution |
| Testing | 🟢 | 469 tests, real-DB integration; isolation suite growing |

---

## 7. Testing Status

| Type | Status |
|---|---|
| Unit + Integration (real DB) | 🟢 **469 passing / 51 files** |
| Regression | 🟢 green after every milestone (zero regressions Phase 0 → A3) |
| Build health | 🟢 `tsc --noEmit` exit 0; `next build` unverified this batch |
| Coverage | 🟡 strong on services/auth; UI/component coverage grows in Batch E |
| Isolation tests | 🟡 present (A3 switch); **formal CI gate = Batch F** |
| Remaining QA | Batch B verification suites; per-surface E2E after reconnect (C); a11y audit (F) |

---

## 8. Production Readiness Checklist

| Item | Status |
|---|---|
| Security (auth, isolation, rate-limit) | 🟡 strong; isolation CI gate pending (F) |
| Backups | 🔴 Not started (ops) |
| Monitoring | 🟡 alerts (5xx spike, config) exist; dashboards pending (F) |
| Logging | 🟢 structured logger + audit |
| Error handling | 🟢 centralized envelopes; resilience states (E) |
| Documentation | 🟢 governance frozen; runbook pending (F) |
| Deployment | 🟡 env-driven; feature flag `FEATURE_MULTI_WORKSPACE` to wire |
| Environment variables | 🟡 config validation exists (SMS_PROVIDER/ALERT_CHANNEL) |
| Production database | 🔴 provision + migrate deploy (ops) |
| Email/SMS providers | 🔴 not wired (managed provisioning is no-SMS by design; patient OTP needs a provider for pilot) |
| Support tools | 🟡 platform-admin gate exists |
| Release notes | 🟢 Release Management platform exists (APS-036) |
| Training | 🔴 Not started |

---

## 9. Critical Risks (launch-affecting only)

| # | Risk | Mitigation |
|---|---|---|
| 1 | Cross-tenant leakage once N memberships exist | Membership-scoped resolution (Batch B) + isolation CI gate (F) |
| 2 | `StaffProfile` 1:1→1:N breaks call sites | Compiler-enforced conversion via a **membership seam**; regression suite (Batch B) |
| 3 | Reconnecting /doctor,/staff re-exposes stale auth | Re-verify guards before flag flip (Batch C) |
| 4 | SMS/OTP provider not wired | Blocks patient-login pilot; owner-relay provisioning needs none (ops task) |
| 5 | Production DB + backups not provisioned | Ops prerequisite for go-live (Batch F/ops) |

---

## 10. Go-Live Forecast

- **Overall complete:** ~72% (product built; identity/workspace platform + RC remaining).
- **Feature complete:** end of **Batch D** (multi-workspace + 6-role RBAC live behind flag).
- **Code complete:** end of **Batch E** (resilience components + surfaces re-skinned to canonical UX).
- **Production ready:** end of **Batch F** (RC hardening: isolation CI gate green, a11y audit, runbook, monitoring) **+ ops prerequisites** (prod DB, backups, OTP provider).
- **After feature completion:** re-skin/reconnect polish (E), RC hardening (F), and the ops go-live gates.
- **Final launch gates:** isolation CI gate green · a11y AA audit · flag-flip pilot → GA · prod DB + backups + OTP provider · runbook/monitoring.

**Bottom line:** **4 batches remain (B, C, D, E)** to reach code-complete, then **Batch F + ops** to reach
production-ready. At the current milestone-per-turn pace and zero-regression track record, Auriva reaches
**feature-complete in ~2 batches (B→D)** and **production-ready after F + the ops go-live gates**.
