import Link from 'next/link';
import {
  ArrowRight,
  Check,
  Stethoscope,
  Users,
  Building2,
  Hospital,
  FlaskConical,
  Pill,
  ShieldCheck,
  Network,
  CalendarDays,
  FileText,
  Heart,
  Sparkles,
  IndianRupee,
  MessageCircle,
  MapPin,
  type LucideIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Container } from '@/components/marketing/container';

// Homepage — implements the Phase 1 "Connected Healthcare Operating System"
// design (WEB-BASELINE-V1). Two-sided platform story: providers + patients,
// ecosystem-first, warm & human. Real CTAs preserved (/start, /login,
// /contact-sales). Honey is a first-class design token (bg-honey /
// text-honey-deep / bg-honey-soft, defined in globals.css) — the warm accent
// from the Figma, used on patient surfaces, provider-money and highlights.

const ECOSYSTEM: { icon: LucideIcon; name: string; live?: boolean; honey?: boolean; desc: string }[] = [
  { icon: Users, name: 'Patients', live: true, honey: true, desc: 'Book, keep records, care for family — always free.' },
  { icon: Stethoscope, name: 'Doctors', live: true, desc: 'Run a full clinic from one calm screen.' },
  { icon: Building2, name: 'Clinics', desc: 'Multiple doctors, a shared calendar, a front desk.' },
  { icon: Hospital, name: 'Hospitals', desc: 'Departments, admissions and enterprise operations.' },
  { icon: FlaskConical, name: 'Labs', desc: 'Orders in, reports straight to the record.' },
  { icon: Pill, name: 'Pharmacy', desc: 'E-prescriptions, dispensing and inventory.' },
  { icon: ShieldCheck, name: 'Insurance', desc: 'Real-time claims and cashless authorizations.' },
  { icon: Network, name: 'Networks', desc: 'Referrals that carry the full record with them.' },
] as const;

const THREAD = [
  { icon: CalendarDays, who: 'Patient', act: 'books' },
  { icon: Stethoscope, who: 'Doctor', act: 'consults' },
  { icon: FileText, who: 'Prescription', act: 'written' },
  { icon: FlaskConical, who: 'Lab', act: 'ordered' },
  { icon: FileText, who: 'Report', act: 'ready' },
  { icon: Pill, who: 'Pharmacy', act: 'fills' },
  { icon: ShieldCheck, who: 'Insurance', act: 'settles' },
  { icon: Heart, who: 'Patient', act: 'cared for' },
] as const;

const ARCH = [
  {
    title: 'Clinical Core',
    sub: 'How care gets delivered',
    rows: [
      ['Scheduling & queue', true],
      ['Records & prescriptions', true],
      ['Billing & UPI', true],
      ['Teleconsults', false],
    ],
  },
  {
    title: 'Patient Vault',
    sub: 'The care that follows you',
    rows: [
      ['Appointments', true],
      ['Health records', true],
      ['Family accounts', true],
      ['Lab reports', true],
    ],
  },
  {
    title: 'Enterprise Rails',
    sub: 'When you scale up',
    rows: [
      ['Department routing', false],
      ['Admissions & beds', false],
      ['Insurance cashless', false],
      ['Referral networks', false],
    ],
  },
] as const;

const SCALE = [
  ['Solo Practices', true],
  ['Polyclinics', false],
  ['Multi-location Groups', false],
  ['Hospitals', false],
  ['Diagnostic Networks', false],
  ['Pharmacies', false],
  ['Insurance Providers', false],
] as const;

const FAQ = [
  {
    q: "Is Auriva for me if I'm a solo practitioner?",
    a: 'Yes — Auriva Solo Practice is live today and free forever. You get the full workspace, but only ever see the part you need. Setup takes a couple of minutes.',
  },
  {
    q: 'What makes it a "platform" and not just clinic software?',
    a: 'Everything connects. A prescription you write flows to labs, pharmacies and insurers on the same system. As new editions launch — multi-doctor, hospital, labs — they plug into the same core you already use.',
  },
  {
    q: 'What can patients do on Auriva?',
    a: 'Find and book doctors, get WhatsApp reminders, pay by UPI, and keep every prescription, record and lab report for life — for themselves and their family. Always free.',
  },
  {
    q: 'What happens when I grow into a clinic or hospital?',
    a: 'Nothing breaks. The same login and data simply unlock more — a shared calendar, more doctors, departments, admissions. You never migrate to different software.',
  },
  {
    q: 'Is it built for India?',
    a: 'Deeply. UPI payments, WhatsApp reminders, rupee billing and cashless insurance rails — shaped with practitioners here, not translated after the fact.',
  },
  {
    q: 'Who owns the data?',
    a: 'You do — provider and patient both. Export anytime, zero lock-in, and a tamper-evident log of every change.',
  },
] as const;

const PROVIDER_DAY = [
  {
    time: '8:30 AM',
    title: 'Reception checks your first patient in.',
    desc: 'They arrive, the front desk taps once, and their whole history — past visits, allergies, last prescription — is waiting for you.',
    icon: CalendarDays,
    iconCls: 'bg-accent text-accent-foreground',
    cardTitle: 'Priya Sharma',
    cardSub: '32 · Lower back pain · follow-up',
    pill: 'Waiting 4m',
    pillCls: 'bg-honey-soft text-honey-deep',
  },
  {
    time: '10:15 AM',
    title: 'You consult and prescribe — without breaking flow.',
    desc: 'Notes, prescription and the timeline on one screen. Finish, collect payment, and the record updates itself.',
    icon: Pill,
    iconCls: 'bg-accent text-accent-foreground',
    cardTitle: 'Prescription shared',
    cardSub: 'Amoxicillin · follow-up in 7 days',
    pill: 'Sent',
    pillCls: 'bg-success/15 text-success',
  },
  {
    time: '12:00 PM',
    title: 'A lab order routes itself.',
    desc: 'Order a test and it flows straight to the lab; the report comes back onto the record — no paper, no chasing.',
    icon: FlaskConical,
    iconCls: 'bg-info/15 text-info',
    cardTitle: 'CBC → PathLabs',
    cardSub: 'Ordered · report on the way',
    pill: 'Routed',
    pillCls: 'bg-info/15 text-info',
  },
  {
    time: '5:00 PM',
    title: 'The day closes itself out.',
    desc: "Payments reconciled, tomorrow's list ready. You just saw patients — the busywork handled itself.",
    icon: IndianRupee,
    iconCls: 'bg-honey-soft text-honey-deep',
    cardTitle: '₹4,200 collected today',
    cardSub: '7 payments · UPI settled',
    pill: 'Done',
    pillCls: 'bg-success/15 text-success',
  },
] as const;

const PATIENT_LIFE = [
  { icon: CalendarDays, title: 'Book instantly', desc: 'Find a trusted doctor and pick a slot in seconds — no app, no phone call.' },
  { icon: MessageCircle, title: 'Get smart reminders', desc: 'A friendly WhatsApp nudge before your visit — with directions to the door.' },
  { icon: Check, title: 'Walk into zero-wait check-in', desc: "You're expected. No forms, no queue — the clinic already has your details." },
  { icon: IndianRupee, title: 'Pay securely by UPI', desc: 'Scan, pay, done — your receipt is instant, no fumbling for change.' },
  { icon: FileText, title: 'Keep everything, for life', desc: 'Prescriptions and lab reports arrive automatically and stay yours forever.' },
] as const;

const PHONE_TILES = [
  { icon: FileText, name: 'Records', meta: '3 visits' },
  { icon: Pill, name: 'Prescriptions', meta: '2 active' },
  { icon: FlaskConical, name: 'Lab reports', meta: '1 new' },
  { icon: Users, name: 'Family', meta: '4 people' },
] as const;

export default function HomePage() {
  return (
    <>
      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              'radial-gradient(760px 460px at 12% 0%, #FBEBD3 0%, transparent 62%), radial-gradient(720px 620px at 100% 24%, #E7F0EC 0%, transparent 58%)',
          }}
        />
        <Container className="relative grid items-center gap-12 py-16 md:grid-cols-[1.1fr_.9fr] md:py-24">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-semibold text-muted-foreground shadow-sm">
              <span className="size-1.5 rounded-full bg-success ring-4 ring-success/20" />
              <span className="rounded-full bg-accent px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-foreground">
                Live today
              </span>
              Auriva Solo Practice
            </span>
            <h1 className="mt-5 font-heading text-4xl font-bold leading-[1.05] tracking-tight text-balance text-foreground md:text-6xl">
              One platform. Every patient. Every provider.{' '}
              <span className="text-primary">Every stage of care.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Available today for independent practitioners. Actively expanding into multi-doctor
              clinics, hospitals, diagnostics and the entire connected healthcare network — without
              ever changing your software.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button size="lg" nativeButton={false} render={<Link href="/start" />}>
                Start free <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" nativeButton={false} render={<Link href="/login" />}>
                For patients
              </Button>
            </div>
            <div className="mt-7 flex flex-wrap gap-x-6 gap-y-2 text-sm font-medium text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-primary" /> Free forever for solo
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-primary" /> Set up in minutes
              </span>
              <span className="inline-flex items-center gap-2">
                <Check className="size-4 text-primary" /> You own your data
              </span>
            </div>
          </div>

          {/* floating cards collage — the connected-healthcare story */}
          <div className="relative hidden h-[440px] md:block">
            <FloatCard className="left-0 right-[24%] top-0" honey>
              <Avatar honey>PS</Avatar>
              <div>
                <div className="font-heading text-sm font-bold">Priya booked online</div>
                <div className="text-xs text-muted-foreground">Tomorrow · 10:30 · Physio</div>
              </div>
              <span className="ml-auto rounded-full bg-honey-soft px-2.5 py-1 text-xs font-bold text-honey-deep">
                Patient
              </span>
            </FloatCard>
            <FloatCard className="left-[26%] right-[-4%] top-[24%]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-info/15 font-heading text-sm font-bold text-info">
                Rx
              </span>
              <div>
                <div className="font-heading text-sm font-bold">Lab order routed</div>
                <div className="text-xs text-muted-foreground">CBC · to PathLabs</div>
              </div>
              <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                Lab
              </span>
            </FloatCard>
            <FloatCard className="left-[2%] right-[28%] top-[50%]" honey>
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-honey-soft text-honey-deep">
                <IndianRupee className="size-5" />
              </span>
              <div>
                <div className="font-heading text-sm font-bold">₹600 · UPI</div>
                <div className="text-xs text-muted-foreground">Collected at visit</div>
              </div>
              <span className="ml-auto rounded-full bg-honey px-2.5 py-1 text-xs font-bold text-[#4A3413]">
                Provider
              </span>
            </FloatCard>
            <FloatCard className="left-[28%] right-[-2%] top-[76%]">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                <ShieldCheck className="size-5" />
              </span>
              <div>
                <div className="font-heading text-sm font-bold">Claim submitted</div>
                <div className="text-xs text-muted-foreground">Cashless · approved</div>
              </div>
              <span className="ml-auto rounded-full bg-accent px-2.5 py-1 text-xs font-bold text-accent-foreground">
                Insurance
              </span>
            </FloatCard>
          </div>
        </Container>
      </section>

      {/* ===== ECOSYSTEM GRID ===== */}
      <section className="bg-secondary py-16 md:py-24">
        <Container>
          <Eyebrow>The connected healthcare network</Eyebrow>
          <h2 className="mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Everyone in care, on one platform.
          </h2>
          <div className="mt-10 grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            {ECOSYSTEM.map(({ icon: Icon, name, live, honey, desc }) => (
              <div
                key={name}
                className="rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-1 hover:border-primary hover:shadow-lg"
              >
                <span
                  className={`mb-3.5 grid size-11 place-items-center rounded-xl ${
                    honey ? 'bg-honey-soft text-honey-deep' : 'bg-accent text-accent-foreground'
                  }`}
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="flex items-center gap-2 font-heading text-base font-bold">
                  {name}
                  {live ? (
                    <span className="size-1.5 rounded-full bg-success ring-4 ring-success/20" />
                  ) : (
                    <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      Soon
                    </span>
                  )}
                </h3>
                <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{desc}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ===== FRAGMENTATION / MISSION ===== */}
      <section className="relative overflow-hidden bg-[#0B4A41] py-20 text-white md:py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-40 size-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,162,76,.16), transparent 62%)' }}
        />
        <Container className="relative">
          <span className="text-xs font-bold uppercase tracking-[0.16em] text-honey">
            The problem we exist for
          </span>
          <h2 className="mt-4 max-w-3xl font-heading text-3xl font-bold leading-tight md:text-5xl">
            Healthcare is fragmented.{' '}
            <em className="not-italic text-honey">
              We connect it.
            </em>
          </h2>
          <p className="mt-6 max-w-2xl text-lg leading-relaxed text-[#EAF3EF]">
            A patient sees a doctor, gets a paper prescription, carries it to a pharmacy, walks a
            report to a lab, files a claim by hand. Every step starts from scratch. Auriva makes
            care flow as one connected story — starting with the independent practitioner.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-2.5">
            {['Clinics', 'Labs', 'Pharmacies', 'Insurers'].map((s) => (
              <span
                key={s}
                className="rounded-xl border border-white/15 bg-white/[0.07] px-3.5 py-2 text-sm font-semibold text-[#D6E7E1]"
              >
                {s}
              </span>
            ))}
            <ArrowRight className="size-4 text-white/40" />
            <span
              className="inline-flex items-center gap-2 rounded-xl bg-honey px-4 py-2 font-heading text-sm font-bold text-[#3B2708]"
            >
              <Sparkles className="size-4" /> One Auriva
            </span>
          </div>
        </Container>
      </section>

      {/* ===== CONNECTED / GOLDEN THREAD ===== */}
      <section className="py-16 md:py-24">
        <Container>
          <div className="text-center">
            <Eyebrow center>Connected healthcare</Eyebrow>
            <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
              One record, understood by everyone.
            </h2>
          </div>
          <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 lg:grid-cols-8">
            {THREAD.map(({ icon: Icon, who, act }, i) => (
              <div key={i} className="text-center">
                <span className="mx-auto grid size-14 place-items-center rounded-2xl border border-primary/30 bg-accent text-accent-foreground shadow-sm">
                  <Icon className="size-6" />
                </span>
                <div className="mt-3 font-heading text-[13px] font-bold">{who}</div>
                <div className="text-[11px] text-muted-foreground">{act}</div>
              </div>
            ))}
          </div>
          <p className="mt-8 text-center font-heading text-lg font-semibold text-primary">
            The prescription written in a solo clinic is the one a lab, a pharmacy and an insurer
            already understand.
          </p>
        </Container>
      </section>

      {/* ===== PROVIDERS — the day handling itself (timeline) ===== */}
      <section className="bg-secondary py-16 md:py-24">
        <Container>
          <div className="max-w-2xl">
            <Eyebrow>For healthcare providers</Eyebrow>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
              Your practice, quietly handling the busywork.
            </h2>
            <p className="mt-4 text-muted-foreground">
              An ordinary Monday, taking care of itself — with the whole ecosystem working behind
              every tap.
            </p>
          </div>

          <div className="mt-12">
            {PROVIDER_DAY.map((m, i) => (
              <div
                key={m.time}
                className="grid grid-cols-[52px_minmax(0,1fr)] gap-3 sm:grid-cols-[110px_minmax(0,1fr)] sm:gap-6"
              >
                <div className="pt-1 text-right text-[11px] font-bold text-primary sm:text-sm">
                  {m.time}
                </div>
                <div
                  className={`relative pb-8 pl-5 sm:pl-7 ${
                    i === PROVIDER_DAY.length - 1 ? '' : 'border-l-2 border-border'
                  }`}
                >
                  <span className="absolute -left-[7px] top-1 size-3 rounded-full bg-primary ring-4 ring-secondary" />
                  <h3 className="font-heading text-lg font-bold">{m.title}</h3>
                  <p className="mt-1 max-w-xl text-sm text-muted-foreground">{m.desc}</p>
                  <div className="mt-3 flex max-w-md items-center gap-3 rounded-xl border border-border bg-card p-3 shadow-sm">
                    <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${m.iconCls}`}>
                      <m.icon className="size-[18px]" />
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-heading text-sm font-bold">{m.cardTitle}</div>
                      <div className="truncate text-xs text-muted-foreground">{m.cardSub}</div>
                    </div>
                    <span className={`ml-auto shrink-0 rounded-full px-2.5 py-1 text-xs font-bold ${m.pillCls}`}>
                      {m.pill}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <Button size="lg" nativeButton={false} render={<Link href="/start" />}>
              Start free — set up today <ArrowRight className="size-4" />
            </Button>
          </div>
        </Container>
      </section>

      {/* ===== PATIENTS — care that remembers you (phone mock) ===== */}
      <section className="py-16 md:py-24">
        <Container className="grid items-center gap-12 md:grid-cols-2">
          <div>
            <span className="text-xs font-bold uppercase tracking-[0.16em] text-honey-deep">
              For patients · always free
            </span>
            <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
              Care that remembers you.
            </h2>
            <p className="mt-4 max-w-lg text-muted-foreground">
              Auriva isn&apos;t only for the clinic — it&apos;s for you, the person being cared for.
              One thread, from the moment you book to a lifetime of records that follow you everywhere.
            </p>
            <ul className="mt-6 space-y-4">
              {PATIENT_LIFE.map(({ icon: Icon, title, desc }) => (
                <li key={title} className="flex gap-3">
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-xl bg-honey-soft text-honey-deep">
                    <Icon className="size-4" />
                  </span>
                  <div>
                    <div className="font-heading text-sm font-bold">{title}</div>
                    <p className="text-sm text-muted-foreground">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                size="lg"
                className="bg-honey text-[#4A3413] hover:brightness-105"
                nativeButton={false}
                render={<Link href="/login" />}
              >
                Find a doctor near you <ArrowRight className="size-4" />
              </Button>
              <Button size="lg" variant="outline" disabled>
                The patient app · soon
              </Button>
            </div>
          </div>

          {/* phone mock */}
          <div className="flex justify-center md:justify-end">
            <div className="w-[300px] max-w-full rounded-[36px] border-[10px] border-foreground/90 bg-background shadow-2xl">
              <div className="rounded-[26px] bg-secondary/60 p-4">
                <div className="font-heading text-lg font-bold">Hello, Priya 👋</div>
                <div className="text-xs text-muted-foreground">Your health, all in one place</div>

                <div className="mt-4 overflow-hidden rounded-2xl bg-[#0B4A41] p-4 text-white">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-honey">
                    Your next visit
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15 font-heading text-sm font-bold">
                      AR
                    </span>
                    <div className="min-w-0">
                      <div className="font-heading text-sm font-bold">Dr. Anaya Rao</div>
                      <div className="flex items-center gap-1 text-[11px] text-white/70">
                        <MapPin className="size-3" /> Tomorrow · 10:30 AM · HSR Layout
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2.5">
                  {PHONE_TILES.map(({ icon: Icon, name, meta }) => (
                    <div key={name} className="rounded-2xl border border-border bg-card p-3">
                      <span className="grid size-8 place-items-center rounded-lg bg-honey-soft text-honey-deep">
                        <Icon className="size-4" />
                      </span>
                      <div className="mt-2 font-heading text-xs font-bold">{name}</div>
                      <div className="text-[10px] text-muted-foreground">{meta}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== PLATFORM ARCHITECTURE ===== */}
      <section className="bg-secondary py-16 md:py-24">
        <Container>
          <Eyebrow>The platform</Eyebrow>
          <h2 className="mt-3 max-w-xl font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
            One operating system. Modular by design.
          </h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Built as clean, composable layers — so every new edition plugs into the same core, and
            nothing is ever rebuilt.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {ARCH.map((col) => (
              <div key={col.title} className="rounded-2xl border border-border bg-card p-5">
                <div className="mb-3">
                  <div className="font-heading text-base font-bold">{col.title}</div>
                  <div className="text-xs text-muted-foreground">{col.sub}</div>
                </div>
                {col.rows.map(([label, live]) => (
                  <div
                    key={label as string}
                    className="flex items-center gap-2 border-t border-border py-2.5 text-sm"
                  >
                    <span className="text-foreground">{label}</span>
                    <span
                      className={`ml-auto rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
                        live ? 'bg-success/15 text-success' : 'bg-secondary text-muted-foreground'
                      }`}
                    >
                      {live ? 'Live' : 'Soon'}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* ===== BUILT TO SCALE ===== */}
      <section className="py-16 md:py-24">
        <Container className="text-center">
          <Eyebrow center>Built to scale</Eyebrow>
          <h2 className="mx-auto mt-3 max-w-2xl font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Start solo today. Grow to a network — never migrate.
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-2.5">
            {SCALE.map(([label, live]) => (
              <span
                key={label as string}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold ${
                  live
                    ? 'border-primary/30 bg-accent text-accent-foreground'
                    : 'border-border bg-card text-muted-foreground'
                }`}
              >
                {live ? (
                  <Check className="size-4" />
                ) : (
                  <span className="size-1.5 rounded-full bg-border" />
                )}
                {label}
                {live ? <span className="text-[10px] font-bold uppercase">Live</span> : null}
              </span>
            ))}
          </div>
        </Container>
      </section>

      {/* ===== PRICING ===== */}
      <section className="bg-secondary py-16 md:py-24">
        <Container>
          <div className="text-center">
            <Eyebrow center>Simple pricing</Eyebrow>
            <h2 className="mx-auto mt-3 max-w-xl font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
              Start free. Pay only when you grow.
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-muted-foreground">
              No setup fees, no lock-in. And for patients, Auriva is always free.
            </p>
          </div>
          <div className="mx-auto mt-10 grid max-w-3xl gap-4 md:grid-cols-2">
            <div className="relative overflow-hidden rounded-2xl bg-[#0B4A41] p-6 text-white shadow-xl">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-16 -top-20 size-[260px] rounded-full"
                style={{ background: 'radial-gradient(circle, rgba(232,162,76,.18), transparent 62%)' }}
              />
              <div className="relative">
                <div className="text-sm font-bold uppercase tracking-wide text-honey">
                  Auriva Solo Practice
                </div>
                <div className="mt-2 font-heading text-4xl font-bold">
                  Free<span className="text-base font-medium text-white/70"> forever</span>
                </div>
                <p className="mt-2 text-sm text-white/80">
                  Everything one practitioner needs to run a calm, full clinic — today.
                </p>
                <ul className="mt-5 space-y-2.5 text-sm">
                  {[
                    'Unlimited patients & appointments',
                    'Your own online booking page',
                    'Consults, prescriptions & UPI billing',
                    'Patient portal, records & timeline',
                    'WhatsApp & SMS reminders',
                  ].map((t) => (
                    <li key={t} className="flex items-center gap-2.5">
                      <Check className="size-4 shrink-0 text-honey" /> {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Button
                    className="w-full bg-white text-[#083F37] hover:bg-white/90"
                    nativeButton={false}
                    render={<Link href="/start" />}
                  >
                    Start free — 2 minutes <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-border bg-card p-6">
              <div className="text-sm font-bold uppercase tracking-wide text-accent-foreground">
                As you grow
              </div>
              <div className="mt-2 font-heading text-4xl font-bold">
                ₹999<span className="text-base font-medium text-muted-foreground">/mo</span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                When you add a second doctor or a front desk — everything in Solo, plus your team.
              </p>
              <ul className="mt-5 space-y-2.5 text-sm">
                {[
                  'Everything in Solo Practice',
                  'Add doctors & reception staff',
                  'Shared clinic calendar & queue',
                  'Practice insights & reports',
                ].map((t) => (
                  <li key={t} className="flex items-center gap-2.5">
                    <Check className="size-4 shrink-0 text-primary" /> {t}
                  </li>
                ))}
              </ul>
              <div className="mt-6">
                <Button variant="outline" className="w-full" nativeButton={false} render={<Link href="/contact-sales" />}>
                  Talk to us
                </Button>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* ===== FAQ ===== */}
      <section className="py-16 md:py-24">
        <Container className="max-w-3xl">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-3 font-heading text-3xl font-bold tracking-tight text-balance md:text-4xl">
            Everything you&apos;re wondering.
          </h2>
          <div className="mt-8 divide-y divide-border rounded-2xl border border-border bg-card">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="group px-5 py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading text-[15px] font-semibold">
                  {q}
                  <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border text-muted-foreground transition group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* ===== FINAL CTA ===== */}
      <section className="relative overflow-hidden bg-[#0B4A41] py-20 text-white md:py-24">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-32 -top-40 size-[480px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(232,162,76,.16), transparent 62%)' }}
        />
        <Container className="relative text-center">
          <h2 className="mx-auto max-w-2xl font-heading text-3xl font-bold leading-tight md:text-5xl">
            Your practice, running on Auriva by this afternoon.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-[#DCEAE5]">
            Free forever for independent practitioners. Grows with you when you&apos;re ready.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button
              size="lg"
              nativeButton={false} render={<Link href="/start" />}
              style={{ background: '#fff', color: '#083F37' }}
            >
              Start free — I&apos;m a provider <ArrowRight className="size-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              nativeButton={false} render={<Link href="/login" />}
              className="border-white/25 bg-white/10 text-white hover:bg-white/15"
            >
              Find a doctor — I&apos;m a patient
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}

/* ---------- small presentational helpers ---------- */

function Eyebrow({ children, center }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`flex items-center gap-3 ${center ? 'justify-center' : ''}`}>
      {center ? <span className="h-px w-8 bg-border" /> : null}
      <span className="text-xs font-bold uppercase tracking-[0.16em] text-primary">{children}</span>
      {center ? (
        <span className="h-px w-8 bg-border" />
      ) : (
        <span className="h-px flex-1 bg-border" />
      )}
    </div>
  );
}

function Avatar({ children, honey }: { children: React.ReactNode; honey?: boolean }) {
  return (
    <span
      className={`grid size-10 shrink-0 place-items-center rounded-xl font-heading text-sm font-bold ${
        honey ? 'bg-honey-soft text-honey-deep' : 'bg-accent text-accent-foreground'
      }`}
    >
      {children}
    </span>
  );
}

function FloatCard({
  children,
  className,
  honey,
}: {
  children: React.ReactNode;
  className?: string;
  honey?: boolean;
}) {
  return (
    <div
      className={`absolute flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-xl ${
        honey ? 'border-honey-soft' : 'border-border'
      } ${className ?? ''}`}
    >
      {children}
    </div>
  );
}
