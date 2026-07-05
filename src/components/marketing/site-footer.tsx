import Link from 'next/link';
import { Heart } from 'lucide-react';
import { Container } from '@/components/marketing/container';

// APS-031 Part 2 — sitemap columns + persistent Status signal.
// Only links to pages this build actually ships (APS-030 Principle 18:
// marketing tells the truth the product can prove) — Blog/Careers/Resources
// are deferred to a later batch rather than linked as dead ends.
const FOOTER_GROUPS = [
  {
    heading: 'Platform',
    links: [
      { href: '/platform', label: 'Platform' },
      { href: '/solutions', label: 'Solutions' },
      { href: '/industries', label: 'Industries' },
      { href: '/pricing', label: 'Pricing' },
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
      { href: '/contact-sales', label: 'Contact Sales' },
    ],
  },
  {
    heading: 'Get started',
    links: [
      { href: '/get-started', label: 'Get Started' },
      { href: '/book-demo', label: 'Book Demo' },
      { href: '/login', label: 'Sign In' },
    ],
  },
] as const;

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <Container className="py-14">
        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1fr]">
          <div className="col-span-2 flex flex-col gap-3 sm:col-span-1">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
                <Heart className="size-4 fill-primary/10 text-primary" />
              </span>
              <span className="text-base font-bold tracking-tight text-foreground">Auriva</span>
            </Link>
            <p className="max-w-[26ch] text-sm text-muted-foreground">
              The Healthcare Operating System — one platform, six configurations, zero forks.
            </p>
          </div>

          {FOOTER_GROUPS.map((group) => (
            <div key={group.heading} className="flex flex-col gap-3">
              <h3 className="text-xs font-semibold tracking-wide text-foreground">{group.heading}</h3>
              <ul className="flex flex-col gap-2.5">
                {group.links.map((link) => (
                  <li key={link.href}>
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
            &copy; {new Date().getFullYear()} Auriva. All rights reserved.
          </p>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" aria-hidden="true" />
            All systems operational
          </span>
        </div>
      </Container>
    </footer>
  );
}
