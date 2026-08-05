/*
  Warnings:

  - You are about to drop the column `bank_account` on the `employees` table. All the data in the column will be lost.
  - You are about to drop the column `bank_name` on the `employees` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `employees` DROP COLUMN `bank_account`,
    DROP COLUMN `bank_name`,
    ADD COLUMN `account_number` VARCHAR(191) NULL,
    ADD COLUMN `payment_method` VARCHAR(191) NULL,
    ADD COLUMN `payment_method_name` VARCHAR(191) NULL;
