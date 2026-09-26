-- AlterTable
ALTER TABLE `exercise_logs` ADD COLUMN `session_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `workout_sessions` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `started_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `ended_at` DATETIME(3) NULL,
    `note` TEXT NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workout_sessions_user_id_started_at_idx`(`user_id`, `started_at` DESC),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `exercise_logs_session_id_idx` ON `exercise_logs`(`session_id`);

-- AddForeignKey
ALTER TABLE `exercise_logs` ADD CONSTRAINT `exercise_logs_session_id_fkey` FOREIGN KEY (`session_id`) REFERENCES `workout_sessions`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_sessions` ADD CONSTRAINT `workout_sessions_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
