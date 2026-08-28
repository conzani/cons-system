-- AlterTable
ALTER TABLE `documents` ADD COLUMN `tender_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `tenders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `tender_number` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `client` VARCHAR(191) NOT NULL,
    `tender_type` VARCHAR(191) NULL,
    `source` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `location` VARCHAR(191) NULL,
    `value` BIGINT NULL,
    `closing_date` DATETIME(3) NOT NULL,
    `submission_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'New',
    `progress` INTEGER NOT NULL DEFAULT 0,
    `bid_manager_id` BIGINT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `tenders_public_id_key`(`public_id`),
    UNIQUE INDEX `tenders_tender_number_key`(`tender_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tender_team_members` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `tender_id` BIGINT NOT NULL,
    `employee_id` BIGINT NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `responsibilities` TEXT NULL,
    `assigned_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tender_team_members_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tender_requirements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `tender_id` BIGINT NOT NULL,
    `category` VARCHAR(191) NOT NULL,
    `item` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `due_date` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `assigned_to` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tender_requirements_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tender_communications` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `tender_id` BIGINT NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `sender_id` BIGINT NOT NULL,
    `recipient_id` BIGINT NULL,
    `is_internal` BOOLEAN NOT NULL DEFAULT true,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Unread',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tender_communications_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tender_workflow_stages` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `tender_id` BIGINT NOT NULL,
    `stage_name` VARCHAR(191) NOT NULL,
    `stage_order` INTEGER NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `completed_at` DATETIME(3) NULL,
    `completed_by` BIGINT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `tender_workflow_stages_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `projects` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `project_number` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `client` VARCHAR(191) NULL,
    `location` VARCHAR(191) NULL,
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `value` BIGINT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `projects_public_id_key`(`public_id`),
    UNIQUE INDEX `projects_project_number_key`(`project_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sites` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `site_number` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `client` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `start_date` DATETIME(3) NULL,
    `end_date` DATETIME(3) NULL,
    `progress` INTEGER NOT NULL DEFAULT 0,
    `site_manager_id` BIGINT NULL,
    `value` BIGINT NULL,
    `project_type` VARCHAR(191) NULL,
    `description` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `sites_public_id_key`(`public_id`),
    UNIQUE INDEX `sites_site_number_key`(`site_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_tender_id_fkey` FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenders` ADD CONSTRAINT `tenders_bid_manager_id_fkey` FOREIGN KEY (`bid_manager_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenders` ADD CONSTRAINT `tenders_project_id_fkey` FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tenders` ADD CONSTRAINT `tenders_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_team_members` ADD CONSTRAINT `tender_team_members_tender_id_fkey` FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_team_members` ADD CONSTRAINT `tender_team_members_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_requirements` ADD CONSTRAINT `tender_requirements_tender_id_fkey` FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_requirements` ADD CONSTRAINT `tender_requirements_assigned_to_fkey` FOREIGN KEY (`assigned_to`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_communications` ADD CONSTRAINT `tender_communications_tender_id_fkey` FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_communications` ADD CONSTRAINT `tender_communications_sender_id_fkey` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_communications` ADD CONSTRAINT `tender_communications_recipient_id_fkey` FOREIGN KEY (`recipient_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_workflow_stages` ADD CONSTRAINT `tender_workflow_stages_tender_id_fkey` FOREIGN KEY (`tender_id`) REFERENCES `tenders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `tender_workflow_stages` ADD CONSTRAINT `tender_workflow_stages_completed_by_fkey` FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
