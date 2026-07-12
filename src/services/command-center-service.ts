// Organization Command Center (APS-045 / APS-024): a live operational
// snapshot for the owner — queue, doctors on the floor, today's money,
// pending tasks and recent activity. No analytics infrastructure; these are
// direct queries composed from the existing services, meant to be polled.

import prisma from "@/lib/prisma";
import { getDashboardSummary } from "@/services/reception-service";
import { billingDaySummary } from "@/services/billing-service";

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Average wait (check-in → consultation start) for today's started visits, minutes. */
async function averageWaitMinutes(clinicId: string): Promise<number | null> {
  const started = await prisma.appointment.findMany({
    where: {
      clinic_id: clinicId,
      checked_in_at: { not: null, gte: startOfToday() },
      started_at: { not: null },
    },
    select: { checked_in_at: true, started_at: true },
  });
  if (!started.length) return null;
  const totalMs = started.reduce(
    (sum, a) => sum + (a.started_at!.getTime() - a.checked_in_at!.getTime()),
    0
  );
  return Math.round(totalMs / started.length / 60000);
}

export async function getCommandCenterSnapshot(clinicId: string) {
  const [dashboard, billing, avgWait] = await Promise.all([
    getDashboardSummary(clinicId),
    billingDaySummary(clinicId),
    averageWaitMinutes(clinicId),
  ]);

  const counts = dashboard.counts;
  const inQueueNow =
    (counts.waiting ?? 0) + (counts.doctor_ready ?? 0) + (counts.checked_in ?? 0);
  const inConsultation = counts.in_consultation ?? 0;
  const doctorsOnFloor = dashboard.doctors.filter(
    (d) => d.waiting > 0 || d.in_consultation > 0
  ).length;

  // Pending tasks: things a human still owes action on today.
  const [unpaidInvoices, pendingLabs] = await Promise.all([
    prisma.invoice.count({
      where: { clinic_id: clinicId, status: { in: ["draft", "issued"] } },
    }),
    prisma.labOrder.count({ where: { clinic_id: clinicId, status: "ordered" } }),
  ]);

  // Recent activity — the appointment event trail, newest first, joined to
  // the patient for a human-readable line.
  const events = await prisma.appointmentEvent.findMany({
    where: { appointment: { clinic_id: clinicId } },
    orderBy: { created_at: "desc" },
    take: 12,
    include: {
      appointment: { select: { patient: { select: { full_name: true } } } },
    },
  });

  const recentActivity = events.map((e) => ({
    id: e.id,
    type: e.type,
    from_status: e.from_status,
    to_status: e.to_status,
    note: e.note,
    patient_name: e.appointment?.patient?.full_name ?? "—",
    created_at: e.created_at.toISOString(),
  }));

  return {
    clinic_id: clinicId,
    generated_at: new Date().toISOString(),
    tiles: {
      active_patients: inConsultation,
      in_queue_now: inQueueNow,
      doctors_on_floor: doctorsOnFloor,
      doctors_total: dashboard.doctors.length,
      avg_wait_minutes: avgWait,
      appointments_today: dashboard.total_today,
      collected_today: billing.collected_today,
      outstanding_total: billing.outstanding_total,
      // Critical alerts: reserved for real clinical signals (e.g. critical lab
      // values) once those land. Zero for the MVP rather than faked.
      critical_alerts: 0,
      pending_tasks: unpaidInvoices + pendingLabs,
      pending_unpaid_invoices: unpaidInvoices,
      pending_lab_results: pendingLabs,
    },
    doctors: dashboard.doctors,
    recent_activity: recentActivity,
  };
}

/**
 * Sprint 3 (OPS-001): the organization-wide rollup — sums tiles across
 * every clinic/branch, plus a per-clinic breakdown ("branch performance").
 * A single-clinic organization gets a one-row breakdown, so nothing about
 * the existing single-clinic behavior changes, it's just also expressed
 * this way now.
 */
export async function getOrganizationCommandCenterSnapshot(organizationId: string) {
  const clinics = await prisma.clinic.findMany({
    where: { organization_id: organizationId },
    orderBy: { name: "asc" },
    select: { id: true, name: true, address: true },
  });

  const perClinic = await Promise.all(
    clinics.map(async (clinic) => ({
      clinic,
      snapshot: await getCommandCenterSnapshot(clinic.id),
    }))
  );

  const aggregate = perClinic.reduce(
    (acc, { snapshot }) => ({
      active_patients: acc.active_patients + snapshot.tiles.active_patients,
      in_queue_now: acc.in_queue_now + snapshot.tiles.in_queue_now,
      doctors_on_floor: acc.doctors_on_floor + snapshot.tiles.doctors_on_floor,
      doctors_total: acc.doctors_total + snapshot.tiles.doctors_total,
      appointments_today: acc.appointments_today + snapshot.tiles.appointments_today,
      collected_today: acc.collected_today + snapshot.tiles.collected_today,
      outstanding_total: acc.outstanding_total + snapshot.tiles.outstanding_total,
      critical_alerts: acc.critical_alerts + snapshot.tiles.critical_alerts,
      pending_tasks: acc.pending_tasks + snapshot.tiles.pending_tasks,
      pending_unpaid_invoices: acc.pending_unpaid_invoices + snapshot.tiles.pending_unpaid_invoices,
      pending_lab_results: acc.pending_lab_results + snapshot.tiles.pending_lab_results,
    }),
    {
      active_patients: 0,
      in_queue_now: 0,
      doctors_on_floor: 0,
      doctors_total: 0,
      appointments_today: 0,
      collected_today: 0,
      outstanding_total: 0,
      critical_alerts: 0,
      pending_tasks: 0,
      pending_unpaid_invoices: 0,
      pending_lab_results: 0,
    }
  );

  // Average wait, unlike sums, needs a weighted mean across clinics that
  // actually have a number (skip clinics with no started visits today).
  const waitSamples = perClinic
    .map((c) => c.snapshot.tiles.avg_wait_minutes)
    .filter((v): v is number => v !== null);
  const avg_wait_minutes =
    waitSamples.length > 0
      ? Math.round(waitSamples.reduce((s, v) => s + v, 0) / waitSamples.length)
      : null;

  return {
    organization_id: organizationId,
    generated_at: new Date().toISOString(),
    tiles: { ...aggregate, avg_wait_minutes },
    branches: perClinic.map(({ clinic, snapshot }) => ({
      id: clinic.id,
      name: clinic.name,
      address: clinic.address,
      tiles: snapshot.tiles,
    })),
    // Doctor status across every branch — the UI's "Doctor status" panel
    // reads this directly; a single-clinic org just gets that clinic's list.
    doctors: perClinic.flatMap(({ snapshot }) => snapshot.doctors),
    // Recent activity across the whole org, newest first — reuse each
    // clinic's feed and re-sort/truncate rather than re-querying.
    recent_activity: perClinic
      .flatMap(({ clinic, snapshot }) =>
        snapshot.recent_activity.map((a) => ({ ...a, clinic_name: clinic.name }))
      )
      .sort((a, b) => (a.created_at < b.created_at ? 1 : -1))
      .slice(0, 12),
  };
}
