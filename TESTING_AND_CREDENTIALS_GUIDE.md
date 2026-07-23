# Auriva Local Testing & Credentials Guide

> **Milestone:** Practice Operations Excellence (POE-001)  
> **Release Target:** Release 1.3 / POE-001  
> **Purpose:** Instructions for manual testing, login credentials, seed data, and automated test execution for user validation.

---

## 🔑 DEMO & TESTING LOGIN CREDENTIALS

You can test all surfaces locally by running the dev server (`npm run dev`) and signing in with any of the pre-seeded role accounts below.

| Role | Email / Identifier | Default Password | Target Surface URL | Primary Capabilities |
|---|---|---|---|---|
| **Practice Owner** | `owner@test.local` | `password123` | `http://localhost:3000/admin` | Command Center, KPIs, Service Catalog, Pricing |
| **Attending Doctor** | `doctor@test.local` | `password123` | `http://localhost:3000/doctor` | Consultation Workbench, Rx Authoring, Sign-off |
| **Front-Desk Receptionist**| `reception@test.local` | `password123` | `http://localhost:3000/staff` | Queue Board, 1-Click Check-in, Walk-in Modal, Checkout |
| **Patient Portal** | `patient@test.local` | `password123` | `http://localhost:3000/patient` | Appointments, Digital Records, Prescriptions, Receipts |

---

## 🧪 HOW TO RUN AUTOMATED TEST SUITE

To validate all 634 unit and integration test suites yourself across the codebase:

```bash
# 1. Typecheck the entire codebase (0 errors expected)
npx tsc --noEmit

# 2. Run ESLint code purity checks (0 errors expected)
npm run lint

# 3. Run full Vitest test suite (634 / 634 tests passing expected)
npm run test
```

---

## 🚀 HOW TO SEED DEMO DATA & RUN LOCAL SERVER

If you want a fresh set of realistic clinic appointments, queue tokens, and patient records:

```bash
# 1. Seed demo database with sample clinic data
npx tsx prisma/seed.ts

# 2. Start Next.js local development server
npm run dev
```

Then open `http://localhost:3000` in your browser to test any workflow!
