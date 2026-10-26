-- AlterTable
ALTER TABLE `payments` ADD COLUMN `document_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `site_requests` ADD COLUMN `document_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `purchase_orders` ADD COLUMN `grn_document_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `equipment_logs` ADD COLUMN `document_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `inspections` ADD COLUMN `document_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `ncrs` ADD COLUMN `document_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `safety_incidents` ADD COLUMN `document_id` BIGINT NULL;
