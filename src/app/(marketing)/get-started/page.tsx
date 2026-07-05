import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Container } from '@/components/marketing/container';
import { PageHero } from '@/components/marketing/page-hero';
import { ENTRY_PATHS } from '@/components/marketing/content';

export const metadata: Metadata = {
  title: 'Get Started',
  description: 'Three ways into Auriva — choose the one that matches why you’re here.',
};

// APS-031 Part 3 — this is the front door replacing the old generic
// role-picker login screen (APS-030 §1.1/§6). Deep OTP/invitation/session
// mechanics live in /login (Phase 2 scope); this page is the entry choice.
export default function GetStartedPage() {
  return (
    <>
      <PageHero
        eyebrow="Get Started"
        title="Choose the path that matches why you're here"
        description="No role dropdown, no generic login — pick the door that's actually yours."
      />

      <Container className="py-16">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {ENTRY_PATHS.map((path) => (
            <Card key={path.title} className="ring-border/60">
              <CardHeader>
                <span className="text-3xl" aria-hidden="true">
                  {path.emoji}
                </span>
                <CardTitle className="mt-2 text-base">{path.title}</CardTitle>
                <CardDescription>{path.description}</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                {path.links.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="text-sm font-medium text-primary hover:underline"
                  >
                    {link.label} &rarr;
                  </Link>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      </Container>
    </>
  );
}
