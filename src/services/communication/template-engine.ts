import { RenderedTemplate } from "./communication-types";

export class TemplateNotFoundError extends Error {}

const TEMPLATE_STORE: Record<string, (vars: Record<string, unknown>) => string> = {
  "appointment_booked:v1": (v) =>
    `Your appointment with ${v.doctorName || "your doctor"} at ${v.clinicName || "our clinic"} on ${v.scheduledTime} is confirmed. Pay at Desk. Manage booking: ${v.manageUrl || ""}`,

  "appointment_rescheduled:v1": (v) =>
    `Your appointment with ${v.doctorName || "your doctor"} at ${v.clinicName || "our clinic"} has been rescheduled to ${v.newScheduledTime}. Manage booking: ${v.manageUrl || ""}`,

  "appointment_cancelled:v1": (v) =>
    `Your appointment with ${v.doctorName || "your doctor"} at ${v.clinicName || "our clinic"} on ${v.scheduledTime} has been cancelled.${v.reason ? ` Reason: ${v.reason}` : ""}`,

  "reminder_24h:v1": (v) =>
    `Upcoming Appointment Reminder: You have a visit with ${v.doctorName || "your doctor"} tomorrow at ${v.scheduledTime} at ${v.clinicName || "our clinic"}.`,

  "reminder_2h:v1": (v) =>
    `Upcoming Appointment Reminder: Your visit with ${v.doctorName || "your doctor"} is today in 2 hours at ${v.scheduledTime}.`,
};

/**
 * Renders a versioned communication template with variable interpolation.
 */
export function renderTemplate(
  templateKey: string,
  variables: Record<string, unknown>,
  version = "v1"
): RenderedTemplate {
  const fullKey = `${templateKey}:${version}`;
  const templateFn = TEMPLATE_STORE[fullKey] || TEMPLATE_STORE[`${templateKey}:v1`];

  if (!templateFn) {
    throw new TemplateNotFoundError(`Template '${templateKey}' (version '${version}') was not found.`);
  }

  const renderedText = templateFn(variables);

  return {
    templateKey,
    templateVersion: version,
    renderedText,
  };
}
