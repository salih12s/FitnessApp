-- AlterTable
ALTER TABLE `users` ADD COLUMN `weight_unit` ENUM('kg', 'lb') NOT NULL DEFAULT 'kg';

-- CreateTable
CREATE TABLE `body_measurements` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `measured_at` DATE NOT NULL,
    `weight_kg` DECIMAL(5, 2) NULL,
    `body_fat_percent` DECIMAL(4, 1) NULL,
    `waist_cm` DECIMAL(5, 1) NULL,
    `chest_cm` DECIMAL(5, 1) NULL,
    `arm_cm` DECIMAL(5, 1) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `body_measurements_user_id_measured_at_idx`(`user_id`, `measured_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `body_measurements` ADD CONSTRAINT `body_measurements_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
