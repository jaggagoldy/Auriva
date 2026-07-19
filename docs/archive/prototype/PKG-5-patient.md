# Prototype Package 5 — Patient Experience

**Series:** UXS-043 Interactive Prototype · Package 5 of 6 · **the public face of Auriva**
**Covers:** Home (Today) · Book · Records (visit timeline) · Family · You
**Status:** ✅ **APPROVED & FROZEN — v1.0** (Product Office, 2026-07-15, scored 9.7/10) after five additive refinements: (1) compact **Today Summary** on Home (appointment · medicine · payment); (2) Quick Actions reordered **Book → Records → Family → Payments**; (3) one-line **visit outcome/diagnosis** in the Records timeline; (4) **clinic name** on the appointment hero; (5) per-member **next-care status** in Family (e.g. "Vaccination due next month").
**Noted (not applied, awaiting your call):** surface **Emergency Contact** in You (safety — raised but not in the final five).
**Deferred (future backlog, NOT MVP):** *"After the Visit"* moment — a post-checkout "Take medicine 5 days · follow-up in 7 · need help? call clinic" screen; one of the most memorable moments to add later.
**Foundation:** [design/mockups/auriva-user.html](../../design/mockups/auriva-user.html) — mobile-first phone app, bottom nav, warm honey-forward palette; real `/patient/*` components.

Prototype file: [pkg-5-patient.html](./pkg-5-patient.html) (phone-framed; centred on desktop, full-bleed on mobile)

> **The clinic manages healthcare. The patient manages life.** This app is not a smaller clinic tool —
> it answers only **five questions**, and every screen maps to one:
> 1. *What do I need to do today?* → **Home (Today)**
> 2. *Can I book my doctor?* → **Book**
> 3. *What happened during my visit?* → **Records** (timeline, grouped by visit)
> 4. *Who in my family needs attention?* → **Family**
> 5. *Who am I?* → **You**
>
> **Three principles:** reassurance before information · timeline over database · **warmth over productivity.**
> The staff UI says *"Let's work."* The patient UI says *"You're being taken care of."*

---

## 1. Storyboard

```
HOME · Today  ──►  "Good morning, Goldy. You're free today."  or  next-visit card
   │                                                              (bring reports · paid)
   ├─ Book ──► find doctor ──► profile + slots ──► confirm ──► "You're booked ✓"
   ├─ Records ──► visit timeline ──► a visit ──► Dx · prescription · reports · invoice
   ├─ Family ──► switch to a child / parent (greeting changes)
   └─ You ──► profile · insurance · payments · notifications · settings
```

**Reassurance-first copy (the anxiety-reducing choice)**
- Not "No appointment" → **"You're free today."**
- Not "18 records" → **"You're all caught up."**
- Not "0 due" → **"Nothing to pay right now."**

---

## 2. Low-Fidelity Wireframes

**Home (Today)**
```
Good morning, Goldy            🔔 (GS)
Wednesday, 15 July
┌ NEXT VISIT · Today 4:30 PM ───────────┐
│ Dr. Meera Iyer · Skin consult          │
│ Bring previous reports · Payment done  │
│ [Directions]  [Reschedule]             │
└────────────────────────────────────────┘
For you today
• Take Metformin — 8:00 AM ✓ done
• Lab report ready to view
Quick:  [Book]  [Records]  [Bills]  [Reports]
```

**Records (visit timeline) / Family / You**
```
Records — you're all caught up      Family                  You
● Today   Dr. Iyer · Skin           ● You (Goldy) ✓          (GS) Goldy Sharma
   Contact dermatitis               ○ Aarav (son, 8)         AUR-1029… · +91…
● 2 Jul  Dr. Rao · Dental           ○ Meera (mother, 61)     Personal · Insurance
   Cleaning · ₹500 paid             [+ Add family member]    Payments · Notifications
● 20 Jun Dr. Shah · Physio                                   Settings · Sign out
```

---

## 3. Review Notes

| Screen | The one question it answers | Reassurance / warmth move | Source |
|---|---|---|---|
| **Home (Today)** | What do I need to do today? | Warm greeting; "you're free today" empty; next-visit as a calm dark hero, not a table | user · Home + next-visit |
| **Book** | Can I book my doctor? | Doctor profile + slots + a confirming "You're booked" moment | user · Book/doctor/slots |
| **Records** | What happened during my visit? | **Timeline grouped by visit** (real-life memory), not an EMR list; each visit opens Dx/Rx/reports/invoice | user · Records |
| **Family** | Who needs attention? | One-tap profile switch; greeting changes to that person | user · Family |
| **You** | Who am I? | Identity, insurance, payments, notifications, settings | user · You |

**Design-system fidelity:** patient palette from the mockup — warm paper, **honey as the primary CTA**
(patient warmth), pine for clinical/secondary, night-gradient hero. Phone frame, bottom tab bar, rounded
cards. Full light/dark. This deliberately reads *warmer* than the staff packages — that contrast is the brand.

---

## 4. UX Validation Checklist

| # | Check | Result |
|---|---|---|
| 1 | One question per screen | ✅ maps 1:1 to the five questions |
| 2 | Primary action obvious | ✅ Book (honey), Reschedule, View report |
| 3 | ≤3 interactions where practical | ✅ Book = doctor → slot → confirm |
| 4 | Empty/loading/permission/error | ◑ reassuring empty states ("free today", "all caught up") shown; full matrix = Package 6 |
| 5 | Reuses components | ✅ user mockup + Packages 1–4 warm system |
| 6 | Design-system compliant | ✅ patient palette (honey-forward) |
| 7 | Light + dark | ✅ parity + toggle |
| 8 | Mobile-first | ✅ phone frame; the primary target |
| 9 | Tenant isolation | ✅ patient sees only their own + linked family profiles |
| 10 | No unavailable capabilities | ✅ teleconsult/online-pay shown as gentle "soon" where applicable |
| 11 | Avoids cognitive load | ✅ Today-first; reassurance copy; timeline not database |

**Gate result:** item 4 partial by design. All else pass → cleared for review.

---

## 5. What reviewers should look for
- **Patients/Business:** does it feel *reassuring* and warm, not like "clinic software shrunk"? Is Today the right front door?
- **Product Office:** every screen answers one of the five questions; Records is a visit timeline, not an EMR.
- **Gemini UX:** reassurance copy, timeline legibility, family switch clarity, warmth vs the staff packages.
