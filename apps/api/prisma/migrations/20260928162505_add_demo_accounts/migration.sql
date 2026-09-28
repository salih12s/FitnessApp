-- AlterTable
ALTER TABLE `users` ADD COLUMN `is_demo` BOOLEAN NOT NULL DEFAULT false;

-- CreateIndex
CREATE INDEX `users_is_demo_created_at_idx` ON `users`(`is_demo`, `created_at`);
