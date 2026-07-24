# M3B · B5 — Financial Corrections Framework — Completion Report

**Result:** ✅ PASS. Corrections are **compensating artifacts** (Credit Notes + Refunds); a paid invoice is **never edited**. **607/607** tests, tsc/lint/build clean. This completes M3B.

## Completed work
**Backend**
- Models `CreditNote` (→ invoice, cascade) + `Refund` (→ credit note, cascade) — additive migration. The original invoice is untouched.
- `corrections-service`: `issueCreditNote` (paid invoice only; ≤ invoice total − already-credited; reason required), `issueRefund` (≤ credit note − already-refunded; fully-refunded → CN `refunded`), `getInvoiceCorrections` (history). Audited (`credit_note_issued`, `refund_issued`).
- `credit_note` + `refund_receipt` are now **B3 document types** — each correction persists an immutable Document (unified numbering `CN-` / `RFND-`), viewable/printable via the existing viewer + renderer bodies.
- API `/api/clinic/corrections` — **owner-authorized** (`canAccessAdminPortal`) for issuing; history is reception-visible.

**Frontend**
- Checkout Workspace **Corrections panel** (side rail, when the invoice has payments): Issue Credit Note → Record Refund + history. Reuses the workspace — no new flow.
- Completion overlay gated to **just-paid** (reopening a paid invoice shows corrections, not the celebration).
- B4 refinement folded in: gate button **"Start anyway" → "Continue Without Payment."**

## Tests
`corrections-service.test.ts` (+4): credit note + document with invoice untouched; guards (over-total, blank reason, unpaid); refund ≤ credit-note, partial vs full → status, refund_receipt docs; total credit capped at invoice value. Full suite **607/607**; 0 new lint.

## QA (owner `9876500001` → /staff, since issuing is owner-only)
1. Checkout a visit → collect full payment → completion → Done.
2. Reopen the paid invoice (board → Checkout) → side rail **Corrections**.
3. **Issue Credit Note** (amount + reason) → appears; original invoice unchanged (still Paid).
4. **Record refund** (≤ credit note) → partial shows `refunded ₹X`; full flips to `refunded`.
5. Open the Credit Note / Refund Receipt from **Clinical Artifacts** → print/PDF.
6. As reception (non-owner), issuing is blocked (403) — history still visible.

## Architecture changes
- Corrections follow accounting principles: **immutable paid invoice → compensating credit note → refund**; financial history is append-only. No invoice edit path exists.
- Reused Revenue Foundation, Checkout Workspace, Document Platform, and audit — no duplicated flows.

## Technical debt
- Line/event-level credit notes (link to reversed ServiceEvents) — amount-based for now.
- Owner-only issuing is role-based (`canAccessAdminPortal`); finer approval (BRD-044 authority tiers) later.
- `/doctor` gate dialog reuse (from B4) still pending.

## Next
**M3B is complete** (M3A → B1 → B1b → B2 → B3 → B4 → B5). Recommended next: a **Stabilization checkpoint** — retire the legacy consultation-fee path (all entry points now flow through ServiceEvents), retire superseded UI, perf review, full E2E + regression, targeted doc cleanup — leaving a clean, production-ready Revenue & Visit Experience before the next capability area.
