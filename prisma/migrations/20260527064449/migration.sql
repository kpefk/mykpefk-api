-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('STUDENT', 'TEACHER', 'SCHEDULE_DISPATCHER', 'HEAD_OF_DEPARTMENT', 'DEPUTY_DIRECTOR', 'DIRECTOR', 'ADMINISTRATOR');

-- CreateEnum
CREATE TYPE "TokenType" AS ENUM ('TWO_FACTOR', 'PASSWORD_RESET');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'STUDENT',
    "is_two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "is_first_login" BOOLEAN NOT NULL DEFAULT true,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tokens" (
    "id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "type" "TokenType" NOT NULL,
    "expires_in" TIMESTAMP(3) NOT NULL,
    "user_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "universityId" INTEGER NOT NULL,
    "personId" INTEGER NOT NULL,
    "listenerId" INTEGER NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT NOT NULL,
    "birthday" TIMESTAMP(3) NOT NULL,
    "country_name" TEXT NOT NULL,
    "person_sex_name" TEXT NOT NULL,
    "rnokpp" TEXT NOT NULL,
    "unzr" TEXT NOT NULL,
    "passport_document_type_id" INTEGER NOT NULL,
    "passport_document_type_name" TEXT NOT NULL,
    "passport_document_series" TEXT NOT NULL,
    "passport_document_numbers" TEXT NOT NULL,
    "passport_document_issued_date" TIMESTAMP(3) NOT NULL,
    "passport_document_expired_date" TIMESTAMP(3) NOT NULL,
    "profession_classifier_code_1" TEXT NOT NULL,
    "profession_name_1" TEXT NOT NULL,
    "profession_rang_name_1" TEXT NOT NULL,
    "profession_classifier_code_2" TEXT NOT NULL,
    "profession_name_2" TEXT NOT NULL,
    "profession_rang_name_2" TEXT NOT NULL,
    "profession_classifier_code_3" TEXT NOT NULL,
    "profession_name_3" TEXT NOT NULL,
    "profession_rang_name_3" TEXT NOT NULL,
    "profession_classifier_code_4" TEXT NOT NULL,
    "profession_name_4" TEXT NOT NULL,
    "profession_rang_name_4" TEXT NOT NULL,
    "profession_classifier_code_5" TEXT NOT NULL,
    "profession_name_5" TEXT NOT NULL,
    "profession_rang_name_5" TEXT NOT NULL,
    "education_form_name" TEXT NOT NULL,
    "is_dual" BOOLEAN NOT NULL,
    "education_date_begin" TIMESTAMP(3) NOT NULL,
    "reason" TEXT NOT NULL,
    "education_date_end" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modify_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "university_id" INTEGER NOT NULL,
    "person_id" INTEGER NOT NULL,
    "staff_id" INTEGER NOT NULL,
    "last_name" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "middle_name" TEXT,
    "birthday" TIMESTAMP(3) NOT NULL,
    "country_id" INTEGER,
    "country_name" TEXT,
    "person_sex_name" TEXT,
    "rnokpp" TEXT,
    "unzr" TEXT,
    "passport_document_type_id" INTEGER,
    "passport_document_type_name" TEXT,
    "passport_document_series" TEXT,
    "passport_document_numbers" TEXT,
    "passport_document_date_get" TIMESTAMP(3),
    "passport_document_expired_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "position_name" TEXT,
    "position_plurality_name" TEXT,
    "position_place" TEXT,
    "university_faculty_id" INTEGER,
    "university_faculty_full_name" TEXT,
    "university_faculty_short_name" TEXT,
    "university_faculty_chair_id" INTEGER,
    "university_faculty_chair_full_name" TEXT,
    "university_faculty_chair_short_name" TEXT,
    "profession" TEXT,
    "rang" TEXT,
    "pedagogic_title_id" TEXT,
    "pedagogic_title_name" TEXT,
    "skill_id" INTEGER,
    "skill_name" TEXT,
    "stage_type_id" INTEGER,
    "stage_type_name" TEXT,
    "stage" INTEGER,
    "is_stage_solid" BOOLEAN,
    "start_date" TIMESTAMP(3),
    "date_recruit" TIMESTAMP(3),
    "date_fire" TIMESTAMP(3),
    "courses_info" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "modify_date" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classrooms" (
    "id" TEXT NOT NULL,
    "number" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photos" JSONB NOT NULL DEFAULT '[]',
    "teacher_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classrooms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "tokens_token_key" ON "tokens"("token");

-- CreateIndex
CREATE UNIQUE INDEX "students_user_id_key" ON "students"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_user_id_key" ON "teachers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "teachers_staff_id_key" ON "teachers"("staff_id");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_number_key" ON "classrooms"("number");

-- CreateIndex
CREATE UNIQUE INDEX "classrooms_name_key" ON "classrooms"("name");

-- AddForeignKey
ALTER TABLE "tokens" ADD CONSTRAINT "tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classrooms" ADD CONSTRAINT "classrooms_teacher_id_fkey" FOREIGN KEY ("teacher_id") REFERENCES "teachers"("id") ON DELETE SET NULL ON UPDATE CASCADE;
