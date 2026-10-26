-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `document_id` BIGINT NULL;

-- AlterTable
ALTER TABLE `bills` ADD COLUMN `document_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `approvals` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `entity_type` VARCHAR(191) NOT NULL,
    `entity_id` BIGINT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `requested_by` BIGINT NULL,
    `decided_by` BIGINT NULL,
    `decision_notes` TEXT NULL,
    `requested_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `decided_at` DATETIME(3) NULL,

    UNIQUE INDEX `approvals_public_id_key`(`public_id`),
    INDEX `approvals_entity_type_entity_id_idx`(`entity_type`, `entity_id`),
    INDEX `approvals_status_idx`(`status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
