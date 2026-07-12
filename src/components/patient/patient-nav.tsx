"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Heart, Plus, LogOut, Settings, User as UserIcon, Check, Users } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import { getInitials } from "@/shared/queue";
import { usePatientSession } from "@/components/patient/patient-session";
import BookAppointmentDialog from "@/components/patient/book-appointment-dialog";
import WhatsNew from "@/components/shared/whats-new";
import NotificationCenter from "@/components/patient/notification-center";

const NAV_ITEMS = [
  { href: "/patient", label: "Home" },
  { href: "/patient/care", label: "Care" },
  { href: "/patient/records", label: "Health Records" },
  { href: "/patient/family", label: "Family" },
];

export default function PatientNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { patientProfile, linkedProfiles, switchProfile } = usePatientSession();
  const [switching, setSwitching] = React.useState(false);

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const handleSwitch = async (profileId: string) => {
    if (profileId === patientProfile.id || switching) return;
    setSwitching(true);
    try {
      await switchProfile(profileId);
    } catch {
      toast.error("Could not switch profile. Try again.");
    } finally {
      setSwitching(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" />
      <header className="sticky top-0 z-40 flex h-[58px] shrink-0 items-center gap-7 border-b bg-background px-7">
        <Link href="/patient" className="flex items-center gap-2">
          <div className="flex size-6.5 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Heart className="size-3.5 fill-primary-foreground/20" />
          </div>
          <span className="text-sm font-bold tracking-tight">Auriva</span>
        </Link>

        <nav className="flex flex-1 items-center gap-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-lg px-3 py-2 text-[13px] font-medium transition-colors",
                  active
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <BookAppointmentDialog
          patientId={patientProfile.id}
          trigger={
            <Button size="sm">
              <Plus className="size-3.5" />
              Book
            </Button>
          }
        />

        <NotificationCenter />
        <WhatsNew />

        <DropdownMenu>
          <DropdownMenuTrigger render={<button aria-label="Account menu" className="rounded-full" />}>
            <Avatar className="size-8 ring-2 ring-primary/40">
              <AvatarFallback className="text-xs font-semibold">
                {getInitials(patientProfile.full_name)}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="truncate font-medium">{patientProfile.full_name}</div>
              <div className="truncate text-xs font-normal text-muted-foreground">
                {patientProfile.blood_group} · {patientProfile.health_id}
              </div>
            </DropdownMenuLabel>
            {linkedProfiles.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="flex items-center gap-1.5 text-[10.5px] font-semibold tracking-wide text-muted-foreground uppercase">
                  <Users className="size-3" />
                  Switch profile
                </DropdownMenuLabel>
                {linkedProfiles.map((profile) => (
                  <DropdownMenuItem
                    key={profile.id}
                    onClick={() => handleSwitch(profile.id)}
                    disabled={switching}
                  >
                    <Avatar className="size-5">
                      <AvatarFallback className="text-[9px] font-semibold">
                        {getInitials(profile.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <span className="flex-1 truncate">{profile.full_name}</span>
                    {profile.id === patientProfile.id && <Check className="size-3.5 text-primary" />}
                  </DropdownMenuItem>
                ))}
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/patient/profile" />}>
              <UserIcon />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/patient/settings" />}>
              <Settings />
              Settings
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>
    </>
  );
}
