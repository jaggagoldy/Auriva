import type { Metadata } from 'next';
import { Shield, ScrollText, ClipboardCheck, Lock } from 'lucide-react';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export const metadata: Metadata = {
  title: 'Trust & Security',
  description:
    'What Auriva actually does today to protect healthcare data, and what is still on the roadmap — stated plainly.',
};

// APS-031 Part 2/7 — matches design/aps-031-trust-security.html. Status is
// stated honestly (Live / In Progress / Roadmap) rather than overclaimed;
// see APS-030 Principle 18 ("marketing tells the truth the product can prove").
type Status = 'live' | 'in-progress' | 'roadmap';

const STATUS_STYLES: Record<Status, string> = {
  live: 'bg-success/10 text-success border-success/30',
  'in-progress':
    'bg-warning/10 text-warning border-warning/30',
  roadmap: 'bg-muted text-muted-foreground border-border',
};

const STATUS_LABEL: Record<Status, string> = {
  live: 'Live',
  'in-progress': 'In Progress',
  roadmap: 'Roadmap',
};

function StatusBadge({ status }: { status: Status }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold',
        STATUS_STYLES[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const COMPLIANCE_ROWS: { capability: string; status: Status }[] = [
  { capability: 'Audit trail on every record', status: 'live' },
  { capability: 'WCAG 2.2 AA accessibility', status: 'live' },
  { capability: 'ABHA health ID linkage', status: 'in-progress' },
  { capability: 'Government ID verification', status: 'roadmap' },
  { capability: 'SOC 2 / ISO certification', status: 'roadmap' },
  { capability: 'Enterprise SSO', status: 'in-progress' },
];

const TIMELINE_SAMPLE = [
  { entry: 'Invoice #1042 created', actor: 'Priya (Reception)', time: '10:32 AM' },
  { entry: 'Appointment checked in', actor: 'Front Desk', time: '10:18 AM' },
  { entry: 'Prescription issued', actor: 'Dr. Mehta', time: '9:54 AM' },
  { entry: 'Payment recorded — ₹1,200', actor: 'Priya (Reception)', time: '9:41 AM' },
];

const SECTIONS = [
  { id: 'security', label: 'Security' },
  { id: 'compliance', label: 'Compliance' },
  { id: 'trust-center', label: 'Trust Center' },
  { id: 'data-privacy', label: 'Data & Privacy' },
] as const;

export default function TrustPage() {
  return (
    <>
      <PageHero
        eyebrow="Trust & Security"
        title="Healthcare data deserves more than a checkbox."
        description="Here's exactly what we do today, and what's still on our roadmap — stated plainly, not overclaimed."
      />

      <Container className="grid grid-cols-1 gap-10 py-14 lg:grid-cols-[200px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-20 flex flex-col gap-1 border-l border-border pl-4">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="block py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                >
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-16">
          <section id="security" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <Shield className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Security</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              Every permission denial names the specific grant you&apos;re missing — access is scoped by
              role, not by convention. Every appointment, invoice, and record change is written to a
              tamper-evident, actor-and-timestamp-stamped audit log. Traffic to and from Auriva is
              encrypted in transit (TLS). At-rest encryption depends on your hosting provider&apos;s disk
              configuration — see our deployment documentation for guidance. If something goes wrong, our
              incident response process starts with notifying affected organizations directly, not with a
              press release.
            </p>
          </section>

          <section id="compliance" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <ClipboardCheck className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Compliance</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              We&apos;re building toward full ABDM/ABHA alignment, not claiming it&apos;s finished. This
              table is the honest status, updated as capabilities actually ship.
            </p>
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full text-sm">
                <tbody>
                  {COMPLIANCE_ROWS.map((row, i) => (
                    <tr key={row.capability} className={i !== 0 ? 'border-t border-border' : ''}>
                      <td className="px-4 py-3 text-foreground">{row.capability}</td>
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={row.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Enterprise SSO is available for qualifying organizations on request — we don&apos;t build
              speculative enterprise features ahead of a named need.
            </p>
          </section>

          <section id="trust-center" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Trust Center</h2>
            </div>
            <p className="mb-6 max-w-2xl text-muted-foreground">
              What we log, and how long we keep it: every clinically or financially meaningful action
              writes an entry to an append-only event log. That log is the audit substrate — it can be
              exported by your organization and reproduced for any past date.
            </p>
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Sample audit timeline
              </h3>
              <ul className="flex flex-col gap-3">
                {TIMELINE_SAMPLE.map((item) => (
                  <li key={item.entry} className="flex items-center justify-between gap-4 text-sm">
                    <span className="text-foreground">{item.entry}</span>
                    <span className="shrink-0 text-muted-foreground">
                      {item.actor} &middot; {item.time}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section id="data-privacy" className="scroll-mt-24">
            <div className="mb-4 flex items-center gap-2">
              <ScrollText className="size-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground">Data &amp; Privacy</h2>
            </div>
            <p className="max-w-2xl text-muted-foreground">
              Your organization&apos;s data belongs to your organization — always. Records are shared
              only on a consent basis, never sold. Per-patient controls over exactly who can see what
              (&quot;who can see my records&quot;) are on our roadmap; we&apos;ll say so here the day
              they ship, not before.
            </p>
          </section>

          <section className="flex flex-col items-start gap-3 rounded-xl border border-border bg-muted/30 p-6 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Have a specific security or compliance question?
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">Talk to our security team directly.</p>
            </div>
            <Button nativeButton={false} render={<Link href="/contact-sales" />}>
              Talk to Security
            </Button>
          </section>
        </div>
      </Container>
    </>
  );
}
