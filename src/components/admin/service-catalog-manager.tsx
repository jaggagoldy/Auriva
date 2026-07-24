"use client";

import * as React from "react";
import { Clock, Plus, IndianRupee, Tag, ShieldCheck, Check, Trash2, Edit2, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export interface ServiceItem {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
  buffer_minutes?: number | null;
  is_active: boolean;
}

export default function ServiceCatalogManager({ clinicId }: { clinicId: string }) {
  const [services, setServices] = React.useState<ServiceItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Modal State
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [name, setName] = React.useState("");
  const [price, setPrice] = React.useState("500");
  const [duration, setDuration] = React.useState("15");
  const [saving, setSaving] = React.useState(false);

  const loadServices = React.useCallback(async () => {
    if (!clinicId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/services?clinic_id=${clinicId}&include_inactive=true`, { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load services.");
      const data = await res.json();
      setServices(data);
    } catch {
      setError("Failed to load treatment services catalog.");
    } finally {
      setLoading(false);
    }
  }, [clinicId]);

  React.useEffect(() => {
    loadServices();
  }, [loadServices]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setName("");
    setPrice("500");
    setDuration("15");
    setDialogOpen(true);
  };

  const handleOpenEdit = (item: ServiceItem) => {
    setEditingId(item.id);
    setName(item.name);
    setPrice(String(item.price));
    setDuration(String(item.duration_minutes));
    setDialogOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Treatment service name is required");
      return;
    }
    const priceNum = parseInt(price, 10);
    const durationNum = parseInt(duration, 10);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error("Price must be a positive number");
      return;
    }
    if (isNaN(durationNum) || durationNum <= 0) {
      toast.error("Duration must be at least 1 minute");
      return;
    }

    setSaving(true);
    try {
      if (editingId) {
        // Update
        const res = await fetch(`/api/services/${editingId}?clinic_id=${clinicId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            price: priceNum,
            durationMinutes: durationNum,
          }),
        });
        if (!res.ok) throw new Error("Update failed");
        toast.success("Service updated successfully");
      } else {
        // Create
        const res = await fetch("/api/services", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clinicId,
            name: name.trim(),
            price: priceNum,
            durationMinutes: durationNum,
          }),
        });
        if (!res.ok) throw new Error("Creation failed");
        toast.success("New treatment service created");
      }
      setDialogOpen(false);
      loadServices();
    } catch {
      toast.error("Could not save treatment service");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (item: ServiceItem) => {
    try {
      const res = await fetch(`/api/services/${item.id}?clinic_id=${clinicId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.is_active }),
      });
      if (!res.ok) throw new Error();
      toast.success(`Service ${!item.is_active ? "activated" : "deactivated"}`);
      loadServices();
    } catch {
      toast.error("Could not update service status");
    }
  };

  return (
    <Card className="shadow-xs border bg-card">
      <CardHeader className="flex flex-row items-center justify-between pb-4">
        <div>
          <CardTitle className="text-base font-semibold">Treatments & Service Catalog</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            Configure consultation fees, procedures, pricing, and duration windows for your practice.
          </CardDescription>
        </div>
        <Button size="sm" onClick={handleOpenAdd} className="gap-1.5 font-medium">
          <Plus className="size-4" /> Add Treatment Service
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mr-2" /> Loading service catalog...
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 gap-2">
            <p className="text-xs text-destructive font-medium">{error}</p>
            <Button size="sm" variant="outline" onClick={loadServices}>
              <RefreshCw className="size-3.5 mr-1" /> Retry
            </Button>
          </div>
        ) : services.length === 0 ? (
          <div className="rounded-lg border border-dashed p-8 text-center">
            <Tag className="mx-auto size-8 text-muted-foreground/60 mb-2" />
            <h3 className="text-sm font-medium">No treatment services added</h3>
            <p className="text-xs text-muted-foreground mt-1 mb-4">
              Add your consultation fees and procedures so doctors and reception can bill patients accurately.
            </p>
            <Button size="sm" onClick={handleOpenAdd}>
              <Plus className="size-3.5 mr-1" /> Create First Service
            </Button>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((item) => (
              <div
                key={item.id}
                className={`flex flex-col justify-between rounded-xl border p-4 transition-all ${
                  item.is_active ? "bg-card hover:border-primary/40" : "bg-muted/40 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-semibold text-sm leading-snug">{item.name}</h4>
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        item.is_active ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {item.is_active ? "Active" : "Archived"}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1 font-medium text-foreground">
                      <IndianRupee className="size-3.5 text-emerald-600" /> ₹{item.price}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="size-3.5 text-muted-foreground" /> {item.duration_minutes} mins
                    </span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                  <Button size="xs" variant="ghost" onClick={() => handleOpenEdit(item)}>
                    <Edit2 className="size-3 mr-1" /> Edit
                  </Button>
                  <Button size="xs" variant="outline" onClick={() => handleToggleActive(item)}>
                    {item.is_active ? "Archive" : "Activate"}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Treatment Service" : "New Treatment Service"}</DialogTitle>
              <DialogDescription>
                Define the service name, standard fee, and expected consultation duration.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="service-name">Service Name</Label>
                <Input
                  id="service-name"
                  placeholder="e.g. General Consultation, Root Canal, ECG"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="service-price">Consultation Fee (₹)</Label>
                  <Input
                    id="service-price"
                    type="number"
                    min="0"
                    placeholder="500"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="service-duration">Duration (Minutes)</Label>
                  <Input
                    id="service-duration"
                    type="number"
                    min="1"
                    placeholder="15"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    required
                  />
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="size-4 animate-spin mr-1" /> : null} Save Service
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
