# 22 — Product Journey Map

> **The one question this answers:** *"How does a single patient flow through every actor and surface, and where does ownership hand off?"*
> This is the connective tissue of Auriva — the appointment **status machine** is what links the surfaces (see [08 Business Rules](08-business-rules.md)).

## The one diagram — end to end

```mermaid
flowchart TD
    P0([Patient]) -->|books online, or phones in| BOOK[Book appointment]
    BOOK -->|status: scheduled| REC1[Reception: appointment on the board]
    WALK([Walk-in arrival]) -->|reception registers <20s| REC1

    REC1 -->|Check in · status: waiting| WAIT[Waiting lane]
    WAIT -->|Send in · status: doctor_ready| DOC1[Doctor: patient ready]
    DOC1 -->|status: in_consultation| CONSULT[Consultation · Workbench]

    CONSULT --> DOCU[Document: complaint, notes, vitals, diagnosis]
    DOCU --> RX[Prescription]
    DOCU -.optional.-> LAB[Lab order → org worklist → result]
    RX -->|Sign & complete · status: completed| DONE[Done · to collect]

    DONE -->|handoff to reception| DESK[Reception Desk: checkout]
    DESK -->|UPI / Cash / Card| PAY[Payment collected · receipt]
    PAY -->|invoice: paid| RECORDS[Patient Records · timeline]

    LAB -.result lands.-> RECORDS
    RECORDS -->|book next visit| FOLLOW[Follow-up]
    FOLLOW -.->|status: scheduled| REC1

    PAY --> ANALYTICS[Owner: Command Center · activity]
    DONE --> ANALYTICS

    classDef patient fill:#FBF0DF,stroke:#7A4E12,color:#241F1A;
    classDef reception fill:#E4EFEC,stroke:#0E7466,color:#083F37;
    classDef doctor fill:#E1EEF4,stroke:#2A7DA3,color:#241F1A;
    classDef owner fill:#F4EEE6,stroke:#8C8477,color:#241F1A;
    class P0,WALK,BOOK,RECORDS,FOLLOW patient;
    class REC1,WAIT,DESK,PAY reception;
    class DOC1,CONSULT,DOCU,RX,LAB,DONE doctor;
    class ANALYTICS owner;
```

## The handoff ledger (single visible owner at every step)

Healthcare systems fail when a task has **two owners** or **no owner**. In Auriva the **status flip is the ownership transfer**.

| Stage | Status | Owner | How the handoff is visible |
|---|---|---|---|
| Booking | `scheduled` | Patient (self) or Reception (phone-in) | Confirmation screen / appears on the board |
| Arrival | `checked_in` → `waiting` | **Reception** | Lands in the **Waiting** lane with a per-doctor count |
| Called | `doctor_ready` | **Reception → Doctor** | "Send in" moves the card; doctor sees "patient ready" |
| Seen | `in_consultation` | **Doctor** | "In consultation" lane + Workbench header |
| Finished | `completed` | **Doctor → Reception** | Card flips to **"Done · to collect"** — the reception inbox |
| Paid | invoice `paid` | **Reception** | Desk checkout → receipt; visit leaves the desk |
| Recorded | — | **Patient** (owns their vault) | Visit + Dx + Rx + "Paid" appear in the patient timeline |
| Follow-up | `scheduled` | Patient / Reception | Next-visit surfaces on patient Home; loop repeats |

## What travels with the patient (nothing silently disappears)

| Data | Enters at | Persists through |
|---|---|---|
| Identity (name, phone, Health ID `AUR-…`) | Signup / walk-in | Queue → Workbench header → Invoice → Records |
| Chief complaint / reason | Booking or walk-in | **Pre-filled** into the Workbench "Chief complaint (from booking)" |
| Diagnosis & prescription | Doctor Workbench | Patient Records visit detail |
| Amount | Doctor fee / service | Desk invoice → "Paid" in the patient timeline |
| Allergies / conditions | Profile / history | Workbench read-only **Clinical Safety** chips |

## The emotional arc (why it feels like care, not software)

```
Landing ──► Book ──► "You're booked ✓" ──► (staff handle the visit) ──► "Payment completed" ──► Records "you're all caught up"
  calm       warm        reinforced             patient never sees               reassured                held / rising
                                                 the cash desk
```

The operational "coldness" (queues, invoices, cash) is **deliberately confined to staff surfaces the patient never touches**. See [10 Design System](10-design-system.md) (honey vs pine) and [02 Product Constitution](02-product-constitution.md).
