# Auriva Verified Credentials & Local Testing Guide

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Release Target:** Release 1.3 / POE-001  
> **Database Status:** Freshly Seeded & Verified

---

## 🔑 VALIDATED SEED CREDENTIALS

Below are the exact credentials seeded in the database. Use any of these to sign in at `http://localhost:3000/login`.

| Role Persona | Email Address | Default Password | Mobile Phone | Target Surface URL | Primary Capabilities |
|---|---|---|---|---|---|
| **Practice Owner / Admin** | `admin@aegiscare.com` | `password123` | `+15550100000` | `http://localhost:3000/admin` | Command Center Snapshot, Real-time KPIs, Service Catalog Pricing, Staff Directory |
| **Attending Doctor** | `dr.smith@aegiscare.com` | `password123` | `+15550101111` | `http://localhost:3000/doctor` | Uninterrupted Charting, Structured Rx, 1-Click Sign-off & Invoicing |
| **Attending Doctor (Alt)** | `dr.patel@aegiscare.com` | `password123` | `+15550103333` | `http://localhost:3000/doctor` | Consultation Workbench, Doctor Availability & Time-Blocking |
| **Front-Desk Receptionist**| `staff@aegiscare.com` | `password123` | `+15550104444` | `http://localhost:3000/staff` | Queue Board, 1-Click Check-in, Rapid Walk-in Modal, Cashier Checkout |

---

## 🚀 HOW TO RUN LOCAL DEV SERVER

To start the local application server:

```bash
# 1. (Optional) Re-seed database if needed
npx tsx prisma/seed.ts

# 2. Start Next.js local development server
npm run dev
```

Then open `http://localhost:3000/login` in your web browser.

---

## 🧪 HOW TO RUN AUTOMATED TEST SUITE

```bash
# 1. Typecheck codebase (0 errors expected)
npx tsc --noEmit

# 2. Run full Vitest suite (634 / 634 tests passing expected)
npm run test
```
