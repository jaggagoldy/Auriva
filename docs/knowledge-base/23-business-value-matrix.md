# 23 — Business Value Matrix

> **The one question this answers:** *"Why does a clinic pay for this?"* — features expressed as **business value**, not capabilities.
> Use this to prioritize the roadmap: build/keep what a clinic owner would pay for; challenge what they wouldn't. Pairs with [17 Roadmap](17-roadmap.md) and the [Feature Matrix in 06](06-feature-catalog.md).

## The core value chain

Auriva's paid-for promise: **more patients seen per day, no revenue leaking, and a practice that feels calm and professional.** Every feature below maps to *time saved*, *money captured*, or *trust built*.

| Feature | Why the clinic pays for it | Value type | Pillar |
|---|---|---|---|
| **Online + phone booking** | Fills the doctor's day without a receptionist on the phone all day; fewer no-shows via reminders. | Revenue ↑ · Time ↓ | Patient Engagement |
| **Reception queue board** | One screen runs the whole waiting room; new staff are productive in minutes; the room *keeps moving*. | Time ↓ · Trust ↑ | Practice Operations |
| **Wait-aging on the board** | The desk naturally serves the longest waits first → fewer angry patients, better reviews. | Trust ↑ | Practice Operations |
| **Walk-in in <20 seconds** | Captures walk-up revenue without friction; no one leaves because "reception is busy." | Revenue ↑ | Practice Operations |
| **Consult Workbench** | Doctor documents + prescribes in one place → shorter consults, more patients/day, complete records. | Revenue ↑ · Time ↓ | Clinical Excellence |
| **Clinical safety chips** | Allergies/conditions surfaced at point of care → fewer errors, lower liability. | Trust ↑ (risk ↓) | Clinical Excellence |
| **E-prescription + templates + print** | Legible, fast, repeatable prescribing; a professional artifact the patient keeps. | Time ↓ · Trust ↑ | Clinical Excellence |
| **Invoice auto-drafts on completion** | **The revenue-leak killer** — no visit ends without a bill waiting to be collected. | Revenue ↑↑ | Financial Operations |
| **Desk checkout (UPI/Cash/Card → receipt)** | Money is collected *before the patient leaves*; the cash cycle is never a dead end. | Revenue ↑↑ | Financial Operations |
| **Lab order → result loop** | Tests ordered from the consult and results returned to the record → no lost paperwork, add-on revenue. | Revenue ↑ · Time ↓ | Clinical Excellence |
| **Patient app (Records/Bills/Family)** | Patients self-serve their history & bills → fewer "can you resend my report?" calls; stickiness. | Time ↓ · Retention ↑ | Patient Engagement |
| **Family sharing (one phone → many profiles)** | A parent manages the whole family from one login → the clinic owns the *household*, not one patient. | Retention ↑ | Patient Engagement |
| **Team / RBAC** | The owner delegates safely — staff see only what their role needs; last-owner protection. | Trust ↑ (control) | Platform Foundation |
| **Multi-clinic / Organization** | Grow from one clinic to a group without changing tools → Auriva scales with the business. | Retention ↑ (expansion) | Organization Intelligence |
| **Command Center** | The owner sees "what is my practice doing *right now*" across doctors → operational confidence. | Trust ↑ | Organization Intelligence |
| **Audit log** | Every action attributed → disputes, compliance, and accountability are answerable. | Risk ↓ | Platform Foundation |
| **Reassurance-first patient UX** | The practice looks *modern and caring* → better reviews, word-of-mouth, premium positioning. | Brand ↑ | Patient Engagement |

## The "would a clinic owner pay for this?" test

Every proposed feature is scored against the same four questions from [AGENTS.md](../../AGENTS.md):

```
1. Does it solve a real healthcare workflow?
2. Would a clinic owner pay for this capability?
3. Does it strengthen one of the six pillars?
4. Could another mature SaaS already do it better?   ← if yes, integrate, don't build
```

**Value concentration:** the two highest-ROI features are the ones that stop revenue leaking — **auto-drafted invoices** and **desk checkout**. Everything else compounds time-savings and trust on top of a practice that is, first, getting paid for every visit.

## What deliberately has *low* direct pay-for value (and why we still do it)

| Item | Why it's not directly monetized |
|---|---|
| Resilience system (empty/error/offline) | Invisible when it works — but its absence destroys trust. Table stakes. |
| Warm patient design | Doesn't bill anything directly; it's the **brand moat** that wins referrals and premium positioning. |
| Events/audit platform | Infrastructure a clinic never sees — the foundation that makes everything else trustworthy and extensible. |
