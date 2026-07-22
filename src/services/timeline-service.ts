// Patient timeline (APS-046 / APS-025): the patient's complete history in one
// chronological stream, aggregated at read time across her objects — visits,
// prescriptions, lab orders, invoices and payments. This is the user-facing
// audit trail; users read it here instead of hopping between modules.
//
// MVP note: this is a read-time merge, not a generalized event store. The
// AppointmentEvent table already captures visit lifecycle; the other objects
// contribute their lifecycle timestamps. A single generalized object-event
// table (the full APS-025 shape) is the post-MVP evolution.

import prisma from "@/lib/prisma";
import { TYPE_LABEL } from "@/domain/document";
import { parseMedicines } from "@/domain/prescription";

// C3 — the Timeline never owns data; it only reveals relationships between
// existing clinical/operational artifacts. Read-time aggregation, deep-linked.
export type TimelineKind =
  | "appointment"
  | "treatment_plan"
  | "prescription"
  | "lab"
  | "document"
  | "invoice"
  | "payment";

export type TimelineLinkKind = "appointment" | "plan" | "document" | "prescription" | "lab" | "invoice" | "payment";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  detail: string | null; // subtitle
  at: string; // ISO — timestamp
  actor?: string | null; // actor name
  status?: string | null;
  link?: { kind: TimelineLinkKind; id: string } | null; // deep-link (mandatory where an artifact exists)
  actor_user_id?: string | null;
}

// Deterministic tie-break for same-timestamp entries (Amendment 9) — never DB order.
const KIND_ORDER: Record<TimelineKind, number> = {
  appointment: 0, treatment_plan: 1, prescription: 2, lab: 3, document: 4, invoice: 5, payment: 6,
};

export async function getPatientTimeline(patientId: string, clinicId: string, opts: { limit?: number } = {}) {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: patientId },
    select: { id: true, full_name: true, blood_group: true, date_of_birth: true, gender: true },
  });
  if (!patient) return null;

  // One batched read — never N+1 (Amendment 5).
  const [appointments, prescriptions, labOrders, invoices, payments, plans, documents] = await Promise.all([
    prisma.appointment.findMany({
      where: { patient_id: patientId, clinic_id: clinicId },
      select: {
        id: true,
        doctor: { select: { full_name: true } },
        events: { orderBy: { created_at: "asc" } },
      },
    }),
    prisma.prescription.findMany({
      where: { patient_id: patientId, clinic_id: clinicId },
      select: { id: true, appointment_id: true, medicines_json: true, created_at: true, doctor: { select: { full_name: true } } },
    }),
    prisma.labOrder.findMany({
      where: { patient_id: patientId, clinic_id: clinicId },
      select: {
        id: true,
        tests_json: true,
        status: true,
        ordered_at: true,
        resulted_at: true,
        doctor: { select: { full_name: true } },
      },
    }),
    prisma.invoice.findMany({
      where: { patient_id: patientId, clinic_id: clinicId },
      select: { id: true, invoice_number: true, total: true, created_at: true, issued_at: true },
    }),
    prisma.payment.findMany({
      where: { clinic_id: clinicId, invoice: { patient_id: patientId } },
      select: { id: true, amount: true, method: true, received_at: true, invoice: { select: { invoice_number: true } } },
    }),
    prisma.treatmentPlan.findMany({
      where: { patient_id: patientId, clinic_id: clinicId },
      select: { id: true, title: true, status: true, created_at: true, sessions: { select: { status: true } } },
    }),
    prisma.document.findMany({
      where: { patient_id: patientId, clinic_id: clinicId, status: "issued" },
      select: { id: true, type: true, number: true, generated_at: true, appointment_id: true },
    }),
  ]);

  // A8 — the issued Prescription document per appointment, so the "Prescription
  // issued" entry carries the RX number and deep-links to the document (and the
  // generic Document loop below skips it, avoiding a duplicate row).
  const rxDocByAppt = new Map<string, { id: string; number: string }>();
  for (const d of documents) {
    if (d.type === "prescription" && d.appointment_id) rxDocByAppt.set(d.appointment_id, { id: d.id, number: d.number });
  }

  const entries: TimelineEntry[] = [];

  // Visit lifecycle — one entry per appointment event.
  for (const appt of appointments) {
    const doctor = appt.doctor?.full_name ?? "doctor";
    for (const e of appt.events) {
      let title = e.type.replace(/_/g, " ");
      if (e.type === "created") title = "Appointment booked";
      else if (e.type === "walk_in_registered") title = "Walk-in registered";
      else if (e.type === "status_changed") title = `Visit: ${e.from_status} → ${e.to_status}`;
      entries.push({
        id: `appt-${e.id}`,
        kind: "appointment",
        title,
        detail: e.note ?? `with ${doctor}`,
        at: e.created_at.toISOString(),
        actor: doctor,
        link: { kind: "appointment", id: appt.id },
        actor_user_id: e.actor_user_id,
      });
    }
  }

  for (const rx of prescriptions) {
    const count = parseMedicines(rx.medicines_json).length;
    const doc = rxDocByAppt.get(rx.appointment_id);
    // A8 subtitle: "3 medicines · RX-2026-0042" (+ actor rendered separately).
    const detail = `${count} medicine${count === 1 ? "" : "s"}${doc ? ` · ${doc.number}` : ""}`;
    entries.push({
      id: `rx-${rx.id}`,
      kind: "prescription",
      title: "Prescription issued",
      detail,
      actor: rx.doctor?.full_name ?? "doctor",
      at: rx.created_at.toISOString(),
      // Deep-link to the issued document when it exists; else the prescription.
      link: doc ? { kind: "document", id: doc.id } : { kind: "prescription", id: rx.id },
    });
  }

  for (const lab of labOrders) {
    let tests: { name: string }[] = [];
    try {
      tests = JSON.parse(lab.tests_json);
    } catch {
      tests = [];
    }
    const names = tests.map((t) => t.name).join(", ");
    entries.push({
      id: `lab-ord-${lab.id}`,
      kind: "lab",
      title: "Lab ordered",
      detail: names,
      actor: lab.doctor?.full_name ?? "doctor",
      at: lab.ordered_at.toISOString(),
      status: lab.status,
      link: { kind: "lab", id: lab.id },
    });
    if (lab.resulted_at) {
      entries.push({
        id: `lab-res-${lab.id}`,
        kind: "lab",
        title: "Lab result ready",
        detail: names,
        at: lab.resulted_at.toISOString(),
        link: { kind: "lab", id: lab.id },
      });
    }
  }

  for (const inv of invoices) {
    entries.push({
      id: `inv-${inv.id}`,
      kind: "invoice",
      title: "Invoice generated",
      detail: `${inv.invoice_number} · ₹${inv.total.toLocaleString("en-IN")}`,
      at: inv.created_at.toISOString(),
      link: { kind: "invoice", id: inv.id },
    });
  }

  for (const pay of payments) {
    entries.push({
      id: `pay-${pay.id}`,
      kind: "payment",
      title: "Payment received",
      detail: `₹${pay.amount.toLocaleString("en-IN")} · ${pay.method.toUpperCase()} · ${pay.invoice?.invoice_number ?? ""}`,
      at: pay.received_at.toISOString(),
      link: { kind: "payment", id: pay.id },
    });
  }

  // C1/C2 — Treatment Plans (one entry per plan; progress in the subtitle).
  for (const p of plans) {
    const done = p.sessions.filter((s) => s.status === "completed").length;
    entries.push({
      id: `plan-${p.id}`,
      kind: "treatment_plan",
      title: `Treatment Plan: ${p.title}`,
      detail: `${done}/${p.sessions.length} sessions`,
      status: p.status,
      at: p.created_at.toISOString(),
      link: { kind: "plan", id: p.id },
    });
  }

  // B3 — Documents (each deep-links to the Document viewer/print). Prescription
  // documents are represented by the "Prescription issued" entry above (A8), so
  // skip them here to avoid a duplicate timeline row.
  for (const d of documents) {
    if (d.type === "prescription") continue;
    entries.push({
      id: `doc-${d.id}`,
      kind: "document",
      title: TYPE_LABEL[d.type as keyof typeof TYPE_LABEL] ?? "Document",
      detail: d.number,
      at: d.generated_at.toISOString(),
      link: { kind: "document", id: d.id },
    });
  }

  // Deterministic order: newest first, then a fixed kind priority, then id.
  entries.sort((a, b) => {
    if (a.at !== b.at) return a.at < b.at ? 1 : -1;
    if (KIND_ORDER[a.kind] !== KIND_ORDER[b.kind]) return KIND_ORDER[a.kind] - KIND_ORDER[b.kind];
    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  });

  // Progressive loading (Amendment 5): newest-first slice + has_more.
  const limit = opts.limit ?? 40;
  const has_more = entries.length > limit;
  return { patient, entries: entries.slice(0, limit), has_more, total: entries.length };
}
