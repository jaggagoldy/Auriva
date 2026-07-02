"use client";

import { Stethoscope } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export interface DoctorOption {
  id: string;
  full_name: string;
  specialty: string | null;
}

interface DoctorFilterProps {
  doctors: DoctorOption[];
  value: string;
  onChange: (doctorId: string) => void;
}

export default function DoctorFilter({ doctors, value, onChange }: DoctorFilterProps) {
  const selected = doctors.find((doctor) => doctor.id === value);

  return (
    <Select value={value} onValueChange={(next) => onChange(next as string)}>
      <SelectTrigger size="sm" className="w-56" aria-label="Filter by doctor">
        <SelectValue>
          <span className="flex min-w-0 items-center gap-1.5">
            <Stethoscope className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="truncate">
              {value === "all" ? "All doctors" : (selected?.full_name ?? "All doctors")}
            </span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All doctors</SelectItem>
        {doctors.map((doctor) => (
          <SelectItem key={doctor.id} value={doctor.id}>
            <span>{doctor.full_name}</span>
            {doctor.specialty && (
              <span className="text-muted-foreground"> · {doctor.specialty}</span>
            )}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
