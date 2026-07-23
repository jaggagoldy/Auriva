# Changelog

All notable changes to the **Auriva Healthcare Operating System** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.0] - 2026-07-23 (Milestone POE-001)

### Added
- **1-Click Patient Check-in (`REQ-REC-001`)**: Instant arrival check-in from Queue Board with optimistic status transition, sequential daily token generation, and `appointment.checked_in` event bus notification.
- **Rapid Walk-in Registration (`REQ-REC-002`)**: 2-field walk-in registration modal with automatic 10-digit mobile number identity profile matching and emergency walk-in override.
- **Emergency Patient Queue Bypass (`REQ-REC-003`)**: Priority weight 100 queue bypass engine bumping emergency patients to position #1 with prominent red `[ EMERGENCY ]` queue badges and real-time event bus notifications.
- **Drag-and-Drop Doctor Transfer (`REQ-REC-004`)**: Atomic patient reassignment across doctor queues with automatic queue token re-indexing, status guards, and timeline event logging.
- **Instant Cashier Checkout Workspace (`REQ-REC-005`)**: Integrated 1-click cashier checkout workspace supporting itemized clinical & administrative charges, concessions, split payment methods, receipt PDF generation, and automated visit settlement.

### Changed
- Refactored `setPriority` to log `emergency_priority_set` activity events and publish `reception.queue.emergency_bypass` system events.
- Updated `reassignDoctor` service to publish `reception.doctor_reassigned` event bus notifications.
