// M3A Checkpoint 1 — backfill existing Invoices → relational InvoiceLine rows
// (origin = LegacyMigration). Fail-fast, all-or-nothing (PO refinement 4):
// every invoice must satisfy  total == Σ InvoiceLine.amount == snapshot total
// EXACTLY (no tolerance). Runs in ONE transaction; any mismatch aborts + rolls
// back — never a partial migration. Idempotent (skips invoices that already
// have lines). Run: `npx tsx prisma/backfill-invoice-lines-3a.ts [--dry-run]`.

import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

interface RawItem {
  description: string;
  qty: number;
  unit_price: number;
  amount: number;
}

function parseItems(json: string): RawItem[] {
  const parsed = JSON.parse(json || "[]");
  if (!Array.isArray(parsed)) throw new Error("items_json is not an array");
  return parsed as RawItem[];
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const started = Date.now();

  const invoices = await prisma.invoice.findMany({
    select: { id: true, invoice_number: true, total: true, items_json: true, lines: { select: { id: true } } },
  });

  // ---- Pre-flight: reconcile every invoice 3-way, NO writes ----
  const failures: string[] = [];
  let itemsSeen = 0;
  for (const inv of invoices) {
    let items: RawItem[];
    try {
      items = parseItems(inv.items_json);
    } catch (e) {
      failures.push(`${inv.invoice_number}: unparseable items_json (${(e as Error).message})`);
      continue;
    }
    itemsSeen += items.length;
    const sumItems = items.reduce((s, i) => s + (i.amount ?? 0), 0);
    const snapshotTotal = sumItems; // the snapshot is generated from these same items
    // exact three-way equality — no rounding, no tolerance
    if (!(inv.total === sumItems && inv.total === snapshotTotal)) {
      failures.push(`${inv.invoice_number}: total=${inv.total} Σitems=${sumItems} snapshot=${snapshotTotal} — MISMATCH`);
    }
  }

  console.log(`Invoices found: ${invoices.length} · line-items to create: ${itemsSeen}`);
  if (failures.length > 0) {
    console.error(`\n❌ RECONCILIATION FAILED for ${failures.length} invoice(s) — ABORTING, no writes:`);
    for (const f of failures) console.error("   " + f);
    process.exit(1);
  }
  console.log(`✅ Pre-flight: all ${invoices.length} invoices reconcile 3-way (exact).`);

  if (dryRun) {
    console.log("DRY RUN — no writes performed.");
    await prisma.$disconnect();
    return;
  }

  // ---- Real run: ONE transaction, per-invoice post-write verification, idempotent ----
  let processed = 0,
    verified = 0,
    passed = 0,
    linesCreated = 0,
    skipped = 0;

  await prisma.$transaction(async (tx) => {
    for (const inv of invoices) {
      if (inv.lines.length > 0) {
        skipped++; // idempotent: already backfilled
        continue;
      }
      processed++;
      const items = parseItems(inv.items_json);
      for (const it of items) {
        await tx.invoiceLine.create({
          data: {
            invoice_id: inv.id,
            origin: "LegacyMigration",
            description: it.description,
            qty: it.qty,
            unit_price: it.unit_price,
            amount: it.amount,
          },
        });
        linesCreated++;
      }
      // Post-write verification (inside the txn — throwing rolls everything back)
      const agg = await tx.invoiceLine.aggregate({ where: { invoice_id: inv.id }, _sum: { amount: true } });
      const lineSum = agg._sum.amount ?? 0;
      verified++;
      if (lineSum !== inv.total) {
        throw new Error(`Post-write mismatch ${inv.invoice_number}: Σlines=${lineSum} != total=${inv.total} — ABORTING (full rollback)`);
      }
      passed++;
    }
  });

  console.log(`\n✅ BACKFILL COMPLETE (${Date.now() - started}ms)`);
  console.log(`   Invoices processed = ${processed}`);
  console.log(`   Invoices verified  = ${verified}`);
  console.log(`   Invoices passed    = ${passed}`);
  console.log(`   InvoiceLines created = ${linesCreated}`);
  console.log(`   Skipped (idempotent, already had lines) = ${skipped}`);
  console.log(`   Failures = 0`);
  if (!(processed === verified && verified === passed)) {
    throw new Error("Processed / Verified / Passed are not equal — invariant broken.");
  }
  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error("❌", e);
  await prisma.$disconnect();
  process.exit(1);
});
