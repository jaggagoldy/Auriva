import {
  Stethoscope,
  Calendar,
  Wallet,
  HeartPulse,
  BarChart3,
  ShieldCheck,
  Building2,
  Hospital,
  FlaskConical,
  Pill,
  Sparkles,
  type LucideIcon,
} from 'lucide-react';

// Shared content for the marketing site — six pillars and six archetypes are
// canonical (AGENTS.md / Product Constitution); reused across Homepage,
// Platform, and Industries rather than duplicated per page.

export interface Pillar {
  icon: LucideIcon;
  title: string;
  description: string;
  examples: string[];
}

export const PILLARS: Pillar[] = [
  {
    icon: Stethoscope,
    title: 'Clinical Excellence',
    description: 'The clinical spine — from booking to follow-up.',
    examples: ['Appointments', 'Queue', 'Consultation', 'EMR', 'Prescriptions', 'Clinical Timeline', 'Follow-up'],
  },
  {
    icon: Calendar,
    title: 'Practice Operations',
    description: 'Keep the floor running on schedule, every day.',
    examples: ['Doctor Availability', 'Operational Calendar', 'Room Scheduling', 'Appointment Capacity', 'Operational Alerts'],
  },
  {
    icon: Wallet,
    title: 'Financial Operations',
    description: 'Cash and payer money, reconciled continuously.',
    examples: ['Billing', 'Payments', 'Insurance', 'Revenue', 'Packages', 'Invoices', 'Settlement'],
  },
  {
    icon: HeartPulse,
    title: 'Patient Engagement',
    description: 'A good experience even on a day someone isn’t sick.',
    examples: ['Patient Portal', 'Online Booking', 'Digital Forms', 'Teleconsultation', 'Communication', 'Feedback'],
  },
  {
    icon: BarChart3,
    title: 'Organization Intelligence',
    description: 'Live numbers that link to the record that proves them.',
    examples: ['Command Center', 'Reports', 'Analytics', 'Operational KPIs', 'Doctor Productivity', 'Clinic Performance'],
  },
  {
    icon: ShieldCheck,
    title: 'Platform Foundation',
    description: 'The identity, event, and audit backbone underneath.',
    examples: ['Identity', 'Authorization', 'Event Platform', 'Audit', 'APIs', 'Integration Framework', 'Notifications'],
  },
];

export interface Archetype {
  icon: LucideIcon;
  name: string;
  description: string;
  economics: string;
}

export interface EntryPath {
  emoji: string;
  title: string;
  description: string;
  links: { label: string; href: string }[];
}

// Three-path Entry Experience (APS-030 Step 6 / APS-031 Part 3) — the
// homepage teaser and the full /get-started page share this list so they
// never drift out of sync.
export const ENTRY_PATHS: EntryPath[] = [
  {
    emoji: '🏥',
    title: 'Healthcare Organization',
    description: 'Stand up your clinic, hospital, or chain on Auriva.',
    links: [
      { label: 'Create Organization', href: '/register-org' },
      { label: 'Book a demo first', href: '/book-demo' },
    ],
  },
  {
    emoji: '👩‍⚕️',
    title: 'Healthcare Professional',
    description: 'Joining a team that already runs on Auriva.',
    links: [
      { label: 'Accept an invitation', href: '/login' },
      { label: 'Sign in', href: '/login' },
    ],
  },
  {
    emoji: '❤️',
    title: 'Personal Health',
    description: 'Book care for yourself or your family.',
    links: [
      { label: 'Book an appointment', href: '/login' },
      { label: 'Sign in', href: '/login' },
    ],
  },
];

export const ARCHETYPES: Archetype[] = [
  {
    icon: Building2,
    name: 'Independent Clinic',
    description: 'One doctor, one location, running like clockwork.',
    economics: 'Built around doctor-hours.',
  },
  {
    icon: Stethoscope,
    name: 'Multi-specialty Clinic',
    description: 'Several specialties, one shared front desk and ledger.',
    economics: 'Built around consultant slots and capture.',
  },
  {
    icon: Hospital,
    name: 'Hospital',
    description: 'Departments, beds, and OT lists on one operational spine.',
    economics: 'Built around bed-days and OT-hours.',
  },
  {
    icon: FlaskConical,
    name: 'Diagnostic Center',
    description: 'Orders, samples, and results without lost paperwork.',
    economics: 'Built around analyzer throughput and turnaround time.',
  },
  {
    icon: Pill,
    name: 'Pharmacy Chain',
    description: 'Dispensing and stock across every store, one system.',
    economics: 'Built around footfall, basket size, and refills.',
  },
  {
    icon: Sparkles,
    name: 'Day Care Center',
    description: 'Recurring sessions and station boards, not one-off visits.',
    economics: 'Built around slots filled.',
  },
];
