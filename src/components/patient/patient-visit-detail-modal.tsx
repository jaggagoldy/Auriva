"use client";

import * as React from "react";
import {
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  FileText,
  HeartPulse,
  MapPin,
  Pill,
  Printer,
  Stethoscope,
  User,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Appointment, formatDay, formatTime, parseMedicines, parseVitals } from "@/shared/queue";
import { formatMedicine } from "@/domain/prescription";

interface PatientVisitDetailModalProps {
  appointment: Appointment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PatientVisitDetailModal({
  appointment,
  open,
  onOpenChange,
}: PatientVisitDetailModalProps) {
  const printRef = React.useRef<HTMLDivElement>(null);

  if (!appointment) return null;

  const medicines = parseMedicines(appointment.prescription_medicines_json);
  const vitals = parseVitals(appointment.vitals_json);
  const isCompleted = appointment.status === "completed";

  const handlePrint = () => {
    const printContent = printRef.current;
    if (!printContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Medical Summary - ${appointment.patient.full_name}</title>
          <style>
            body { font-family: system-ui, -apple-system, sans-serif; padding: 24px; color: #111; line-height: 1.5; }
            .header { border-bottom: 2px solid #0B4A41; padding-bottom: 16px; margin-bottom: 20px; display: flex; justify-content: space-between; }
            .clinic-name { font-size: 20px; font-weight: bold; color: #0B4A41; }
            .doc-info { margin-top: 4px; font-size: 13px; color: #555; }
            .section { margin-bottom: 20px; }
            .section-title { font-size: 12px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #0B4A41; margin-bottom: 8px; border-bottom: 1px solid #eee; padding-bottom: 4px; }
            .rx-table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            .rx-table th, .rx-table td { border: 1px solid #ddd; padding: 8px 12px; text-align: left; font-size: 13px; }
            .rx-table th { background: #f4f8f7; color: #0B4A41; font-weight: 600; }
            .vitals-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; }
            .vital-box { border: 1px solid #eee; padding: 8px; border-radius: 6px; text-align: center; }
            .vital-label { font-size: 10px; color: #666; text-transform: uppercase; }
            .vital-val { font-size: 13px; font-weight: bold; color: #111; }
            .footer { margin-top: 40px; border-top: 1px solid #ddd; pt: 16px; display: flex; justify-content: space-between; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
          <script>
            window.onload = function() { window.print(); window.close(); };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
        <DialogHeader className="p-5 border-b bg-muted/30 flex flex-row items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border-primary/20">
                {isCompleted ? "Completed Visit" : "Appointment Record"}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {formatDay(appointment.scheduled_time)} · {formatTime(appointment.scheduled_time)}
              </span>
            </div>
            <DialogTitle className="text-lg font-bold mt-1">
              Visit Record &amp; Medical Advice
            </DialogTitle>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5 font-semibold text-xs"
              onClick={handlePrint}
            >
              <Printer className="size-3.5" />
              Download / Print PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Doctor & Clinic Header Card */}
          <div className="rounded-xl border bg-card p-4 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="size-11 rounded-xl bg-primary/10 text-primary grid place-items-center font-bold text-base">
                <Stethoscope className="size-5" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">
                  {appointment.doctor.full_name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {appointment.doctor.specialty || "Attending Physician"}
                </p>
                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                  <MapPin className="size-3" />
                  {appointment.clinic.name}
                </p>
              </div>
            </div>
            <div className="sm:text-right text-xs text-muted-foreground border-t sm:border-t-0 pt-2 sm:pt-0 border-border">
              <p className="font-medium text-foreground">Patient: {appointment.patient.full_name}</p>
              <p className="mt-0.5">Token #{appointment.queue_number ?? "—"}</p>
              {appointment.follow_up_date && (
                <p className="mt-1 font-semibold text-emerald-600 dark:text-emerald-400">
                  Follow-up: {formatDay(appointment.follow_up_date)}
                </p>
              )}
            </div>
          </div>

          {/* Vitals Summary if available */}
          {vitals && (vitals.bp || vitals.pulse || vitals.temp || vitals.spo2 || vitals.weight) && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <HeartPulse className="size-3.5 text-primary" /> Recorded Vitals
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {vitals.bp && (
                  <div className="rounded-lg border bg-muted/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">BP</p>
                    <p className="text-xs font-bold">{vitals.bp}</p>
                  </div>
                )}
                {vitals.pulse && (
                  <div className="rounded-lg border bg-muted/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Pulse</p>
                    <p className="text-xs font-bold">{vitals.pulse} bpm</p>
                  </div>
                )}
                {vitals.temp && (
                  <div className="rounded-lg border bg-muted/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Temp</p>
                    <p className="text-xs font-bold">{vitals.temp}</p>
                  </div>
                )}
                {vitals.spo2 && (
                  <div className="rounded-lg border bg-muted/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">SpO2</p>
                    <p className="text-xs font-bold">{vitals.spo2}%</p>
                  </div>
                )}
                {vitals.weight && (
                  <div className="rounded-lg border bg-muted/30 p-2 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-medium">Weight</p>
                    <p className="text-xs font-bold">{vitals.weight}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Chief Complaint & Diagnosis */}
          {(appointment.chief_complaint || appointment.diagnosis) && (
            <div className="grid sm:grid-cols-2 gap-4">
              {appointment.chief_complaint && (
                <div className="rounded-xl border bg-card p-4 space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Chief Complaint
                  </h4>
                  <p className="text-sm font-medium text-foreground">
                    {appointment.chief_complaint}
                  </p>
                </div>
              )}
              {appointment.diagnosis && (
                <div className="rounded-xl border bg-card p-4 space-y-1">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Diagnosis
                  </h4>
                  <p className="text-sm font-semibold text-primary">
                    {appointment.diagnosis}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Doctor Recommendations & Advice */}
          {appointment.prescription_notes && (
            <div className="rounded-xl border bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50 p-4 space-y-1.5">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <FileText className="size-3.5" /> Doctor Advice &amp; Recommendations
              </h4>
              <p className="text-sm text-emerald-950 dark:text-emerald-200 font-mono whitespace-pre-line leading-relaxed">
                {appointment.prescription_notes}
              </p>
            </div>
          )}

          {/* Prescribed Medicines */}
          {medicines.length > 0 && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Pill className="size-3.5 text-primary" /> Prescribed Medicines ({medicines.length})
              </h4>
              <div className="divide-y rounded-xl border bg-card overflow-hidden">
                {medicines.map((m, i) => {
                  const { name, directions } = formatMedicine(m, "patient");
                  return (
                    <div key={m.id || i} className="p-3.5 flex items-start gap-3">
                      <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <h5 className="font-bold text-sm text-foreground">{name}</h5>
                          {m.dosage && (
                            <span className="text-xs font-semibold text-muted-foreground">
                              {m.dosage}
                            </span>
                          )}
                        </div>
                        {directions ? (
                          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
                            {directions}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {[m.frequency, m.duration].filter(Boolean).join(" · ")}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Hidden Printable Template Container */}
        <div className="hidden">
          <div ref={printRef}>
            <div className="header">
              <div>
                <div className="clinic-name">{appointment.clinic.name}</div>
                <div className="doc-info">{appointment.clinic.address}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#0B4A41" }}>
                  {appointment.doctor.full_name}
                </div>
                <div className="doc-info">{appointment.doctor.specialty || "General Physician"}</div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", marginBottom: "20px", background: "#f8faf9", padding: "12px", borderRadius: "6px" }}>
              <div>
                <strong>Patient:</strong> {appointment.patient.full_name}<br />
                <strong>Token:</strong> #{appointment.queue_number ?? "—"}
              </div>
              <div style={{ textAlign: "right" }}>
                <strong>Date:</strong> {formatDay(appointment.scheduled_time)}<br />
                <strong>Status:</strong> Completed Consultation
              </div>
            </div>

            {vitals && (vitals.bp || vitals.pulse || vitals.temp || vitals.spo2 || vitals.weight) && (
              <div className="section">
                <div className="section-title">Vitals</div>
                <div className="vitals-grid">
                  {vitals.bp && <div className="vital-box"><div className="vital-label">BP</div><div className="vital-val">{vitals.bp}</div></div>}
                  {vitals.pulse && <div className="vital-box"><div className="vital-label">Pulse</div><div className="vital-val">{vitals.pulse} bpm</div></div>}
                  {vitals.temp && <div className="vital-box"><div className="vital-label">Temp</div><div className="vital-val">{vitals.temp}</div></div>}
                  {vitals.spo2 && <div className="vital-box"><div className="vital-label">SpO2</div><div className="vital-val">{vitals.spo2}%</div></div>}
                  {vitals.weight && <div className="vital-box"><div className="vital-label">Weight</div><div className="vital-val">{vitals.weight}</div></div>}
                </div>
              </div>
            )}

            {appointment.diagnosis && (
              <div className="section">
                <div className="section-title">Diagnosis</div>
                <div style={{ fontSize: "14px", fontWeight: "bold" }}>{appointment.diagnosis}</div>
              </div>
            )}

            {medicines.length > 0 && (
              <div className="section">
                <div className="section-title">Prescribed Rx</div>
                <table className="rx-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Medicine Name</th>
                      <th>Dosage</th>
                      <th>Frequency</th>
                      <th>Duration</th>
                    </tr>
                  </thead>
                  <tbody>
                    {medicines.map((m, i) => (
                      <tr key={i}>
                        <td>{i + 1}</td>
                        <td><strong>{m.name}</strong></td>
                        <td>{m.dosage || "—"}</td>
                        <td>{m.frequency || "—"}</td>
                        <td>{m.duration || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {appointment.prescription_notes && (
              <div className="section">
                <div className="section-title">Doctor Advice &amp; Instructions</div>
                <div style={{ fontSize: "13px", whiteSpace: "pre-line" }}>{appointment.prescription_notes}</div>
              </div>
            )}

            {appointment.follow_up_date && (
              <div className="section">
                <div className="section-title">Next Follow-up</div>
                <div style={{ fontSize: "13px", fontWeight: "bold", color: "#0B4A41" }}>
                  {formatDay(appointment.follow_up_date)}
                </div>
              </div>
            )}

            <div className="footer">
              <div>Printed via Auriva Patient Portal</div>
              <div>Doctor Signature: _______________________</div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
