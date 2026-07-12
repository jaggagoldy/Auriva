"use client";

import * as React from "react";
import {
  Award,
  Badge as BadgeIcon,
  Building2,
  FileSignature,
  Globe2,
  GraduationCap,
  IdCard,
  Loader2,
  PenLine,
  ShieldAlert,
  Wallet,
} from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Doctor, getInitials } from "@/shared/queue";
import { useDoctorSession } from "@/components/doctor/doctor-session";
import DoctorProfileEditDialog from "@/components/doctor/doctor-profile-edit-dialog";

export default function DoctorProfile() {
  const session = useDoctorSession();
  const [doctor, setDoctor] = React.useState<Doctor | null>(null);

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
    <main className="mx-auto grid max-w-[1160px] grid-cols-1 gap-6 overflow-y-auto px-7 py-7 lg:grid-cols-[300px_1fr]">
      <div className="flex flex-col gap-4">
        <Card className="rounded-xl text-center">
          <CardContent>
            <Avatar className="mx-auto size-18 text-2xl">
              <AvatarFallback>{getInitials(doctor.full_name)}</AvatarFallback>
            </Avatar>
            <p className="mt-3 text-base font-semibold">{doctor.full_name}</p>
            <p className="text-xs text-muted-foreground">{doctor.specialty ?? "General Physician"}</p>
            <Badge variant="outline" className="mt-2.5 gap-1 text-[10.5px] font-normal text-warning dark:text-warning">
              <ShieldAlert className="size-3" />
              Verification pending
            </Badge>
          </CardContent>
        </Card>

        <div>
          <SectionLabel>Practice</SectionLabel>
          <Card className="rounded-xl">
            <CardContent className="flex items-center gap-3">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Building2 className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[12.5px] font-semibold">{doctor.clinic.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">{doctor.clinic.address}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="flex flex-col gap-6">
        <ProfileSection
          label="Personal"
          icon={PenLine}
          editTrigger={
            <DoctorProfileEditDialog
              doctor={doctor}
              group="personal"
              onSaved={setDoctor}
              trigger={
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              }
            />
          }
        >
          <FieldRow label="Bio" value={doctor.bio || "Not added yet"} />
          <FieldRow label="Languages" value={doctor.languages || "Not added yet"} icon={Globe2} />
          <FieldRow
            label="Experience"
            value={doctor.years_experience != null ? `${doctor.years_experience} years` : "Not added yet"}
          />
        </ProfileSection>

        <ProfileSection
          label="Professional"
          icon={GraduationCap}
          editTrigger={
            <DoctorProfileEditDialog
              doctor={doctor}
              group="professional"
              onSaved={setDoctor}
              trigger={
                <Button size="sm" variant="outline">
                  Edit
                </Button>
              }
            />
          }
        >
          <FieldRow label="Specialty" value={doctor.specialty || "Not added yet"} />
          <FieldRow label="Registration No." value={doctor.registration_number || "Not added yet"} icon={IdCard} />
          <FieldRow label="Qualifications" value={doctor.qualifications || "Not added yet"} />
        </ProfileSection>

        <ProfileSection
          label="Practice"
          icon={Wallet}
          editTrigger={
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
          }
        >
          <FieldRow
            label="Consultation fee"
            value={doctor.consultation_fee != null ? `₹${doctor.consultation_fee}` : "Not set"}
          />
          <FieldRow label="Location" value={doctor.clinic.name} />
        </ProfileSection>

        <div>
          <SectionLabel>Verification</SectionLabel>
          <Card className="rounded-xl border-dashed">
            <CardContent className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
              <div>
                <p className="text-[12.5px] font-medium">Your console is fully open</p>
                <p className="mt-1 text-[11.5px] text-muted-foreground">
                  You can use every part of the Doctor Workspace already. Once document verification
                  ships, your public profile becomes discoverable and bookable by patients — until
                  then it stays private.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <ComingSoonTile icon={Award} label="Awards" />
          <ComingSoonTile icon={BadgeIcon} label="Memberships" />
          <ComingSoonTile icon={FileSignature} label="Digital signature" />
        </div>
      </div>
    </main>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">{children}</p>;
}

function ProfileSection({
  label,
  icon: Icon,
  editTrigger,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  editTrigger: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
          <Icon className="size-3.5" />
          {label}
        </p>
        {editTrigger}
      </div>
      <Card className="rounded-xl">
        <CardContent className="flex flex-col gap-2.5">{children}</CardContent>
      </Card>
    </div>
  );
}

function FieldRow({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-start justify-between gap-4 text-[12.5px]">
      <dt className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
        {Icon && <Icon className="size-3.5" />}
        {label}
      </dt>
      <dd className="text-right font-medium">{value}</dd>
    </div>
  );
}

function ComingSoonTile({
  icon: Icon,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl border border-dashed bg-card p-3.5 text-muted-foreground">
      <Icon className="size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-[12px] font-medium">{label}</p>
        <p className="text-[10.5px]">Coming soon</p>
      </div>
      <Badge variant="outline" className="text-[10px]">Soon</Badge>
    </div>
  );
}
