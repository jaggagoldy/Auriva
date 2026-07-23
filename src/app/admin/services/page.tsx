"use client";

import * as React from "react";
import { AdminSidebar } from "@/components/admin/admin-nav";
import ServiceCatalogManager from "@/components/admin/service-catalog-manager";
import { Toaster } from "@/components/ui/sonner";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ServicesPage() {
  const [clinicId, setClinicId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadClinic = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clinics", { cache: "no-store" });
      if (!res.ok) throw new Error("Request failed");
      const clinics = await res.json();
      if (clinics.length > 0) {
        setClinicId(clinics[0].id);
      } else {
        setError("No clinic profile found for this organization.");
      }
    } catch {
      setError("Could not load clinic information.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    loadClinic();
  }, [loadClinic]);

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Toaster position="bottom-right" />
      <AdminSidebar active="services" />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b px-6">
          <div>
            <h1 className="text-sm font-semibold">Treatments, Services & Pricing</h1>
            <p className="text-[11px] text-muted-foreground">
              Manage your practice consultation fees, procedure catalog, and pricing tiers
            </p>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              Loading services catalog...
            </div>
          ) : error || !clinicId ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <p className="text-sm text-muted-foreground">{error}</p>
              <Button size="sm" variant="outline" onClick={loadClinic}>
                <RefreshCw className="size-3.5 mr-1" /> Retry
              </Button>
            </div>
          ) : (
            <ServiceCatalogManager clinicId={clinicId} />
          )}
        </main>
      </div>
    </div>
  );
}
