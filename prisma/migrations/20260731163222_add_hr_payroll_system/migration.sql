-- AlterTable
ALTER TABLE `documents` ADD COLUMN `employee_id` BIGINT NULL;

-- CreateTable
CREATE TABLE `employees` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `employee_number` VARCHAR(191) NOT NULL,
    `user_id` BIGINT NULL,
    `department_id` BIGINT NULL,
    `position_id` BIGINT NULL,
    `branch_id` BIGINT NULL,
    `firstname` VARCHAR(191) NOT NULL,
    `lastname` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NULL,
    `phone` VARCHAR(191) NULL,
    `date_of_birth` DATETIME(3) NULL,
    `gender` VARCHAR(191) NULL,
    `marital_status` VARCHAR(191) NULL,
    `nationality` VARCHAR(191) NULL,
    `national_id` VARCHAR(191) NULL,
    `passport_number` VARCHAR(191) NULL,
    `tax_id` VARCHAR(191) NULL,
    `bank_account` VARCHAR(191) NULL,
    `bank_name` VARCHAR(191) NULL,
    `employment_type` VARCHAR(191) NULL,
    `employment_status` VARCHAR(191) NOT NULL DEFAULT 'Active',
    `payment_type` VARCHAR(191) NOT NULL DEFAULT 'Monthly',
    `hourly_rate` BIGINT NULL,
    `daily_rate` BIGINT NULL,
    `monthly_salary` BIGINT NULL,
    `hire_date` DATETIME(3) NOT NULL,
    `termination_date` DATETIME(3) NULL,
    `termination_reason` VARCHAR(191) NULL,
    `address` TEXT NULL,
    `emergency_contact` VARCHAR(191) NULL,
    `emergency_phone` VARCHAR(191) NULL,
    `profile_picture` VARCHAR(191) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `employees_public_id_key`(`public_id`),
    UNIQUE INDEX `employees_employee_number_key`(`employee_number`),
    UNIQUE INDEX `employees_user_id_key`(`user_id`),
    UNIQUE INDEX `employees_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `timesheets` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `employee_id` BIGINT NOT NULL,
    `project_id` BIGINT NULL,
    `site_id` BIGINT NULL,
    `date` DATETIME(3) NOT NULL,
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NULL,
    `regular_hours` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `overtime_hours` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `break_minutes` INTEGER NOT NULL DEFAULT 0,
    `description` TEXT NULL,
    `approved_by` BIGINT NULL,
    `approved_at` DATETIME(3) NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `timesheets_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payroll` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `employee_id` BIGINT NOT NULL,
    `pay_period_start` DATETIME(3) NOT NULL,
    `pay_period_end` DATETIME(3) NOT NULL,
    `payment_type` VARCHAR(191) NOT NULL,
    `regular_hours` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `overtime_hours` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `regular_pay` BIGINT NOT NULL DEFAULT 0,
    `overtime_pay` BIGINT NOT NULL DEFAULT 0,
    `allowances` BIGINT NOT NULL DEFAULT 0,
    `deductions` BIGINT NOT NULL DEFAULT 0,
    `bonuses` BIGINT NOT NULL DEFAULT 0,
    `net_pay` BIGINT NOT NULL,
    `gross_pay` BIGINT NOT NULL,
    `tax_amount` BIGINT NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'Draft',
    `paid_at` DATETIME(3) NULL,
    `notes` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `payroll_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `documents` ADD CONSTRAINT `documents_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_department_id_fkey` FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_branch_id_fkey` FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `timesheets` ADD CONSTRAINT `timesheets_approved_by_fkey` FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payroll` ADD CONSTRAINT `payroll_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
