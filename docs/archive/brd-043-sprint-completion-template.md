# BRD-043 — Sprint Completion Report Template

Subordinate to [EEP-043](./eep-043-engineering-execution-plan.md). This is a **reusable template** — copy it at the end of every sprint (Sprint 1 through Sprint 6/RC) and fill it in. No sprint is considered closed without this report submitted alongside it.

---

## Sprint Completion Report — Sprint __ (`<name>`)

**Report date:** ___
**Reported by:** ___
**Sprint dates:** ___ to ___

### Sprint Goal
*(copy verbatim from the Sprint Plan)*

### Stories Completed
| Story ID | Title | Status | Notes |
|---|---|---|---|
| | | Done / Partial / Carried over | |

### Stories NOT Completed (if any)
| Story ID | Reason | Carried to sprint | Risk if delayed further |
|---|---|---|---|

### Database Changes
- Migration(s) applied: ___
- Rollback tested: Yes/No
- Zero-downtime confirmed: Yes/No

### APIs Delivered
| Endpoint | Method | Status | Contract-tested |
|---|---|---|---|

### UI Delivered
| Screen | Matches prototype exactly? | Deviations (logged + PO-approved?) |
|---|---|---|

### Technical Debt Introduced
*(Be honest — every sprint should surface this, not hide it. "None" is a valid answer only if actually true.)*

### Deferred Items
*(Anything explicitly pushed to a later sprint or out of this initiative's scope — state why.)*

### Test Summary
- Unit tests added: ___
- Browser-verification passes (390px / 1280px, 0 console errors, no overflow): ___
- Full regression suite result: ___ / ___ passing

### Coverage Summary
- New code coverage: ___%
- Any coverage regression from baseline: Yes/No

### Known Issues
| Issue | Severity | Tracked where |
|---|---|---|

### Demo Guide
*(Link to this sprint's section in the [Founder Demo Guide](./brd-043-founder-demo-guide.md).)*

### Reviewer Checklist
- [ ] Every completed story's UI matches the approved prototype exactly, or deviation was Product-Office-approved before merge
- [ ] No new `Department`/multi-clinic/RBAC-editor surface touched
- [ ] No new business feature introduced beyond the frozen BRD-043 scope
- [ ] Audit logging present on every new mutation, in the frozen who/what/target/when/where/result shape
- [ ] Full regression suite green
- [ ] This sprint's stories' Definition of Done fully met (per the Sprint Plan's global DoD)

### Next Sprint Prerequisites
*(What must be true — merged, deployed, verified — before the next sprint can start on schedule, per the Sprint Plan's dependency list.)*

---

*Template ends. Copy the section above for each sprint's actual report.*
