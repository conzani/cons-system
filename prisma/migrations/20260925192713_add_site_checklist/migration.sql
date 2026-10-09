-- CreateTable
CREATE TABLE `site_checklist_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `site_id` BIGINT NOT NULL,
    `item` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NOT NULL DEFAULT 'General',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `comment` TEXT NULL,
    `due_date` DATETIME(3) NULL,
    `completed_at` DATETIME(3) NULL,
    `completed_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `site_checklist_items_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `site_checklist_items` ADD CONSTRAINT `site_checklist_items_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
