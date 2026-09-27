-- AlterTable
ALTER TABLE `exercise_logs` ADD COLUMN `entered_by_user_id` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `users` ADD COLUMN `coach_invite_code` VARCHAR(16) NULL,
    ADD COLUMN `is_coach` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `workout_templates` ADD COLUMN `assigned_by_user_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `coach_clients` (
    `id` CHAR(36) NOT NULL,
    `coach_id` CHAR(36) NOT NULL,
    `client_id` CHAR(36) NOT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `coach_clients_client_id_idx`(`client_id`),
    UNIQUE INDEX `coach_clients_coach_id_client_id_key`(`coach_id`, `client_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exercise_logs_entered_by_user_id_idx` ON `exercise_logs`(`entered_by_user_id`);

-- CreateIndex
CREATE UNIQUE INDEX `users_coach_invite_code_key` ON `users`(`coach_invite_code`);

-- CreateIndex
CREATE INDEX `workout_templates_assigned_by_user_id_idx` ON `workout_templates`(`assigned_by_user_id`);

-- AddForeignKey
ALTER TABLE `exercise_logs` ADD CONSTRAINT `exercise_logs_entered_by_user_id_fkey` FOREIGN KEY (`entered_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_templates` ADD CONSTRAINT `workout_templates_assigned_by_user_id_fkey` FOREIGN KEY (`assigned_by_user_id`) REFERENCES `users`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coach_clients` ADD CONSTRAINT `coach_clients_coach_id_fkey` FOREIGN KEY (`coach_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `coach_clients` ADD CONSTRAINT `coach_clients_client_id_fkey` FOREIGN KEY (`client_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

