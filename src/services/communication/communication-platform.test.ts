import { afterAll, describe, expect, it } from "vitest";
import prisma from "@/lib/prisma";
import { createTestOrganization, createTestStaff } from "@/test/fixtures";
import { CommunicationChannel, CommunicationStatus } from "@prisma/client";
import { renderTemplate, TemplateNotFoundError } from "./template-engine";
import { evaluatePreferences } from "./preference-engine";
import { globalProviderRegistry } from "./provider-registry";
import { dispatchCommunication, PreferenceBlockedError } from "./communication-engine";
import { processEligibleRetries } from "./retry-engine";

const userIds: string[] = [];
const orgIds: string[] = [];

afterAll(async () => {
  await prisma.communicationLog.deleteMany({ where: { clinic: { organization_id: { in: orgIds } } } });
  await prisma.staffProfile.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.clinic.deleteMany({ where: { organization_id: { in: orgIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.organization.deleteMany({ where: { id: { in: orgIds } } });
});

async function setupCommFixture() {
  const { organization, clinic } = await createTestOrganization();
  const { user, staffProfile } = await createTestStaff(clinic.id, "doctor");
  orgIds.push(organization.id);
  userIds.push(user.id);

  return { organization, clinic, doctor: staffProfile };
}

describe("Communication Platform — Template Engine", () => {
  it("renders versioned templates with interpolated variables", () => {
    const rendered = renderTemplate(
      "appointment_booked",
      { doctorName: "Dr. Smith", clinicName: "Aegis Care", scheduledTime: "10:00 AM", manageUrl: "http://book" },
      "v1"
    );

    expect(rendered.templateKey).toBe("appointment_booked");
    expect(rendered.templateVersion).toBe("v1");
    expect(rendered.renderedText).toContain("Dr. Smith");
    expect(rendered.renderedText).toContain("Aegis Care");
  });

  it("throws TemplateNotFoundError for unregistered template key", () => {
    expect(() => renderTemplate("non_existent_template", {})).toThrow(TemplateNotFoundError);
  });
});

describe("Communication Platform — Preference Engine", () => {
  it("allows dispatch when clinic preferences are enabled", () => {
    const res = evaluatePreferences(CommunicationChannel.SMS, "appointment_booked", {
      notifications_enabled: true,
      whatsapp_enabled: true,
      sms_enabled: true,
      reminders_enabled: true,
    });
    expect(res.allowed).toBe(true);
  });

  it("blocks dispatch when clinic notifications_enabled is false", () => {
    const res = evaluatePreferences(CommunicationChannel.SMS, "appointment_booked", {
      notifications_enabled: false,
      whatsapp_enabled: true,
      sms_enabled: true,
      reminders_enabled: true,
    });
    expect(res.allowed).toBe(false);
  });

  it("blocks reminder templates when reminders_enabled is false", () => {
    const res = evaluatePreferences(CommunicationChannel.SMS, "reminder_24h", {
      notifications_enabled: true,
      whatsapp_enabled: true,
      sms_enabled: true,
      reminders_enabled: false,
    });
    expect(res.allowed).toBe(false);
  });
});

describe("Communication Platform — Provider Registry", () => {
  it("selects provider by channel with fallback to mock", () => {
    const smsProv = globalProviderRegistry.getProviderForChannel(CommunicationChannel.SMS);
    expect(smsProv.name).toBe("sms_gateway");

    const mockProv = globalProviderRegistry.getProvider("mock");
    expect(mockProv.name).toBe("mock");
  });
});

describe("Communication Platform — Communication Engine & Outbox Persistence", () => {
  it("dispatches communication, writes to CommunicationLog, and returns standardized DeliveryResult", async () => {
    const { clinic, doctor } = await setupCommFixture();

    const result = await dispatchCommunication({
      patientId: doctor.user_id,
      clinicId: clinic.id,
      recipient: "+15559998888",
      channel: CommunicationChannel.SMS,
      templateKey: "appointment_booked",
      templateVersion: "v1",
      variables: { doctorName: doctor.full_name, clinicName: clinic.name, scheduledTime: "Tomorrow 9:00 AM" },
    });

    expect(result.status).toBe("delivered");
    expect(result.provider).toBeDefined();
    expect(result.providerMessageId).toBeDefined();

    // Verify database outbox record
    const logs = await prisma.communicationLog.findMany({
      where: { clinic_id: clinic.id },
    });

    expect(logs).toHaveLength(1);
    expect(logs[0].status).toBe(CommunicationStatus.DELIVERED);
    expect(logs[0].template_key).toBe("appointment_booked");
    expect(logs[0].template_version).toBe("v1");
  });

  it("throws PreferenceBlockedError when clinic notifications are disabled", async () => {
    const { clinic, doctor } = await setupCommFixture();
    await prisma.clinic.update({
      where: { id: clinic.id },
      data: { notifications_enabled: false },
    });

    await expect(
      dispatchCommunication({
        patientId: doctor.user_id,
        clinicId: clinic.id,
        recipient: "+15559998888",
        channel: CommunicationChannel.SMS,
        templateKey: "appointment_booked",
        variables: {},
      })
    ).rejects.toThrow(PreferenceBlockedError);
  });
});

describe("Communication Platform — Scheduler-Agnostic Retry Engine", () => {
  it("processes pending retry-eligible messages from the outbox", async () => {
    const { clinic, doctor } = await setupCommFixture();

    // Create a manual PENDING outbox log
    await prisma.communicationLog.create({
      data: {
        patient_id: doctor.user_id,
        clinic_id: clinic.id,
        channel: CommunicationChannel.SMS,
        status: CommunicationStatus.PENDING,
        provider: "mock",
        recipient: "+15557776666",
        template_key: "appointment_booked",
        template_version: "v1",
        payload_json: "{}",
        rendered_text: "Retry test content",
        scheduled_at: new Date(Date.now() - 1000), // Ready to process
      },
    });

    const summary = await processEligibleRetries(10);
    expect(summary.processed).toBeGreaterThanOrEqual(1);
    expect(summary.succeeded).toBeGreaterThanOrEqual(1);
  });
});
