-- AlterTable
ALTER TABLE `projects` ADD COLUMN `budget` BIGINT NULL;

-- AlterTable
ALTER TABLE `invoices` ADD COLUMN `retention_percent` DOUBLE NULL,
    ADD COLUMN `retention_amount` BIGINT NULL,
    ADD COLUMN `advance_recovery` BIGINT NULL,
    ADD COLUMN `net_payable` BIGINT NULL;

-- AlterTable
ALTER TABLE `bills` ADD COLUMN `goods_receipt_id` BIGINT NULL,
    ADD COLUMN `match_status` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `goods_receipts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `receipt_number` VARCHAR(191) NOT NULL,
    `purchase_order_id` BIGINT NOT NULL,
    `warehouse_id` BIGINT NOT NULL,
    `receipt_date` DATETIME(3) NOT NULL,
    `document_id` BIGINT NULL,
    `notes` TEXT NULL,
    `received_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `goods_receipts_public_id_key`(`public_id`),
    UNIQUE INDEX `goods_receipts_receipt_number_key`(`receipt_number`),
    INDEX `goods_receipts_purchase_order_id_idx`(`purchase_order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `goods_receipt_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `receipt_id` BIGINT NOT NULL,
    `purchase_order_item_id` BIGINT NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit_cost` BIGINT NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `goods_receipt_items_public_id_key`(`public_id`),
    INDEX `goods_receipt_items_receipt_id_idx`(`receipt_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_purchase_order_id_fkey` FOREIGN KEY (`purchase_order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipts` ADD CONSTRAINT `goods_receipts_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `goods_receipt_items` ADD CONSTRAINT `goods_receipt_items_receipt_id_fkey` FOREIGN KEY (`receipt_id`) REFERENCES `goods_receipts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
