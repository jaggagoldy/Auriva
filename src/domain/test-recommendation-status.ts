// P5 Diagnostics — the recommendation lifecycle is PATIENT-driven (they book
// it, get it done, upload the report). Linear and forward-only; a patient can
// jump ahead (e.g. straight to "report uploaded") but never move backwards.

export type TestRecommendationStatus = "pending" | "booked" | "completed" | "report_uploaded";

export const TEST_RECOMMENDATION_STATUSES: TestRecommendationStatus[] = [
  "pending",
  "booked",
  "completed",
  "report_uploaded",
];

export const TEST_RECOMMENDATION_STATUS_LABEL: Record<TestRecommendationStatus, string> = {
  pending: "Pending",
  booked: "Booked",
  completed: "Completed",
  report_uploaded: "Report uploaded",
};

export function isTestRecommendationStatus(v: string): v is TestRecommendationStatus {
  return (TEST_RECOMMENDATION_STATUSES as string[]).includes(v);
}

/** Forward-only: the target must be at or after the current stage. */
export function canAdvanceRecommendation(from: TestRecommendationStatus, to: TestRecommendationStatus): boolean {
  return TEST_RECOMMENDATION_STATUSES.indexOf(to) > TEST_RECOMMENDATION_STATUSES.indexOf(from);
}
