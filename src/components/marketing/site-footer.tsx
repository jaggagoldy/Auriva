import Link from 'next/link';
import { Container } from '@/components/marketing/container';

// Sitemap columns + persistent Status signal. Only links to pages this build
// actually ships (marketing tells the truth the product can prove).
const FOOTER_GROUPS = [
  {
    heading: 'Products',
    links: [
      { href: '/platform', label: 'Platform' },
      { href: '/solutions', label: 'Solutions' },
      { href: '/pricing', label: 'Pricing' },
    ],
  },
  {
    heading: 'For patients',
    links: [
      { href: '/login', label: 'Find a doctor' },
      { href: '/login', label: 'Your records' },
      { href: '/login', label: 'Sign in' },
    ],
  },
  {
    heading: 'Trust',
    links: [
      { href: '/security', label: 'Security' },
      { href: '/compliance', label: 'Compliance' },
      { href: '/trust', label: 'Trust Center' },
    ],
  },
  {
    heading: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/customers', label: 'Customers' },
      { href: '/contact-sales', label: 'Contact' },
    ],
  },
] as const;

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

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <Container className="py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <Mark />
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">Auriva</span>
            </Link>
            <p className="max-w-[30ch] text-sm text-muted-foreground">
              The healthcare operating system. Connecting every patient and provider — one platform,
              growing with you.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3">
              <h3 className="font-heading text-xs font-bold uppercase tracking-wide text-foreground">
                {group.heading}
              </h3>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={`${group.heading}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-border pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} Auriva. The healthcare operating system, built in India.
          </p>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" aria-hidden="true" />
            All systems operational
          </span>
        </div>
      </Container>
    </footer>
  );
}
