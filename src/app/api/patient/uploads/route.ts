import { NextRequest } from "next/server";
import { badRequest, ok, serverError } from "@/api/http";
import { requirePatientContext } from "@/api/session";
import { getStorage, ALLOWED_UPLOAD_TYPES, MAX_UPLOAD_BYTES } from "@/services/storage/storage-service";

// P5 Health Vault — patient uploads their own test report (image or PDF).
// Same StorageService as the clinic side; patient-scoped auth. Returns an
// opaque { url, key } the caller attaches to the recommendation.
export async function POST(request: NextRequest) {
  try {
    const auth = await requirePatientContext();
    if (!auth.ok) return auth.response;

    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    if (!(file instanceof File)) return badRequest("A file is required (multipart field 'file').");
    if (!ALLOWED_UPLOAD_TYPES[file.type]) return badRequest("Unsupported file type. Use JPG, PNG, WebP, GIF or PDF.");
    if (file.size > MAX_UPLOAD_BYTES) return badRequest("File is too large (max 5 MB).");

    const data = Buffer.from(await file.arrayBuffer());
    const stored = await getStorage().put({ data, contentType: file.type });
    return ok(stored, 201);
  } catch (error) {
    return serverError("Error uploading the report", error);
  }
}
