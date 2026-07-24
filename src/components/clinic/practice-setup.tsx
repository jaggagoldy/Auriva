"use client";

// User-uploaded media has arbitrary runtime urls (via /api/files/[key]); raw
// <img> is the right tool here, not next/image (which wants build-time known
// remote patterns). Disable that rule for this file only.
/* eslint-disable @next/next/no-img-element */

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2, Upload, X, Plus, ImageIcon, FileText, Trash2, Check,
  Stethoscope, Building2, Clock, Sparkles, Share2, GraduationCap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

// P3 Practice Setup — the complete clinic + doctor profile module. One GET/PATCH
// (/api/clinic/profile); images go through /api/clinic/uploads (StorageService),
// so this UI never knows where files are stored — it only holds urls.

interface GalleryItem { url: string; caption?: string }
interface DocumentItem { url: string; name: string }
interface ClinicProfile {
  name: string; address: string | null; phone: string | null; email: string | null; website: string | null;
  about: string | null; logo_url: string | null; cover_url: string | null;
  facilities: string[]; gallery: GalleryItem[]; documents: DocumentItem[]; social: Record<string, string>;
  reception_contact: string | null; working_days: string | null; opens_at: string | null; closes_at: string | null;
  default_consultation_fee: number | null;
}
interface DoctorProfile {
  id: string; full_name: string; specialty: string | null; bio: string | null; qualifications: string | null;
  years_experience: number | null; languages: string | null; registration_number: string | null;
  consultation_fee: number | null; follow_up_fee: number | null; photo_url: string | null;
}

const DAYS = [
  { k: "mon", l: "Mon" }, { k: "tue", l: "Tue" }, { k: "wed", l: "Wed" }, { k: "thu", l: "Thu" },
  { k: "fri", l: "Fri" }, { k: "sat", l: "Sat" }, { k: "sun", l: "Sun" },
];
const SOCIAL_FIELDS = [
  { k: "website", l: "Website", ph: "https://…" },
  { k: "instagram", l: "Instagram", ph: "@handle" },
  { k: "facebook", l: "Facebook", ph: "facebook.com/…" },
  { k: "youtube", l: "YouTube", ph: "youtube.com/@…" },
  { k: "whatsapp", l: "WhatsApp", ph: "+91…" },
];

async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/clinic/uploads", { method: "POST", body: fd });
  const d = await res.json().catch(() => ({}));
  if (!res.ok) { toast.error(d.message ?? "Upload failed."); return null; }
  return d.url as string;
}

export function PracticeSetup({ onSaved }: { onSaved?: () => void }) {
  const [clinic, setClinic] = React.useState<ClinicProfile | null>(null);
  const [doctor, setDoctor] = React.useState<DoctorProfile | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/clinic/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) { setClinic(d.clinic); setDoctor(d.doctor); } })
      .catch(() => {});
  }, []);

  const setC = <K extends keyof ClinicProfile>(k: K, v: ClinicProfile[K]) => setClinic((c) => (c ? { ...c, [k]: v } : c));
  const setD = <K extends keyof DoctorProfile>(k: K, v: DoctorProfile[K]) => setDoctor((d) => (d ? { ...d, [k]: v } : d));

  async function save() {
    if (!clinic) return;
    setSaving(true);
    try {
      const res = await fetch("/api/clinic/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinic, doctor: doctor ?? undefined }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { toast.error(d.message ?? "Couldn't save."); return; }
      setClinic(d.clinic); setDoctor(d.doctor);
      setSaved(true); setTimeout(() => setSaved(false), 1600);
      toast.success("Practice profile saved");
      onSaved?.();
    } finally { setSaving(false); }
  }

  if (!clinic) return <div className="flex justify-center py-16 text-muted-foreground"><Loader2 className="size-5 animate-spin" /></div>;

  const days = new Set((clinic.working_days ?? "").split(",").map((s) => s.trim()).filter(Boolean));
  const toggleDay = (k: string) => {
    const next = new Set(days);
    if (next.has(k)) next.delete(k); else next.add(k);
    setC("working_days", DAYS.filter((d) => next.has(d.k)).map((d) => d.k).join(","));
  };

  return (
    <div className="space-y-4 pb-20">
      {/* Doctor profile */}
      <SectionCard icon={<Stethoscope className="size-4" />} title="Your profile" subtitle="How patients see you on your booking page.">
        {doctor ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4">
              <AvatarUpload url={doctor.photo_url} onChange={(u) => setD("photo_url", u)} fallback={doctor.full_name} />
              <div className="min-w-0 flex-1 space-y-1.5">
                <Label htmlFor="ps-name">Full name</Label>
                <Input id="ps-name" value={doctor.full_name} onChange={(e) => setD("full_name", e.target.value)} />
              </div>
            </div>
            <Grid2>
              <Field label="Specialty"><Input value={doctor.specialty ?? ""} onChange={(e) => setD("specialty", e.target.value)} placeholder="e.g. Dentist" /></Field>
              <Field label="Registration number"><Input value={doctor.registration_number ?? ""} onChange={(e) => setD("registration_number", e.target.value)} placeholder="e.g. KA-PT-10482" /></Field>
              <Field label="Qualifications / education" icon={<GraduationCap className="size-3.5" />}><Input value={doctor.qualifications ?? ""} onChange={(e) => setD("qualifications", e.target.value)} placeholder="e.g. BDS, MDS" /></Field>
              <Field label="Years of experience"><Input inputMode="numeric" value={doctor.years_experience ?? ""} onChange={(e) => setD("years_experience", e.target.value === "" ? null : Number(e.target.value))} placeholder="e.g. 12" /></Field>
              <Field label="Languages"><Input value={doctor.languages ?? ""} onChange={(e) => setD("languages", e.target.value)} placeholder="English, Hindi, Kannada" /></Field>
              <Field label="Consultation fee (₹)"><Input inputMode="numeric" value={doctor.consultation_fee ?? ""} onChange={(e) => setD("consultation_fee", e.target.value === "" ? null : Number(e.target.value))} placeholder="e.g. 500" /></Field>
              <Field label="Follow-up fee (₹)"><Input inputMode="numeric" value={doctor.follow_up_fee ?? ""} onChange={(e) => setD("follow_up_fee", e.target.value === "" ? null : Number(e.target.value))} placeholder="optional" /></Field>
            </Grid2>
            <Field label="About you"><Textarea rows={3} value={doctor.bio ?? ""} onChange={(e) => setD("bio", e.target.value)} placeholder="e.g. 12 years in restorative dentistry and painless root canals." /></Field>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No doctor profile on this clinic yet.</p>
        )}
      </SectionCard>

      {/* Clinic identity */}
      <SectionCard icon={<Building2 className="size-4" />} title="Clinic profile" subtitle="Your clinic's identity, contact and location.">
        <div className="space-y-4">
          <div>
            <Label>Cover image</Label>
            <CoverUpload url={clinic.cover_url} onChange={(u) => setC("cover_url", u)} />
          </div>
          <div className="flex items-center gap-4">
            <div>
              <Label>Logo</Label>
              <LogoUpload url={clinic.logo_url} onChange={(u) => setC("logo_url", u)} fallback={clinic.name} />
            </div>
            <div className="min-w-0 flex-1 space-y-1.5">
              <Label htmlFor="ps-cname">Clinic name</Label>
              <Input id="ps-cname" value={clinic.name} onChange={(e) => setC("name", e.target.value)} />
            </div>
          </div>
          <Field label="About the clinic"><Textarea rows={3} value={clinic.about ?? ""} onChange={(e) => setC("about", e.target.value)} placeholder="What your clinic is known for, who you care for…" /></Field>
          <Field label="Address"><Textarea rows={2} value={clinic.address ?? ""} onChange={(e) => setC("address", e.target.value)} placeholder="Street, area, city, pincode" /></Field>
          <Grid2>
            <Field label="Public phone"><Input value={clinic.phone ?? ""} onChange={(e) => setC("phone", e.target.value)} placeholder="+91 98450 12345" /></Field>
            <Field label="Reception contact"><Input value={clinic.reception_contact ?? ""} onChange={(e) => setC("reception_contact", e.target.value)} placeholder="front-desk number" /></Field>
            <Field label="Email"><Input value={clinic.email ?? ""} onChange={(e) => setC("email", e.target.value)} placeholder="clinic@example.com" /></Field>
            <Field label="Website"><Input value={clinic.website ?? ""} onChange={(e) => setC("website", e.target.value)} placeholder="https://…" /></Field>
          </Grid2>
        </div>
      </SectionCard>

      {/* Timings */}
      <SectionCard icon={<Clock className="size-4" />} title="Working hours" subtitle="The days and hours you see patients.">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {DAYS.map((d) => (
              <button key={d.k} onClick={() => toggleDay(d.k)}
                className={cn("rounded-lg border px-3 py-1.5 text-sm font-medium transition", days.has(d.k) ? "border-honey-deep/40 bg-honey-soft text-honey-deep" : "text-muted-foreground hover:bg-muted")}>
                {d.l}
              </button>
            ))}
          </div>
          <Grid2>
            <Field label="Opens at"><Input type="time" value={clinic.opens_at ?? ""} onChange={(e) => setC("opens_at", e.target.value)} /></Field>
            <Field label="Closes at"><Input type="time" value={clinic.closes_at ?? ""} onChange={(e) => setC("closes_at", e.target.value)} /></Field>
          </Grid2>
          <p className="text-xs text-muted-foreground">Detailed slots, breaks and time-off are set in Availability below.</p>
        </div>
      </SectionCard>

      {/* Facilities */}
      <SectionCard icon={<Sparkles className="size-4" />} title="Facilities" subtitle="What you offer on-site.">
        <ChipEditor items={clinic.facilities} onChange={(items) => setC("facilities", items)} placeholder="e.g. Wheelchair access" />
      </SectionCard>

      {/* Gallery */}
      <SectionCard icon={<ImageIcon className="size-4" />} title="Photo gallery" subtitle="Show your space — reception, rooms, equipment.">
        <GalleryEditor items={clinic.gallery} onChange={(items) => setC("gallery", items)} />
      </SectionCard>

      {/* Documents / certificates */}
      <SectionCard icon={<FileText className="size-4" />} title="Documents & certificates" subtitle="Registrations, awards, accreditations (PDF or image).">
        <DocumentEditor items={clinic.documents} onChange={(items) => setC("documents", items)} />
      </SectionCard>

      {/* Social */}
      <SectionCard icon={<Share2 className="size-4" />} title="Social links" subtitle="Where patients can find you online.">
        <Grid2>
          {SOCIAL_FIELDS.map((f) => (
            <Field key={f.k} label={f.l}>
              <Input value={clinic.social[f.k] ?? ""} onChange={(e) => setC("social", { ...clinic.social, [f.k]: e.target.value })} placeholder={f.ph} />
            </Field>
          ))}
        </Grid2>
      </SectionCard>

      {/* Sticky save */}
      <div className="sticky bottom-0 -mx-1 flex items-center justify-end gap-3 border-t bg-background/90 px-1 py-3 backdrop-blur">
        {saved && <span className="inline-flex items-center gap-1 text-sm text-success"><Check className="size-4" /> Saved</span>}
        <Button onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />} Save practice profile</Button>
      </div>
    </div>
  );
}

// ── building blocks ─────────────────────────────────────────────────────────
function SectionCard({ icon, title, subtitle, children }: { icon: React.ReactNode; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-start gap-2.5">
        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-foreground">{icon}</span>
        <div>
          <h2 className="font-heading text-base font-bold">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </Card>
  );
}
function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="flex items-center gap-1.5">{icon}{label}</Label>
      {children}
    </div>
  );
}

function useUpload(onDone: (url: string) => void) {
  const [busy, setBusy] = React.useState(false);
  async function pick(file?: File | null) {
    if (!file) return;
    setBusy(true);
    const url = await uploadFile(file);
    setBusy(false);
    if (url) onDone(url);
  }
  return { busy, pick };
}

function AvatarUpload({ url, onChange, fallback }: { url: string | null; onChange: (u: string) => void; fallback: string }) {
  const { busy, pick } = useUpload(onChange);
  const ref = React.useRef<HTMLInputElement>(null);
  const initials = fallback.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <button onClick={() => ref.current?.click()} className="group relative size-16 shrink-0 overflow-hidden rounded-2xl border bg-honey-soft" aria-label="Upload photo">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : <span className="grid size-full place-items-center font-heading text-lg font-bold text-honey-deep">{initials}</span>}
      <span className="absolute inset-0 grid place-items-center bg-foreground/40 text-white opacity-0 transition group-hover:opacity-100">{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}</span>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </button>
  );
}
function LogoUpload({ url, onChange, fallback }: { url: string | null; onChange: (u: string) => void; fallback: string }) {
  return <AvatarUpload url={url} onChange={onChange} fallback={fallback} />;
}
function CoverUpload({ url, onChange }: { url: string | null; onChange: (u: string) => void }) {
  const { busy, pick } = useUpload(onChange);
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <button onClick={() => ref.current?.click()} className="group relative mt-1.5 flex h-32 w-full items-center justify-center overflow-hidden rounded-xl border border-dashed bg-muted/40" aria-label="Upload cover">
      {url ? <img src={url} alt="" className="size-full object-cover" /> : (
        <span className="flex items-center gap-2 text-sm text-muted-foreground">{busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Add a cover image</span>
      )}
      {url && <span className="absolute inset-0 grid place-items-center bg-foreground/40 text-white opacity-0 transition group-hover:opacity-100"><Upload className="size-5" /></span>}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </button>
  );
}

function ChipEditor({ items, onChange, placeholder }: { items: string[]; onChange: (items: string[]) => void; placeholder: string }) {
  const [val, setVal] = React.useState("");
  function add() {
    const v = val.trim();
    if (!v || items.some((i) => i.toLowerCase() === v.toLowerCase())) { setVal(""); return; }
    onChange([...items, v]); setVal("");
  }
  return (
    <div className="space-y-2.5">
      {items.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {items.map((i) => (
            <span key={i} className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[13px] font-medium">
              {i}
              <button onClick={() => onChange(items.filter((x) => x !== i))} aria-label={`Remove ${i}`}><X className="size-3.5 opacity-60 hover:opacity-100" /></button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} placeholder={placeholder} />
        <Button variant="outline" onClick={add}><Plus className="size-4" /></Button>
      </div>
    </div>
  );
}

function GalleryEditor({ items, onChange }: { items: GalleryItem[]; onChange: (items: GalleryItem[]) => void }) {
  const { busy, pick } = useUpload((url) => onChange([...items, { url }]));
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2.5">
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {items.map((g, i) => (
          <div key={i} className="group relative aspect-square overflow-hidden rounded-lg border">
            <img src={g.url} alt="" className="size-full object-cover" />
            <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="absolute right-1 top-1 grid size-6 place-items-center rounded-md bg-foreground/60 text-white opacity-0 transition group-hover:opacity-100" aria-label="Remove"><Trash2 className="size-3.5" /></button>
          </div>
        ))}
        <button onClick={() => ref.current?.click()} className="grid aspect-square place-items-center rounded-lg border border-dashed text-muted-foreground hover:bg-muted/50" aria-label="Add photo">
          {busy ? <Loader2 className="size-5 animate-spin" /> : <Plus className="size-5" />}
        </button>
      </div>
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function DocumentEditor({ items, onChange }: { items: DocumentItem[]; onChange: (items: DocumentItem[]) => void }) {
  const { busy, pick } = useUpload((url) => onChange([...items, { url, name: "New document" }]));
  const ref = React.useRef<HTMLInputElement>(null);
  return (
    <div className="space-y-2.5">
      {items.map((d, i) => (
        <div key={i} className="flex items-center gap-2.5 rounded-lg border p-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-secondary text-muted-foreground"><FileText className="size-4" /></span>
          <Input value={d.name} onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="flex-1" />
          <a href={d.url} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-primary hover:underline">View</a>
          <button onClick={() => onChange(items.filter((_, j) => j !== i))} className="grid size-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive" aria-label="Remove"><Trash2 className="size-4" /></button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />} Add document
      </Button>
      <input ref={ref} type="file" accept="image/*,application/pdf" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}
