/*
  Warnings:

  - A unique constraint covering the columns `[legacyContributorCode]` on the table `User` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "User" ADD COLUMN     "legacyContributorCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_legacyContributorCode_key" ON "User"("legacyContributorCode");
