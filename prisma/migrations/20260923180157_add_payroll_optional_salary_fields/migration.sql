-- AlterTable
ALTER TABLE `payroll` ADD COLUMN `insurance_amount` BIGINT NULL,
    ADD COLUMN `pension_amount` BIGINT NULL,
    ADD COLUMN `salary_type` VARCHAR(191) NULL DEFAULT 'Gross',
    ADD COLUMN `tax_percentage` DOUBLE NULL;
