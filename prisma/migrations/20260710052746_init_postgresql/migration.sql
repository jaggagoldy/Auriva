-- CreateTable
CREATE TABLE "Users" (
    "id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "email" TEXT,
    "password_hash" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "is_platform_admin" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Kolkata',
    "archetype" TEXT,
    "is_demo" BOOLEAN NOT NULL DEFAULT false,
    "owner_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization_Members" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Organization_Members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sessions" (
    "id" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "active_healthcare_profile_id" TEXT,

    CONSTRAINT "Sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Clinics" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "super_admin_id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "timezone" TEXT,
    "working_days" TEXT,
    "opens_at" TEXT,
    "closes_at" TEXT,
    "accepting_bookings" BOOLEAN NOT NULL DEFAULT true,
    "phone" TEXT,
    "booking_shared_at" TIMESTAMP(3),
    "default_slot_duration_minutes" INTEGER DEFAULT 15,
    "buffer_minutes" INTEGER DEFAULT 0,
    "max_appointments_per_doctor_per_day" INTEGER,
    "allow_double_booking" BOOLEAN NOT NULL DEFAULT false,
    "allow_walk_ins" BOOLEAN NOT NULL DEFAULT true,
    "cancellation_window_hours" INTEGER,
    "default_consultation_fee" INTEGER,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Clinics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Departments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "clinic_id" TEXT,
    "name" TEXT NOT NULL,
    "head_staff_id" TEXT,
    "default_consultation_fee" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor_Availability" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Doctor_Availability_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Doctor_Time_Blocks" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Doctor_Time_Blocks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Audit_Logs" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "detail" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Audit_Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Staff_Profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "specialty" TEXT,
    "full_name" TEXT NOT NULL,
    "bio" TEXT,
    "years_experience" INTEGER,
    "languages" TEXT,
    "qualifications" TEXT,
    "registration_number" TEXT,
    "consultation_fee" INTEGER,
    "follow_up_fee" INTEGER,
    "department_id" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "capabilities" TEXT,

    CONSTRAINT "Staff_Profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Services" (
    "id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL,
    "price" INTEGER NOT NULL,
    "buffer_minutes" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reviews" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient_Favorite_Doctors" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Patient_Favorite_Doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Patient_Profiles" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "full_name" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "date_of_birth" TIMESTAMP(3),
    "gender" TEXT,
    "onboarding_completed" BOOLEAN NOT NULL DEFAULT false,
    "allergies" TEXT,
    "chronic_conditions" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "health_id" TEXT NOT NULL,
    "guardian_name" TEXT,
    "guardian_relation" TEXT,
    "registered_by_clinic_id" TEXT,
    "verification_level" TEXT NOT NULL DEFAULT 'unverified',

    CONSTRAINT "Patient_Profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Contacts" (
    "id" TEXT NOT NULL,
    "healthcare_profile_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT true,
    "verified_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account_Profile_Links" (
    "id" TEXT NOT NULL,
    "account_user_id" TEXT NOT NULL,
    "healthcare_profile_id" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Account_Profile_Links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL,
    "queue_number" INTEGER,
    "checked_in_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "priority" INTEGER NOT NULL DEFAULT 0,
    "walk_in" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "chief_complaint" TEXT,
    "history_notes" TEXT,
    "vitals_json" TEXT,
    "diagnosis" TEXT,
    "prescription_notes" TEXT,
    "prescription_medicines_json" TEXT,
    "follow_up_date" TIMESTAMP(3),
    "follow_up_source_appointment_id" TEXT,

    CONSTRAINT "Appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitations" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "specialty" TEXT,
    "token" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "accepted_at" TIMESTAMP(3),

    CONSTRAINT "Invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Prescriptions" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "notes" TEXT,
    "medicines_json" TEXT NOT NULL,
    "follow_up_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Lab_Orders" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "tests_json" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ordered',
    "clinical_note" TEXT,
    "result_values_json" TEXT,
    "result_notes" TEXT,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resulted_at" TIMESTAMP(3),
    "resulted_by_user_id" TEXT,

    CONSTRAINT "Lab_Orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invoices" (
    "id" TEXT NOT NULL,
    "invoice_number" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "items_json" TEXT NOT NULL,
    "total" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "issued_at" TIMESTAMP(3),
    "paid_at" TIMESTAMP(3),
    "voided_at" TIMESTAMP(3),

    CONSTRAINT "Invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payments" (
    "id" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "clinic_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "received_by_user_id" TEXT,

    CONSTRAINT "Payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Appointment_Events" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "from_status" TEXT,
    "to_status" TEXT,
    "note" TEXT,
    "actor_user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Appointment_Events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event_Logs" (
    "id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "organization_id" TEXT NOT NULL,
    "actor_id" TEXT,
    "entity_id" TEXT NOT NULL,
    "correlation_id" TEXT NOT NULL,
    "payload_json" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Event_Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Event_Handler_Logs" (
    "id" TEXT NOT NULL,
    "event_log_id" TEXT NOT NULL,
    "handler_name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_attempt_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Event_Handler_Logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Releases" (
    "id" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "release_date" TIMESTAMP(3),
    "summary" TEXT NOT NULL,
    "public_notes" TEXT NOT NULL,
    "internal_notes" TEXT,
    "breaking_changes" TEXT,
    "migration_notes" TEXT,
    "known_issues" TEXT,
    "aps_items" TEXT,
    "sprint_numbers" TEXT,
    "feature_flags" TEXT,
    "published_at" TIMESTAMP(3),
    "created_by_user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Releases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release_Highlights" (
    "id" TEXT NOT NULL,
    "release_id" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Release_Highlights_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Release_Views" (
    "id" TEXT NOT NULL,
    "release_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "viewed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Release_Views_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sprints" (
    "id" TEXT NOT NULL,
    "number" INTEGER NOT NULL,
    "goal" TEXT NOT NULL,
    "start_date" TIMESTAMP(3),
    "end_date" TIMESTAMP(3),
    "aps_items" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sprints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notifications" (
    "id" TEXT NOT NULL,
    "patient_profile_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "related_entity_id" TEXT,
    "source_event_id" TEXT NOT NULL,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Otp_Challenges" (
    "id" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Otp_Challenges_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Users_phone_number_key" ON "Users"("phone_number");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_Members_organization_id_user_id_key" ON "Organization_Members"("organization_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Sessions_token_hash_key" ON "Sessions"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "Doctor_Availability_doctor_id_day_of_week_key" ON "Doctor_Availability"("doctor_id", "day_of_week");

-- CreateIndex
CREATE INDEX "Doctor_Time_Blocks_doctor_id_start_at_idx" ON "Doctor_Time_Blocks"("doctor_id", "start_at");

-- CreateIndex
CREATE UNIQUE INDEX "Staff_Profiles_user_id_key" ON "Staff_Profiles"("user_id");

-- CreateIndex
CREATE INDEX "Services_clinic_id_is_active_idx" ON "Services"("clinic_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "Reviews_appointment_id_key" ON "Reviews"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_Favorite_Doctors_patient_id_doctor_id_key" ON "Patient_Favorite_Doctors"("patient_id", "doctor_id");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_Profiles_user_id_key" ON "Patient_Profiles"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Patient_Profiles_health_id_key" ON "Patient_Profiles"("health_id");

-- CreateIndex
CREATE INDEX "Contacts_type_value_idx" ON "Contacts"("type", "value");

-- CreateIndex
CREATE UNIQUE INDEX "Account_Profile_Links_account_user_id_healthcare_profile_id_key" ON "Account_Profile_Links"("account_user_id", "healthcare_profile_id");

-- CreateIndex
CREATE UNIQUE INDEX "Appointments_follow_up_source_appointment_id_key" ON "Appointments"("follow_up_source_appointment_id");

-- CreateIndex
CREATE INDEX "Appointments_clinic_id_scheduled_time_idx" ON "Appointments"("clinic_id", "scheduled_time");

-- CreateIndex
CREATE INDEX "Appointments_patient_id_idx" ON "Appointments"("patient_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invitations_token_key" ON "Invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "Prescriptions_appointment_id_key" ON "Prescriptions"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoices_appointment_id_key" ON "Invoices"("appointment_id");

-- CreateIndex
CREATE UNIQUE INDEX "Invoices_clinic_id_invoice_number_key" ON "Invoices"("clinic_id", "invoice_number");

-- CreateIndex
CREATE INDEX "Payments_clinic_id_received_at_idx" ON "Payments"("clinic_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "Event_Handler_Logs_event_log_id_handler_name_key" ON "Event_Handler_Logs"("event_log_id", "handler_name");

-- CreateIndex
CREATE UNIQUE INDEX "Releases_version_key" ON "Releases"("version");

-- CreateIndex
CREATE INDEX "Releases_status_idx" ON "Releases"("status");

-- CreateIndex
CREATE INDEX "Releases_published_at_idx" ON "Releases"("published_at");

-- CreateIndex
CREATE INDEX "Release_Highlights_release_id_idx" ON "Release_Highlights"("release_id");

-- CreateIndex
CREATE INDEX "Release_Views_user_id_idx" ON "Release_Views"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Release_Views_release_id_user_id_key" ON "Release_Views"("release_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "Sprints_number_key" ON "Sprints"("number");

-- CreateIndex
CREATE UNIQUE INDEX "Notifications_source_event_id_key" ON "Notifications"("source_event_id");

-- CreateIndex
CREATE INDEX "Notifications_patient_profile_id_created_at_idx" ON "Notifications"("patient_profile_id", "created_at");

-- CreateIndex
CREATE INDEX "Otp_Challenges_phone_number_created_at_idx" ON "Otp_Challenges"("phone_number", "created_at");

-- AddForeignKey
ALTER TABLE "Organizations" ADD CONSTRAINT "Organizations_owner_user_id_fkey" FOREIGN KEY ("owner_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization_Members" ADD CONSTRAINT "Organization_Members_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Organization_Members" ADD CONSTRAINT "Organization_Members_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sessions" ADD CONSTRAINT "Sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinics" ADD CONSTRAINT "Clinics_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Clinics" ADD CONSTRAINT "Clinics_super_admin_id_fkey" FOREIGN KEY ("super_admin_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departments" ADD CONSTRAINT "Departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departments" ADD CONSTRAINT "Departments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Departments" ADD CONSTRAINT "Departments_head_staff_id_fkey" FOREIGN KEY ("head_staff_id") REFERENCES "Staff_Profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor_Availability" ADD CONSTRAINT "Doctor_Availability_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Doctor_Time_Blocks" ADD CONSTRAINT "Doctor_Time_Blocks_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Audit_Logs" ADD CONSTRAINT "Audit_Logs_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff_Profiles" ADD CONSTRAINT "Staff_Profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff_Profiles" ADD CONSTRAINT "Staff_Profiles_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Staff_Profiles" ADD CONSTRAINT "Staff_Profiles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "Departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Services" ADD CONSTRAINT "Services_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Reviews" ADD CONSTRAINT "Reviews_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient_Favorite_Doctors" ADD CONSTRAINT "Patient_Favorite_Doctors_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient_Favorite_Doctors" ADD CONSTRAINT "Patient_Favorite_Doctors_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient_Profiles" ADD CONSTRAINT "Patient_Profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Patient_Profiles" ADD CONSTRAINT "Patient_Profiles_registered_by_clinic_id_fkey" FOREIGN KEY ("registered_by_clinic_id") REFERENCES "Clinics"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Contacts" ADD CONSTRAINT "Contacts_healthcare_profile_id_fkey" FOREIGN KEY ("healthcare_profile_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account_Profile_Links" ADD CONSTRAINT "Account_Profile_Links_account_user_id_fkey" FOREIGN KEY ("account_user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Account_Profile_Links" ADD CONSTRAINT "Account_Profile_Links_healthcare_profile_id_fkey" FOREIGN KEY ("healthcare_profile_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointments" ADD CONSTRAINT "Appointments_follow_up_source_appointment_id_fkey" FOREIGN KEY ("follow_up_source_appointment_id") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitations" ADD CONSTRAINT "Invitations_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "Organizations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitations" ADD CONSTRAINT "Invitations_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Prescriptions" ADD CONSTRAINT "Prescriptions_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab_Orders" ADD CONSTRAINT "Lab_Orders_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab_Orders" ADD CONSTRAINT "Lab_Orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab_Orders" ADD CONSTRAINT "Lab_Orders_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "Staff_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lab_Orders" ADD CONSTRAINT "Lab_Orders_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invoices" ADD CONSTRAINT "Invoices_clinic_id_fkey" FOREIGN KEY ("clinic_id") REFERENCES "Clinics"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payments" ADD CONSTRAINT "Payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "Invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Appointment_Events" ADD CONSTRAINT "Appointment_Events_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "Appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event_Handler_Logs" ADD CONSTRAINT "Event_Handler_Logs_event_log_id_fkey" FOREIGN KEY ("event_log_id") REFERENCES "Event_Logs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Releases" ADD CONSTRAINT "Releases_created_by_user_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "Users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release_Highlights" ADD CONSTRAINT "Release_Highlights_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "Releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release_Views" ADD CONSTRAINT "Release_Views_release_id_fkey" FOREIGN KEY ("release_id") REFERENCES "Releases"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Release_Views" ADD CONSTRAINT "Release_Views_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "Users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notifications" ADD CONSTRAINT "Notifications_patient_profile_id_fkey" FOREIGN KEY ("patient_profile_id") REFERENCES "Patient_Profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
