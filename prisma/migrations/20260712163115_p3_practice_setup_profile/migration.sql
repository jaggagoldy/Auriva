-- AlterTable
ALTER TABLE "Clinics" ADD COLUMN     "about" TEXT,
ADD COLUMN     "cover_url" TEXT,
ADD COLUMN     "documents_json" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "facilities_json" TEXT,
ADD COLUMN     "gallery_json" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "reception_contact" TEXT,
ADD COLUMN     "social_json" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "Staff_Profiles" ADD COLUMN     "photo_url" TEXT;
