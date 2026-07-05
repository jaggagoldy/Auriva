"use client";

import * as React from "react";
import { Building2, FileStack, Loader2, Stethoscope, Video } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Doctor } from "@/shared/queue";
import { useDoctorSession } from "@/components/doctor/doctor-session";
import DoctorProfileEditDialog from "@/components/doctor/doctor-profile-edit-dialog";

const SUB_SECTIONS = [
  { key: "locations", label: "Locations" },
  { key: "fees", label: "Fees" },
  { key: "services", label: "Services" },
  { key: "online", label: "Online Consultation" },
  { key: "documents", label: "Documents" },
  { key: "verification", label: "Verification" },
] as const;

type SectionKey = (typeof SUB_SECTIONS)[number]["key"];

export default function DoctorPractice() {
  const session = useDoctorSession();
  const [doctor, setDoctor] = React.useState<Doctor | null>(null);
  const [section, setSection] = React.useState<SectionKey>("locations");

  React.useEffect(() => {
    fetch(`/api/doctors/${session.id}`, { cache: "no-store" })
      .then((res) => res.json())
      .then(setDoctor)
      .catch(() => setDoctor(null));
  }, [session.id]);

  if (!doctor) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <aside className="w-[190px] shrink-0 border-r bg-muted/30 p-3">
        <p className="mb-2 px-2 text-[13px] font-semibold">Practice</p>
        <nav className="space-y-0.5">
          {SUB_SECTIONS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSection(s.key)}
              className={`block w-full rounded-lg px-2.5 py-1.5 text-left text-[12.5px] transition-colors ${
                section === s.key
                  ? "bg-background font-semibold text-foreground shadow-xs"
                  : "text-muted-foreground hover:bg-background/60"
              }`}
            >
              {s.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="min-h-0 flex-1 overflow-auto p-6">
        {section === "locations" && (
          <div className="max-w-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Locations</h2>
              <Button size="sm" variant="outline" disabled>
                + Add affiliation
              </Button>
            </div>
            <Card className="rounded-xl">
              <CardContent className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Building2 className="size-4" />
                  </div>
                  <div>
                    <p className="text-[12.5px] font-semibold">{doctor.clinic.name}</p>
                    <p className="text-[11px] text-muted-foreground">{doctor.clinic.address}</p>
                  </div>
                </div>
                <Badge className="border border-accent-foreground/30 bg-accent text-accent-foreground">Active</Badge>
              </CardContent>
            </Card>
            <p className="mt-2.5 text-[11px] text-muted-foreground">
              Multi-clinic affiliation requests are coming soon.
            </p>
          </div>
        )}

        {section === "fees" && (
          <div className="max-w-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-semibold">Fees</h2>
              <DoctorProfileEditDialog
                doctor={doctor}
                group="practice"
                onSaved={setDoctor}
                trigger={
                  <Button size="sm" variant="outline">
                    Edit
                  </Button>
                }
              />
            </div>
            <Card className="rounded-xl">
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-[12.5px] font-semibold">{doctor.clinic.name}</p>
                  <p className="text-[11px] text-muted-foreground">Consultation fee at this location</p>
                </div>
                <p className="text-lg font-bold tabular-nums">
                  {doctor.consultation_fee != null ? `₹${doctor.consultation_fee}` : "Not set"}
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {section === "services" && <PlaceholderPanel icon={Stethoscope} title="Services" description="Listing the procedures and services you offer is coming soon." />}
        {section === "online" && <PlaceholderPanel icon={Video} title="Online Consultation" description="Teleconsultation availability and pricing are coming soon." />}
        {section === "documents" && <PlaceholderPanel icon={FileStack} title="Documents" description="Uploading licenses and certificates is coming soon." />}
        {section === "verification" && <PlaceholderPanel icon={FileStack} title="Verification" description="Document review and approval status will appear here once verification launches. Your console works fully in the meantime." />}
      </div>
    </div>
  );
}

function PlaceholderPanel({
  icon: Icon,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}) {
  return (
    <div className="flex max-w-md flex-col items-start gap-2 rounded-xl border border-dashed p-5">
      <Icon className="size-5 text-muted-foreground" />
      <p className="text-[13px] font-medium">{title}</p>
      <p className="text-[12px] text-muted-foreground">{description}</p>
      <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
    </div>
  );
}
