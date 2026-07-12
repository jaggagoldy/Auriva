import { notFound } from "next/navigation";
import prisma from "@/lib/prisma";
import PrintButton from "@/components/shared/print-button";

function ageFromDob(dob: Date | null): number | null {
  if (!dob) return null;
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000));
}

interface Medicine {
  name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

function parseMedicines(json: string | null | undefined): Medicine[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default async function PrescriptionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { patient: true, doctor: true, clinic: true, prescription: true },
  });
  if (!appointment) notFound();

  const medicines = parseMedicines(appointment.prescription?.medicines_json ?? appointment.prescription_medicines_json);
  const diagnosis = appointment.diagnosis;
  const notes = appointment.prescription?.notes ?? appointment.prescription_notes;
  const followUp = appointment.prescription?.follow_up_date ?? appointment.follow_up_date;
  const age = ageFromDob(appointment.patient.date_of_birth);

  return (
    <div>
      <PrintButton />

      <header className="flex items-start justify-between border-b-2 border-black pb-4">
        <div>
          <h1 className="text-lg font-bold">{appointment.doctor.full_name}</h1>
          <p className="text-[12px]">
            {appointment.doctor.specialty || "General Practitioner"}
            {appointment.doctor.qualifications ? ` · ${appointment.doctor.qualifications}` : ""}
          </p>
          {appointment.doctor.registration_number && (
            <p className="text-[11px] text-muted-foreground">Reg. No. {appointment.doctor.registration_number}</p>
          )}
        </div>
        <div className="text-right text-[12px]">
          <p className="font-semibold">{appointment.clinic.name}</p>
          <p className="text-muted-foreground">{appointment.clinic.address}</p>
        </div>
      </header>

      <section className="mt-4 grid grid-cols-2 gap-2 border-b border-border pb-4 text-[12px]">
        <div>
          <span className="font-semibold">Patient:</span> {appointment.patient.full_name}
          {age !== null ? ` · ${age} yrs` : ""}
          {appointment.patient.gender ? ` · ${appointment.patient.gender}` : ""}
        </div>
        <div className="text-right">
          <span className="font-semibold">Date:</span>{" "}
          {new Date(appointment.scheduled_time).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
        </div>
        <div>
          <span className="font-semibold">Blood group:</span> {appointment.patient.blood_group}
        </div>
        <div className="text-right">
          <span className="font-semibold">Health ID:</span> {appointment.patient.health_id}
        </div>
      </section>

      {diagnosis && (
        <section className="mt-4">
          <h2 className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">Diagnosis</h2>
          <p className="mt-1">{diagnosis}</p>
        </section>
      )}

      <section className="mt-5">
        <h2 className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">℞ Prescription</h2>
        {medicines.length === 0 ? (
          <p className="mt-1 text-muted-foreground">No medicines prescribed.</p>
        ) : (
          <table className="mt-2 w-full border-collapse text-[12px]">
            <thead>
              <tr className="border-b border-black text-left">
                <th className="py-1">#</th>
                <th className="py-1">Medicine</th>
                <th className="py-1">Dosage</th>
                <th className="py-1">Frequency</th>
                <th className="py-1">Duration</th>
              </tr>
            </thead>
            <tbody>
              {medicines.map((m, i) => (
                <tr key={i} className="border-b border-border">
                  <td className="py-1.5 align-top">{i + 1}</td>
                  <td className="py-1.5 align-top font-medium">{m.name}</td>
                  <td className="py-1.5 align-top">{m.dosage}</td>
                  <td className="py-1.5 align-top">{m.frequency}</td>
                  <td className="py-1.5 align-top">{m.duration}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {notes && (
        <section className="mt-4">
          <h2 className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">Advice</h2>
          <p className="mt-1 whitespace-pre-wrap">{notes}</p>
        </section>
      )}

      {followUp && (
        <section className="mt-4">
          <h2 className="text-[11px] font-bold tracking-wide uppercase text-muted-foreground">Follow-up</h2>
          <p className="mt-1">
            {new Date(followUp).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
          </p>
        </section>
      )}

      <footer className="mt-16 flex items-end justify-between text-[11px] text-muted-foreground">
        <p>Generated by Auriva · not valid without doctor&apos;s signature</p>
        <div className="text-center">
          <div className="mb-1 h-10 w-40 border-b border-border" />
          <p>{appointment.doctor.full_name}</p>
        </div>
      </footer>
    </div>
  );
}
