-- CreateTable
CREATE TABLE `accounts` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `is_system` BOOLEAN NOT NULL DEFAULT false,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `accounts_public_id_key`(`public_id`),
    UNIQUE INDEX `accounts_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_entries` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `entry_number` VARCHAR(191) NOT NULL,
    `entry_date` DATETIME(3) NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `source_type` VARCHAR(191) NULL,
    `source_id` BIGINT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Posted',
    `posted_at` DATETIME(3) NULL,
    `created_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `journal_entries_public_id_key`(`public_id`),
    UNIQUE INDEX `journal_entries_entry_number_key`(`entry_number`),
    INDEX `journal_entries_source_type_source_id_idx`(`source_type`, `source_id`),
    INDEX `journal_entries_entry_date_idx`(`entry_date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `journal_lines` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `entry_id` BIGINT NOT NULL,
    `account_id` BIGINT NOT NULL,
    `description` VARCHAR(191) NULL,
    `debit` BIGINT NOT NULL DEFAULT 0,
    `credit` BIGINT NOT NULL DEFAULT 0,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `department_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `journal_lines_public_id_key`(`public_id`),
    INDEX `journal_lines_entry_id_idx`(`entry_id`),
    INDEX `journal_lines_account_id_idx`(`account_id`),
    INDEX `journal_lines_project_id_idx`(`project_id`),
    INDEX `journal_lines_site_id_idx`(`site_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `invoice_number` VARCHAR(191) NOT NULL,
    `client` VARCHAR(191) NOT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `issue_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `description` TEXT NULL,
    `subtotal` BIGINT NOT NULL DEFAULT 0,
    `tax_amount` BIGINT NOT NULL DEFAULT 0,
    `total` BIGINT NOT NULL DEFAULT 0,
    `paid_amount` BIGINT NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Sent',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `invoices_public_id_key`(`public_id`),
    UNIQUE INDEX `invoices_invoice_number_key`(`invoice_number`),
    INDEX `invoices_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bills` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `bill_number` VARCHAR(191) NOT NULL,
    `supplier_id` BIGINT NULL,
    `supplier_name` VARCHAR(191) NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `purchase_order_id` BIGINT NULL,
    `bill_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `description` TEXT NULL,
    `subtotal` BIGINT NOT NULL DEFAULT 0,
    `tax_amount` BIGINT NOT NULL DEFAULT 0,
    `total` BIGINT NOT NULL DEFAULT 0,
    `paid_amount` BIGINT NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Approved',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `bills_public_id_key`(`public_id`),
    UNIQUE INDEX `bills_bill_number_key`(`bill_number`),
    INDEX `bills_supplier_id_idx`(`supplier_id`),
    INDEX `bills_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `payment_number` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `invoice_id` BIGINT NULL,
    `bill_id` BIGINT NULL,
    `payment_date` DATETIME(3) NOT NULL,
    `amount` BIGINT NOT NULL,
    `method` VARCHAR(191) NOT NULL DEFAULT 'Bank Transfer',
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `payments_public_id_key`(`public_id`),
    UNIQUE INDEX `payments_payment_number_key`(`payment_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `contact_name` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `email` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `tax_id` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `suppliers_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_orders` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `po_number` VARCHAR(191) NOT NULL,
    `supplier_id` BIGINT NOT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `site_request_id` BIGINT NULL,
    `order_date` DATETIME(3) NOT NULL,
    `expected_date` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `subtotal` BIGINT NOT NULL DEFAULT 0,
    `tax_amount` BIGINT NOT NULL DEFAULT 0,
    `total` BIGINT NOT NULL DEFAULT 0,
    `notes` TEXT NULL,
    `created_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `purchase_orders_public_id_key`(`public_id`),
    UNIQUE INDEX `purchase_orders_po_number_key`(`po_number`),
    INDEX `purchase_orders_supplier_id_idx`(`supplier_id`),
    INDEX `purchase_orders_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `purchase_order_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `order_id` BIGINT NOT NULL,
    `description` VARCHAR(191) NOT NULL,
    `unit` VARCHAR(191) NULL,
    `quantity` DOUBLE NOT NULL DEFAULT 1,
    `unit_price` BIGINT NOT NULL,
    `received_quantity` DOUBLE NOT NULL DEFAULT 0,
    `amount` BIGINT NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `purchase_order_items_public_id_key`(`public_id`),
    INDEX `purchase_order_items_order_id_idx`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `warehouses` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `location` VARCHAR(191) NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `warehouses_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_items` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `unit` VARCHAR(191) NOT NULL DEFAULT 'units',
    `unit_cost` BIGINT NOT NULL DEFAULT 0,
    `reorder_level` DOUBLE NOT NULL DEFAULT 0,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `inventory_items_public_id_key`(`public_id`),
    UNIQUE INDEX `inventory_items_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `item_id` BIGINT NOT NULL,
    `warehouse_id` BIGINT NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `quantity` DOUBLE NOT NULL,
    `unit_cost` BIGINT NOT NULL DEFAULT 0,
    `movement_date` DATETIME(3) NOT NULL,
    `reference_type` VARCHAR(191) NULL,
    `reference_id` BIGINT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `notes` TEXT NULL,
    `created_by` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `stock_movements_public_id_key`(`public_id`),
    INDEX `stock_movements_item_id_idx`(`item_id`),
    INDEX `stock_movements_warehouse_id_idx`(`warehouse_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `code` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `category` VARCHAR(191) NULL,
    `ownership` VARCHAR(191) NOT NULL DEFAULT 'Owned',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `hourly_rate` BIGINT NULL,
    `daily_rate` BIGINT NULL,
    `purchase_value` BIGINT NULL,
    `acquired_at` DATETIME(3) NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `equipment_public_id_key`(`public_id`),
    UNIQUE INDEX `equipment_code_key`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `equipment_logs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `equipment_id` BIGINT NOT NULL,
    `log_date` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `hours` DOUBLE NULL,
    `quantity` DOUBLE NULL,
    `unit_cost` BIGINT NULL,
    `cost` BIGINT NOT NULL DEFAULT 0,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `equipment_logs_public_id_key`(`public_id`),
    INDEX `equipment_logs_equipment_id_idx`(`equipment_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inspections` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `inspection_number` VARCHAR(191) NOT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Site',
    `inspection_date` DATETIME(3) NOT NULL,
    `inspector_name` VARCHAR(191) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `findings` TEXT NULL,
    `corrective_action` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `inspections_public_id_key`(`public_id`),
    UNIQUE INDEX `inspections_inspection_number_key`(`inspection_number`),
    INDEX `inspections_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ncrs` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `ncr_number` VARCHAR(191) NOT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `severity` VARCHAR(191) NOT NULL DEFAULT 'Medium',
    `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
    `raised_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `closed_date` DATETIME(3) NULL,
    `corrective_action` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `ncrs_public_id_key`(`public_id`),
    UNIQUE INDEX `ncrs_ncr_number_key`(`ncr_number`),
    INDEX `ncrs_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `safety_incidents` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `incident_number` VARCHAR(191) NOT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `incident_date` DATETIME(3) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'Near Miss',
    `severity` VARCHAR(191) NOT NULL DEFAULT 'Low',
    `description` TEXT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
    `lost_days` INTEGER NOT NULL DEFAULT 0,
    `corrective_action` TEXT NULL,
    `reported_by` VARCHAR(191) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `safety_incidents_public_id_key`(`public_id`),
    UNIQUE INDEX `safety_incidents_incident_number_key`(`incident_number`),
    INDEX `safety_incidents_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `rfis` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `rfi_number` VARCHAR(191) NOT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `question` TEXT NOT NULL,
    `response` TEXT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Open',
    `raised_by` VARCHAR(191) NULL,
    `assigned_to` VARCHAR(191) NULL,
    `raised_date` DATETIME(3) NOT NULL,
    `due_date` DATETIME(3) NULL,
    `answered_date` DATETIME(3) NULL,
    `document_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `rfis_public_id_key`(`public_id`),
    UNIQUE INDEX `rfis_rfi_number_key`(`rfi_number`),
    INDEX `rfis_project_id_idx`(`project_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_entry_id_fkey` FOREIGN KEY (`entry_id`) REFERENCES `journal_entries`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `journal_lines` ADD CONSTRAINT `journal_lines_account_id_fkey` FOREIGN KEY (`account_id`) REFERENCES `accounts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `bills` ADD CONSTRAINT `bills_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_orders` ADD CONSTRAINT `purchase_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `purchase_order_items` ADD CONSTRAINT `purchase_order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_item_id_fkey` FOREIGN KEY (`item_id`) REFERENCES `inventory_items`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_warehouse_id_fkey` FOREIGN KEY (`warehouse_id`) REFERENCES `warehouses`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `equipment_logs` ADD CONSTRAINT `equipment_logs_equipment_id_fkey` FOREIGN KEY (`equipment_id`) REFERENCES `equipment`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
