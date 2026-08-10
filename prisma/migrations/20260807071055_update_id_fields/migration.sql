/*
  Warnings:

  - You are about to drop the column `national_id` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `passport_number` on the `employees` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `employees` DROP COLUMN `national_id`,
    DROP COLUMN `passport_number`,
    ADD COLUMN `id_number` VARCHAR(191) NULL,
    ADD COLUMN `id_type` VARCHAR(191) NULL;
