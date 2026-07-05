'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Menu } from 'lucide-react';
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
import { cn } from '@/lib/utils';

// APS-031 Part 2 — primary nav matches the approved homepage mockup
// (design/aps-031-homepage.html): Platform · Solutions · Industries ·
// Pricing · Customers · Security, then Sign In (secondary) / Book Demo (primary).
const NAV_LINKS = [
  { href: '/platform', label: 'Platform' },
  { href: '/solutions', label: 'Solutions' },
  { href: '/industries', label: 'Industries' },
  { href: '/pricing', label: 'Pricing' },
  { href: '/customers', label: 'Customers' },
  { href: '/security', label: 'Security' },
] as const;

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-md">
      <Container className="flex h-14 items-center justify-between gap-6">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-primary/10">
            <Heart className="size-4 fill-primary/10 text-primary" />
          </span>
          <span className="text-base font-bold tracking-tight text-foreground">
            Auriva
          </span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground',
                  active && 'text-foreground'
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden shrink-0 items-center gap-2 md:flex">
          <Button variant="ghost" nativeButton={false} render={<Link href="/login" />}>
            Sign In
          </Button>
          <Button nativeButton={false} render={<Link href="/book-demo" />}>
            Book Demo
          </Button>
        </div>

        <Sheet>
          <SheetTrigger
            render={<Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu" />}
          >
            <Menu />
          </SheetTrigger>
          <SheetContent side="right" className="w-72">
            <SheetHeader>
              <SheetTitle>Menu</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1 px-4">
              {NAV_LINKS.map((link) => (
                <SheetClose
                  key={link.href}
                  nativeButton={false}
                  render={
                    <Link
                      href={link.href}
                      className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
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
                  Sign In
                </SheetClose>
                <SheetClose
                  nativeButton={false}
                  render={<Button nativeButton={false} render={<Link href="/book-demo" />} />}
                >
                  Book Demo
                </SheetClose>
              </div>
            </nav>
          </SheetContent>
        </Sheet>
      </Container>
    </header>
  );
}
