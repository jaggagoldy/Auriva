# Post-Launch Operational & Monitoring Plan

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Release Target:** Release 1.3 / POE-001  
> **Effective Period:** Day 0 to Month 1 Post General Availability (GA)

---

## 1. DAY 0 — LAUNCH DAY SMOKE TESTING

Upon executing production deployment:

1. **Deployment Smoke Test:**
   - Execute HTTP GET `/api/health` and `/api/ready` to verify system readiness.
2. **Core Workflow Verification:**
   - Sign in as `reception@auriva.health` ➔ Verify Queue Board & Walk-in Modal.
   - Sign in as `doctor@auriva.health` ➔ Verify Consultation Workbench & Rx PDF generation.
   - Sign in as `owner@auriva.health` ➔ Verify Morning Operational Snapshot.
3. **Rollback Criterion:**
   - If error rate exceeds 0.5% or readiness returns 503 for > 2 minutes, trigger automatic rollback to `release/1.2`.

---

## 2. DAY 1 — OPERATIONAL LOG MONITORING

1. **Log Inspection & Error Spike Auditing:**
   - Monitor application server logs for 5xx HTTP response spikes or unhandled promise rejections.
2. **Database Connection Pool Health:**
   - Monitor DB query latency P99 thresholds (< 250ms SLA).
3. **Clinic Feedback Channel:**
   - Review initial receptionist and doctor usability feedback.

---

## 3. WEEK 1 — HOTFIX & TRIAGE CADENCE

1. **Daily Bug Triage Standup:**
   - Review reported user issues categorized by severity (Low, Medium, High, Critical).
2. **Patches & Hotfix Deployments:**
   - Deliver patch updates (`1.3.1`) following the standard Git workflow on `release/poe-001`.

---

## 4. MONTH 1 — FEATURE ADOPTION & ROADMAP PLANNING

1. **Product KPI Review:**
   - Measure average consultation documentation time (Target < 60s).
   - Measure cashier checkout completion speed (Target < 30s).
2. **Next Milestone Authorization:**
   - Present usage analytics to Product Office for subsequent release roadmap planning.
