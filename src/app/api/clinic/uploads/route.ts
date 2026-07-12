import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/api/http";
import { requireStaffContext } from "@/api/session";
import { getStorage, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/services/storage/storage-service";

// P3 Practice Setup: upload a clinic/doctor media file. Reception-capable
// (the solo owner). Returns an opaque { url, key } — the caller stores the url
// on the relevant profile field. The route never touches disk directly; it
// goes through the StorageService so the backing store is swappable.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireStaffContext("reception");
    if (!auth.ok) return auth.response;

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return badRequest("A file is required (multipart field 'file').");

    if (!ALLOWED_UPLOAD_TYPES[file.type]) {
      return badRequest("Unsupported file type. Use JPG, PNG, WebP, GIF or PDF.");
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return badRequest("File is too large (max 5 MB).");
    }

    const data = Buffer.from(await file.arrayBuffer());
    const stored = await getStorage().put({ data, contentType: file.type });
    return ok(stored, 201);
  } catch (error) {
    return serverError("Error uploading the file", error);
  }
}
