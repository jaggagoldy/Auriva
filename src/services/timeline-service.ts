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

export type TimelineKind =
  | "appointment"
  | "prescription"
  | "lab"
  | "invoice"
  | "payment";

export interface TimelineEntry {
  id: string;
  kind: TimelineKind;
  title: string;
  detail: string | null;
  at: string; // ISO
  actor_user_id?: string | null;
}

export async function getPatientTimeline(patientId: string, clinicId: string) {
  const patient = await prisma.patientProfile.findUnique({
    where: { id: patientId },
    select: { id: true, full_name: true, blood_group: true, date_of_birth: true, gender: true },
  });
  if (!patient) return null;

  const [appointments, prescriptions, labOrders, invoices, payments] = await Promise.all([
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
      select: { id: true, medicines_json: true, created_at: true, doctor: { select: { full_name: true } } },
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
  ]);

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
        actor_user_id: e.actor_user_id,
      });
    }
  }

  for (const rx of prescriptions) {
    let count = 0;
    try {
      count = (JSON.parse(rx.medicines_json) as unknown[]).length;
    } catch {
      count = 0;
    }
    entries.push({
      id: `rx-${rx.id}`,
      kind: "prescription",
      title: "Prescription issued",
      detail: `${count} medicine${count === 1 ? "" : "s"} · ${rx.doctor?.full_name ?? "doctor"}`,
      at: rx.created_at.toISOString(),
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
      detail: `${names} · ${lab.doctor?.full_name ?? "doctor"}`,
      at: lab.ordered_at.toISOString(),
    });
    if (lab.resulted_at) {
      entries.push({
        id: `lab-res-${lab.id}`,
        kind: "lab",
        title: "Lab result ready",
        detail: names,
        at: lab.resulted_at.toISOString(),
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
    });
  }

  for (const pay of payments) {
    entries.push({
      id: `pay-${pay.id}`,
      kind: "payment",
      title: "Payment received",
      detail: `₹${pay.amount.toLocaleString("en-IN")} · ${pay.method.toUpperCase()} · ${pay.invoice?.invoice_number ?? ""}`,
      at: pay.received_at.toISOString(),
    });
  }

  entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0)); // newest first

  return { patient, entries };
}
