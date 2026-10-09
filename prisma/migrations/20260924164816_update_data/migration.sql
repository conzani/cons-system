-- CreateTable
CREATE TABLE `site_attendance` (
    `id` BIGINT NOT NULL AUTO_INCREMENT,
    `public_id` VARCHAR(191) NOT NULL,
    `site_id` BIGINT NOT NULL,
    `employee_id` BIGINT NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `shift` VARCHAR(191) NOT NULL DEFAULT 'Day Shift',
    `start_time` DATETIME(3) NOT NULL,
    `end_time` DATETIME(3) NOT NULL,
    `break_minutes` INTEGER NOT NULL DEFAULT 0,
    `hours_worked` DECIMAL(10, 2) NOT NULL DEFAULT 0,
    `attendance_status` VARCHAR(191) NOT NULL DEFAULT 'Present',
    `notes` TEXT NULL,
    `timesheet_id` BIGINT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,
    `deleted_at` DATETIME(3) NULL,

    UNIQUE INDEX `site_attendance_public_id_key`(`public_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `site_attendance` ADD CONSTRAINT `site_attendance_site_id_fkey` FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_attendance` ADD CONSTRAINT `site_attendance_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `site_attendance` ADD CONSTRAINT `site_attendance_timesheet_id_fkey` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheets`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
