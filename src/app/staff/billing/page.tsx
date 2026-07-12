import type { Metadata } from "next";

import BillingBoard from "@/components/staff/billing-board";

export const metadata: Metadata = {
  title: "Billing",
  description: "Invoices and payment collection.",
};

export default function StaffBillingPage() {
  return <BillingBoard />;
}
