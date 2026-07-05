'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, ShieldQuestion, ScrollText, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Container } from '@/components/marketing/container';
import { PILLARS, ARCHETYPES, ENTRY_PATHS } from '@/components/marketing/content';

// APS-031 Part 2 — homepage, matches design/aps-031-homepage.html.
// Uses semantic design tokens (bg-background, text-foreground, bg-primary, ...)
// rather than hardcoded hex, so the page is dark-mode-ready by construction.

const TRUST_ITEMS = [
  { icon: Shield, label: 'WCAG 2.2 AA accessible', href: '/security' },
  { icon: ScrollText, label: 'Full audit trail on every record', href: '/compliance' },
  { icon: ShieldQuestion, label: 'Your data, your organization, always', href: '/trust' },
] as const;

const FACTS = [
  { value: '6', label: 'organization archetypes, one codebase' },
  { value: '9', label: 'operational primitives underneath' },
  { value: 'AA', label: 'WCAG 2.2 accessibility standard' },
] as const;

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } },
};

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/3 rounded-full bg-primary/5 blur-3xl"
        />
        <Container className="relative flex flex-col items-center gap-6 py-20 text-center md:py-28">
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary">
              The Healthcare Operating System
            </span>
          </motion.div>
          <motion.h1
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.05 }}
            className="max-w-3xl text-4xl font-extrabold tracking-tight text-balance text-foreground md:text-6xl"
          >
            One platform. Six configurations. Zero forks.
          </motion.h1>
          <motion.p
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.1 }}
            className="max-w-2xl text-lg text-muted-foreground md:text-xl"
          >
            Auriva runs clinics, hospitals, diagnostic centers, pharmacy chains and day care centers on one
            coherent system — so the people inside them spend more of their day on care, and less of it on
            software.
          </motion.p>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            transition={{ delay: 0.15 }}
            className="flex flex-col items-center gap-3 pt-2 sm:flex-row"
          >
            <Button
              size="lg"
              className="h-11 px-6 text-[15px]"
              nativeButton={false}
              render={<Link href="/book-demo" />}
            >
              Book Demo
              <ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="h-11 px-6 text-[15px]"
              nativeButton={false}
              render={<Link href="/platform" />}
            >
              Explore Platform
            </Button>
          </motion.div>
        </Container>
      </section>

      {/* Six Pillars */}
      <section className="border-y border-border bg-muted/30 py-20">
        <Container>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Six pillars, one platform</h2>
            <p className="mt-2 text-muted-foreground">
              Every feature strengthens one of these. If it doesn&apos;t, it doesn&apos;t ship.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PILLARS.map((pillar) => (
              <Card key={pillar.title} className="ring-border/60">
                <CardHeader>
                  <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-primary/10">
                    <pillar.icon className="size-4.5 text-primary" />
                  </div>
                  <CardTitle className="text-base">{pillar.title}</CardTitle>
                  <CardDescription>{pillar.description}</CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </Container>
      </section>

      {/* Archetypes */}
      <section className="py-20">
        <Container>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">
              Built for every kind of healthcare organization
            </h2>
            <p className="mt-2 text-muted-foreground">
              Six archetypes, sharing the same modules and the same operational primitives.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {ARCHETYPES.map((a) => (
              <div
                key={a.name}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-5"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary">
                  <a.icon className="size-4.5 text-foreground" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-foreground">{a.name}</h3>
                  <p className="mt-0.5 text-sm text-muted-foreground">{a.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Trust strip */}
      <section className="border-y border-border bg-muted/30 py-10">
        <Container className="flex flex-col flex-wrap items-center justify-center gap-x-10 gap-y-4 sm:flex-row">
          {TRUST_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              <item.icon className="size-4 text-primary" />
              {item.label}
            </Link>
          ))}
        </Container>
      </section>

      {/* Honest facts row — replaces fabricated usage stats/testimonials from
          the illustrative mockup with true, verifiable claims about the
          platform itself (see turn summary for why). */}
      <section className="bg-foreground py-14 text-background">
        <Container>
          <div className="grid grid-cols-1 divide-y divide-background/10 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
            {FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col items-center gap-1 py-6 text-center sm:py-0">
                <span className="text-3xl font-extrabold tabular-nums">{fact.value}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-background/60">
                  {fact.label}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Get started in three ways */}
      <section className="py-20">
        <Container>
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Get started in three ways</h2>
            <p className="mt-2 text-muted-foreground">Choose the path that matches why you&apos;re here.</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
            {ENTRY_PATHS.map((path) => (
              <Card key={path.title} className="ring-border/60">
                <CardHeader>
                  <span className="text-2xl" aria-hidden="true">
                    {path.emoji}
                  </span>
                  <CardTitle className="mt-2 text-base">{path.title}</CardTitle>
                  <CardDescription>{path.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col gap-1.5">
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
      </section>
    </>
  );
}
