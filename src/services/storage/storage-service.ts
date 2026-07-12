// P3 Practice Setup — file storage abstraction. The rest of the app (UI,
// services, routes) only ever sees an opaque URL and an opaque key; it never
// knows WHERE bytes live. Today that's the local disk; swapping to S3 / R2 /
// Azure later is a new StorageService implementation + a factory switch, with
// zero UI or business-logic changes.
//
//   UI → upload route → StorageService.put() → { key, url }
//   <img src={url}>  →  GET /api/files/[key]  →  StorageService.read()

import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

export interface StoredFile {
  /** Opaque handle used to read/delete later (persist this or the url). */
  key: string;
  /** What the UI renders — resolves through GET /api/files/[key]. */
  url: string;
}

export interface StorageService {
  put(input: { data: Buffer; contentType: string }): Promise<StoredFile>;
  read(key: string): Promise<{ data: Buffer; contentType: string } | null>;
  delete(key: string): Promise<void>;
}

// Content types we accept for clinic/doctor media. Kept here (not in the route)
// so every implementation shares one allow-list.
export const ALLOWED_UPLOAD_TYPES: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
};
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

const EXT_CONTENT_TYPE: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  pdf: "application/pdf",
};

export class StorageError extends Error {}

// A file key is always "<uuid>.<ext>" — we generate it, so it can never carry a
// path. read()/delete() still hard-reject anything with a separator as defense
// in depth against traversal.
function assertSafeKey(key: string): string {
  const base = path.basename(key);
  if (base !== key || key.includes("/") || key.includes("\\") || key.includes("..")) {
    throw new StorageError("Invalid file key.");
  }
  return base;
}

/**
 * Local-disk implementation (development / self-hosted). Files live under
 * `<cwd>/.uploads` (git-ignored). Deterministic, swappable, no external deps.
 */
class LocalStorageService implements StorageService {
  private dir = path.join(process.cwd(), ".uploads");

  private async ensureDir() {
    await fs.mkdir(this.dir, { recursive: true });
  }

  async put({ data, contentType }: { data: Buffer; contentType: string }): Promise<StoredFile> {
    const ext = ALLOWED_UPLOAD_TYPES[contentType];
    if (!ext) throw new StorageError("Unsupported file type.");
    await this.ensureDir();
    const key = `${randomUUID()}.${ext}`;
    await fs.writeFile(path.join(this.dir, key), data);
    return { key, url: `/api/files/${key}` };
  }

  async read(key: string): Promise<{ data: Buffer; contentType: string } | null> {
    const safe = assertSafeKey(key);
    try {
      const data = await fs.readFile(path.join(this.dir, safe));
      const ext = safe.split(".").pop() ?? "";
      return { data, contentType: EXT_CONTENT_TYPE[ext] ?? "application/octet-stream" };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    const safe = assertSafeKey(key);
    await fs.rm(path.join(this.dir, safe), { force: true });
  }
}

let instance: StorageService | null = null;

/**
 * The single place that picks an implementation. Swap to an S3/R2 service here
 * (e.g. keyed off `process.env.STORAGE_DRIVER`) with no other code changes.
 */
export function getStorage(): StorageService {
  if (!instance) instance = new LocalStorageService();
  return instance;
}

/** Extract the storage key from a stored url (`/api/files/<key>`), or null. */
export function keyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/^\/api\/files\/([^/?#]+)$/);
  return m ? m[1] : null;
}
