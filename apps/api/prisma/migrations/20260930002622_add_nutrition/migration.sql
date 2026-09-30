-- CreateTable
CREATE TABLE `food_entries` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `eaten_on` DATE NOT NULL,
    `meal` ENUM('breakfast', 'lunch', 'dinner', 'snack') NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `serving_label` VARCHAR(60) NULL,
    `calories` INTEGER NOT NULL,
    `protein_g` DECIMAL(5, 1) NOT NULL DEFAULT 0,
    `carbs_g` DECIMAL(5, 1) NOT NULL DEFAULT 0,
    `fat_g` DECIMAL(5, 1) NOT NULL DEFAULT 0,
    `note` VARCHAR(500) NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    INDEX `food_entries_user_id_eaten_on_idx`(`user_id`, `eaten_on`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `saved_foods` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `name` VARCHAR(120) NOT NULL,
    `serving_label` VARCHAR(60) NULL,
    `calories` INTEGER NOT NULL,
    `protein_g` DECIMAL(5, 1) NOT NULL DEFAULT 0,
    `carbs_g` DECIMAL(5, 1) NOT NULL DEFAULT 0,
    `fat_g` DECIMAL(5, 1) NOT NULL DEFAULT 0,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `saved_foods_user_id_name_key`(`user_id`, `name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `nutrition_goals` (
    `id` CHAR(36) NOT NULL,
    `user_id` CHAR(36) NOT NULL,
    `calories` INTEGER NOT NULL,
    `protein_g` INTEGER NULL,
    `carbs_g` INTEGER NULL,
    `fat_g` INTEGER NULL,
    `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updated_at` DATETIME(3) NOT NULL,

    UNIQUE INDEX `nutrition_goals_user_id_key`(`user_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `food_entries` ADD CONSTRAINT `food_entries_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_foods` ADD CONSTRAINT `saved_foods_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `nutrition_goals` ADD CONSTRAINT `nutrition_goals_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
