import { ok, serverError } from '@/api/http';
import { listClinicsWithStaff } from '@/repositories/clinic-repository';

export async function GET() {
  try {
    const clinics = await listClinicsWithStaff();

    return ok(clinics);
  } catch (error) {
    return serverError('Error fetching clinics', error);
  }
}
