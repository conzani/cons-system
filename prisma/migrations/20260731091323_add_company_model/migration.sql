-- CreateTable
CREATE TABLE `company` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `registration_number` VARCHAR(191) NULL,
    `tax_id` VARCHAR(191) NULL,
    `address` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `website` VARCHAR(191) NULL,
    `logo` VARCHAR(191) NULL,
    `status` VARCHAR(191) NULL DEFAULT 'active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `company_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
