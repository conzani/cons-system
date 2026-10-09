-- CreateTable
CREATE TABLE `site_requests` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `site_id` BIGINT NOT NULL,
    `request_number` VARCHAR(191) NOT NULL,
    `request_type` VARCHAR(191) NOT NULL DEFAULT 'Material',
    `urgency` VARCHAR(191) NOT NULL DEFAULT 'Normal',
    `reason` TEXT NULL,
    `needed_by` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `estimated_total` BIGINT NULL,
    `requested_by` BIGINT NULL,
    `approved_by` BIGINT NULL,
    `approved_at` DATETIME(3) NULL,
    `rejection_reason` TEXT NULL,
    `delivery_notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `site_requests_public_id_key`(`public_id`),
    UNIQUE INDEX `site_requests_request_number_key`(`request_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `site_request_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `request_id` BIGINT NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL DEFAULT 1,
    `estimated_price` BIGINT NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `site_request_items_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `site_requests` ADD CONSTRAINT `site_requests_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_request_items` ADD CONSTRAINT `site_request_items_request_id_fkey` FOREIGN KEY (`request_id`) REFERENCES `site_requests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
