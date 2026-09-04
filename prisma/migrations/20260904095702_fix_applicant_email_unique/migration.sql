/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `applicants` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "applicants_email_key" ON "applicants"("email");
