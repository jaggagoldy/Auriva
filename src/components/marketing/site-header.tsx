'use client';

import Link from 'next/link';
import {
  Menu,
  ChevronDown,
  Stethoscope,
  Users,
  Building2,
  Hospital,
  FlaskConical,
  Pill,
  ShieldCheck,
  Network,
  Search,
  CalendarDays,
  FileText,
  Heart,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Container } from '@/components/marketing/container';

// Primary nav — WEB-BASELINE-V1 two-sided platform story with mega-menus.
// Every href is a page this build actually ships (no dead ends). Dropdowns
// open on hover AND keyboard focus (group-focus-within) for accessibility.

const MOBILE_LINKS = [
  { href: '/platform', label: 'Products' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/login', label: 'For Patients' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/about', label: 'Company' },
] as const;

const EDITIONS_SOON = [
  { icon: Users, name: 'Auriva Multi-Doctor', desc: 'Shared schedules, cross-functional queues.' },
  { icon: Building2, name: 'Auriva Clinic Groups', desc: 'Central ops for multi-location groups.' },
  { icon: Hospital, name: 'Auriva Hospital', desc: 'Departments, admissions, enterprise ops.' },
  { icon: FlaskConical, name: 'Auriva Labs', desc: 'Diagnostics, sample tracking, reports.' },
  { icon: Pill, name: 'Auriva Pharmacy', desc: 'E-prescriptions, dispensing, inventory.' },
  { icon: ShieldCheck, name: 'Auriva Insurance', desc: 'Claims routing, cashless authorizations.' },
];

function Mark() {
  return (
    <span className="flex size-8 items-center justify-center rounded-[10px] bg-primary shadow-sm">
      <svg
        viewBox="0 0 24 24"
        className="size-4"
        fill="none"
        stroke="#fff"
        strokeWidth={2.4}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M3 12h3l2-6 4 12 2-6h4" />
      </svg>
    </span>
  );
}

function SoonBadge() {
  return (
    <span className="rounded-full border border-border px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
      Soon
    </span>
  );
}

function NavItem({
  label,
  children,
  width = 'w-[300px]',
}: {
  label: string;
  children: React.ReactNode;
  width?: string;
}) {
  return (
    <div className="group relative">
      <button className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors group-hover:bg-secondary group-hover:text-foreground group-focus-within:bg-secondary group-focus-within:text-foreground">
        {label}
        <ChevronDown className="size-3.5 opacity-60 transition group-hover:rotate-180 group-focus-within:rotate-180" />
      </button>
      <div
        className={`invisible absolute left-0 top-[calc(100%+6px)] z-50 ${width} translate-y-1 rounded-2xl border border-border bg-card p-3 opacity-0 shadow-xl transition-all duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100`}
      >
        {children}
      </div>
    </div>
  );
}

function DropHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
      {children}
    </div>
  );
}

function DropRow({
  href,
  icon: Icon,
  name,
  desc,
  badge,
  honey,
}: {
  href: string;
  icon: React.ElementType;
  name: string;
  desc?: string;
  badge?: React.ReactNode;
  honey?: boolean;
}) {
  return (
    <Link href={href} className="flex items-start gap-3 rounded-xl p-2.5 transition hover:bg-secondary">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-lg ${
          honey ? 'bg-honey-soft text-honey-deep' : 'bg-accent text-accent-foreground'
        }`}
      >
        <Icon className="size-[18px]" />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 font-heading text-sm font-bold">
          {name}
          {badge}
        </span>
        {desc ? <span className="mt-0.5 block text-xs text-muted-foreground">{desc}</span> : null}
      </span>
    </Link>
  );
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <Mark />
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">Auriva</span>
        </Link>

        <nav className="hidden items-center gap-0.5 lg:flex">
          {/* Products mega-menu */}
          <NavItem label="Products" width="w-[640px]">
            <DropHeading>Live today</DropHeading>
            <DropRow
              href="/start"
              icon={Stethoscope}
              name="Auriva Solo Practice"
              desc="Everything an independent practitioner needs to run a full clinic."
              badge={
                <span className="rounded-full bg-success/15 px-2 py-0.5 text-[9px] font-bold uppercase text-success">
                  Live
                </span>
              }
            />
            <DropHeading>Coming soon</DropHeading>
            <div className="grid grid-cols-2 gap-1">
              {EDITIONS_SOON.map((e) => (
                <DropRow
                  key={e.name}
                  href="/platform"
                  icon={e.icon}
                  name={e.name}
                  desc={e.desc}
                  badge={<SoonBadge />}
                />
              ))}
              <DropRow href="/platform" icon={Network} name="Auriva Networks" desc="Cross-system referrals across the platform." badge={<SoonBadge />} />
            </div>
          </NavItem>

          {/* Solutions */}
          <NavItem label="Solutions" width="w-[280px]">
            <DropHeading>By profession</DropHeading>
            {['Physiotherapists', 'Dentists', 'Dietitians', 'Psychologists', 'Dermatologists'].map(
              (p) => (
                <Link
                  key={p}
                  href="/solutions"
                  className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-secondary"
                >
                  {p}
                </Link>
              )
            )}
            <Link href="/solutions" className="block rounded-xl px-3 py-2 text-sm font-semibold text-primary transition hover:bg-secondary">
              See all specialties →
            </Link>
          </NavItem>

          {/* For Patients */}
          <NavItem label="For Patients" width="w-[300px]">
            <DropHeading>Your health, in one place</DropHeading>
            <DropRow href="/login" icon={Search} name="Find a doctor" honey />
            <DropRow href="/login" icon={CalendarDays} name="Book an appointment" honey />
            <DropRow href="/login" icon={FileText} name="Records & prescriptions" honey />
            <DropRow href="/login" icon={Heart} name="Family health" honey />
          </NavItem>

          <Link
            href="/pricing"
            className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            Pricing
          </Link>

          {/* Company */}
          <NavItem label="Company" width="w-[240px]">
            <Link href="/about" className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-secondary">
              About
            </Link>
            <Link href="/security" className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-secondary">
              Security &amp; Trust
            </Link>
            <Link href="/customers" className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-secondary">
              Customers
            </Link>
            <Link href="/contact-sales" className="block rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-secondary">
              Contact
            </Link>
          </NavItem>
        </nav>

        <div className="hidden shrink-0 items-center gap-2 lg:flex">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Sign in
          </Button>
          <Button nativeButton={false} render={<Link href="/start" />}>
            Start free
          </Button>
        </div>

        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" />}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {MOBILE_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  nativeButton={false}
                  render={
                    <Link
                      href={link.href}
                      className="rounded-lg px-3 py-2.5 text-sm font-medium text-foreground hover:bg-secondary"
                    />
                  }
                >
                  {link.label}
                </SheetClose>
              ))}
              <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
                <SheetClose
                  nativeButton={false}
                  render={<Button variant="outline" nativeButton={false} render={<Link href="/login" />} />}
                >
                  Sign in
                </SheetClose>
                <SheetClose
                  nativeButton={false}
                  render={<Button nativeButton={false} render={<Link href="/start" />} />}
                >
                  Start free
                </SheetClose>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  );
}
