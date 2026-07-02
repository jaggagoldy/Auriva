import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { logAppointmentEvent } from '@/services/appointment-service';

// GET: Fetch appointments with optional filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const patient_id = searchParams.get('patient_id');
    const doctor_id = searchParams.get('doctor_id');
    const clinic_id = searchParams.get('clinic_id');
    const status = searchParams.get('status');

    // Build the query where clause
    const where: any = {};
    if (patient_id) where.patient_id = patient_id;
    if (doctor_id) where.doctor_id = doctor_id;
    if (clinic_id) where.clinic_id = clinic_id;
    if (status) where.status = status;

    const appointments = await prisma.appointment.findMany({
      where,
      orderBy: {
        scheduled_time: 'asc',
      },
      include: {
        patient: {
          select: {
            id: true,
            full_name: true,
            blood_group: true,
            user_id: true,
          },
        },
        doctor: {
          select: {
            id: true,
            full_name: true,
            specialty: true,
            clinic_id: true,
            user_id: true,
          },
        },
        clinic: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
      },
    });

    return NextResponse.json(appointments);
  } catch (error: any) {
    console.error('Error fetching appointments:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

// POST: Create a new appointment
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { patient_id, doctor_id, clinic_id, scheduled_time, status } = body;

    // Validation
    if (!patient_id || !doctor_id || !clinic_id || !scheduled_time) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: 'Missing required fields: patient_id, doctor_id, clinic_id, scheduled_time are required.',
        },
        { status: 400 }
      );
    }

    // Verify patient profile exists
    const patient = await prisma.patientProfile.findUnique({
      where: { id: patient_id },
    });
    if (!patient) {
      return NextResponse.json(
        { error: 'Not Found', message: `Patient Profile with id ${patient_id} not found.` },
        { status: 400 }
      );
    }

    // Verify staff/doctor profile exists
    const doctor = await prisma.staffProfile.findUnique({
      where: { id: doctor_id },
    });
    if (!doctor) {
      return NextResponse.json(
        { error: 'Not Found', message: `Doctor Profile with id ${doctor_id} not found.` },
        { status: 400 }
      );
    }

    // Verify clinic exists
    const clinic = await prisma.clinic.findUnique({
      where: { id: clinic_id },
    });
    if (!clinic) {
      return NextResponse.json(
        { error: 'Not Found', message: `Clinic with id ${clinic_id} not found.` },
        { status: 400 }
      );
    }

    // Parse date
    const parsedDate = new Date(scheduled_time);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Invalid date/time format for scheduled_time.' },
        { status: 400 }
      );
    }

    // Validate status if provided
    const validStatuses = ['scheduled', 'waiting', 'in_consultation', 'completed'];
    const finalStatus = status || 'scheduled';
    if (!validStatuses.includes(finalStatus)) {
      return NextResponse.json(
        {
          error: 'Bad Request',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Create the appointment and its opening timeline entry together.
    const newAppointment = await prisma.$transaction(async (tx) => {
      const appointment = await tx.appointment.create({
        data: {
          patient_id,
          doctor_id,
          clinic_id,
          scheduled_time: parsedDate,
          status: finalStatus,
        },
        include: {
          patient: true,
          doctor: true,
          clinic: true,
        },
      });

      await logAppointmentEvent(tx, appointment.id, {
        type: 'created',
        to_status: finalStatus,
      });

      return appointment;
    });

    return NextResponse.json(newAppointment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating appointment:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
