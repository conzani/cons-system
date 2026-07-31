/*
  Warnings:

  - A unique constraint covering the columns `[public_id]` on the table `document_activity_logs` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `public_id` to the `document_activity_logs` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `document_activity_logs` ADD COLUMN `public_id` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `document_activity_logs_public_id_key` ON `document_activity_logs`(`public_id`);
