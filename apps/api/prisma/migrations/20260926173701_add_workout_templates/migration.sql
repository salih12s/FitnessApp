-- AlterTable
ALTER TABLE `workout_sessions` ADD COLUMN `template_id` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `workout_templates` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(80) NOT NULL,
    `scheduled_days` INTEGER NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `workout_templates_user_id_idx`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `template_exercises` (
    `id` CHAR(36) NOT NULL,
    `template_id` CHAR(36) NOT NULL,
    `exercise_id` CHAR(36) NOT NULL,
    `position` INTEGER NOT NULL,
    `target_sets` INTEGER NOT NULL,
    `target_reps` INTEGER NOT NULL,
    `target_weight_kg` DECIMAL(6, 2) NULL,

    INDEX `template_exercises_exercise_id_idx`(`exercise_id`),
    UNIQUE INDEX `template_exercises_template_id_position_key`(`template_id`, `position`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `workout_sessions_template_id_idx` ON `workout_sessions`(`template_id`);

-- AddForeignKey
ALTER TABLE `workout_sessions` ADD CONSTRAINT `workout_sessions_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `workout_templates` ADD CONSTRAINT `workout_templates_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_exercises` ADD CONSTRAINT `template_exercises_template_id_fkey` FOREIGN KEY (`template_id`) REFERENCES `workout_templates`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `template_exercises` ADD CONSTRAINT `template_exercises_exercise_id_fkey` FOREIGN KEY (`exercise_id`) REFERENCES `exercises`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
