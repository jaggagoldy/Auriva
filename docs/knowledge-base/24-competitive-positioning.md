# 24 — Competitive Positioning

> **The one question this answers:** *"Where does Auriva win, and against whom?"*
> Extends [19 Competitive Analysis](19-competitive-analysis.md) with a **per-feature** comparison against named products.
>
> **⚠️ Sourcing note:** No competitor-analysis document exists in the repo. Every claim about a competitor below is **`[INFERENCE]`** from general market knowledge and **must be verified** before it's used in sales, pricing, or strategy. Competitor feature sets change; treat this as a hypothesis map, not fact.

## The competitor landscape

| Product | Primary market | Positioning `[INFERENCE]` |
|---|---|---|
| **Cliniko** | Allied health (physio, chiro), AU/UK/global | Clean practice-management + scheduling + notes + telehealth; loved for simplicity. |
| **Jane** | Allied health / wellness, North America | Beautiful booking + charting + billing + telehealth; strong brand, practitioner-first. |
| **HealthPlix** | Doctor EMR, **India** | AI-assisted EMR, fast prescription, vernacular, doctor-productivity focus. |
| **Practo Ray** | Clinic management, **India** | Scheduling + records + billing, tied to the Practo patient marketplace. |
| **SimplePractice** | Behavioral/mental health, US | Practice management + telehealth + insurance/claims + client portal. |

## Per-feature comparison `[INFERENCE — verify]`

Legend: ✅ strong · 🟡 partial/varies · ⚠️ weak/absent · ❓ unknown

| Capability | Cliniko | Jane | HealthPlix | Practo Ray | SimplePractice | **Auriva** | **Auriva advantage** |
|---|:--:|:--:|:--:|:--:|:--:|:--:|---|
| Online booking | ✅ | ✅ | 🟡 | ✅ | ✅ | ✅ | Booking is *inside* one warm patient app, not a bolt-on widget |
| **Live reception queue board** | ⚠️ | ⚠️ | 🟡 | 🟡 | ⚠️ | ✅ | **3-lane "keep the room moving" board with wait-aging** — few Western tools model the physical waiting room; India clinics live in it |
| Walk-in (<20s) | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | ✅ | First-class walk-in as a button on the board — matches Indian OPD reality |
| Consult workbench (notes+Rx+vitals in one) | 🟡 | ✅ | ✅ | 🟡 | ✅ | ✅ | Progress stepper + read-only clinical-safety chips; guided, not a blank EMR form |
| E-prescription (India-appropriate) | ⚠️ | 🟡 | ✅ | ✅ | ⚠️ | ✅ | India-first Rx + templates + print; peer to HealthPlix here |
| Cash-cycle checkout (UPI/Cash/Card) | 🟡 | ✅ | 🟡 | ✅ | ✅ (insurance) | ✅ | **UPI-first** desk checkout; invoice auto-drafts on completion — no revenue leak |
| Insurance / claims | 🟡 | ✅ | ⚠️ | 🟡 | ✅ | ⚠️ (deferred) | *Deliberately not built* — India cash/UPI-first; see [Product Bible](../AURIVA-PRODUCT-BIBLE.md) |
| Patient app (records/bills/family) | 🟡 | 🟡 | ⚠️ | ✅ (marketplace) | ✅ (portal) | ✅ | **One warm phone app + family sharing**; not "clinic software shrunk" |
| Family / multi-profile on one number | ⚠️ | ⚠️ | ⚠️ | 🟡 | ⚠️ | ✅ | **One phone → many Healthcare Profiles** — built for how Indian families actually share a number |
| Multi-clinic / group | ✅ | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | Real Organization model; grows solo → group in the same tool |
| Role-based team management | ✅ | 🟡 | 🟡 | ✅ | ✅ | ✅ | Capability model + last-owner protection; invite/suspend/archive |
| AI clinical assist | ⚠️ | ⚠️ | ✅ | ⚠️ | 🟡 | ⏳ (deferred) | Explicitly deferred to a future *clinical-intelligence* release — safety/regulatory first |
| Telehealth | ✅ | ✅ | 🟡 | ✅ | ✅ | ⏳ | Not yet — a clear roadmap gap vs Western tools |
| Owner "command center" | 🟡 | 🟡 | 🟡 | ✅ | 🟡 | 🟡 | Live operational view; depth still early |
| Design warmth / brand | ✅ (Jane esp.) | ✅ | 🟡 | 🟡 | ✅ | ✅ | **Reassurance-first patient vs efficiency-first staff** as an explicit, tokenized system |

## Where Auriva wins today (defensible)

1. **The waiting room as a first-class product.** The 3-lane board + wait-aging + walk-in speaks to Indian OPD reality that Western allied-health tools (Cliniko/Jane/SimplePractice) don't model.
2. **India-native money.** UPI/Cash-first checkout with invoices that auto-draft on completion — no insurance-claims assumption baked in.
3. **Family sharing.** One phone number → many Healthcare Profiles is architected in, not retrofitted — matches Indian household behavior.
4. **One warm patient app** that answers five questions, not a shrunken clinic tool.
5. **Healthcare-workflow-first scoping.** Auriva refuses HRMS/payroll/ERP sprawl — a focused OS, not a do-everything suite.

## Where Auriva is behind (honest gaps) `[INFERENCE]`

| Gap | Who's ahead | Roadmap |
|---|---|---|
| Telehealth / video | Cliniko, Jane, SimplePractice | [17 Roadmap](17-roadmap.md) |
| AI clinical assist | HealthPlix | Deferred clinical-intelligence release |
| Insurance / claims | SimplePractice, Jane | Deliberate non-goal for India cash-first (revisit for markets that need it) |
| Analytics depth | Practo Ray, Cliniko | Command Center is early |
| Marketplace demand-gen | Practo (Ray + Practo.com) | Not a goal — Auriva is the OS, not a lead-gen marketplace |

## Positioning statement (one line)

> **Auriva is the Healthcare Operating System built for how Indian clinics actually run** — the waiting room, the walk-in, the UPI payment, and the family on one phone — with a warm patient app on the front and a calm, capable staff console behind it. `[INFERENCE — validate messaging with real clinics]`
