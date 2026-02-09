-- CreateTable
CREATE TABLE `password_reset_codes` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `customerId` INTEGER NOT NULL,
    `code` VARCHAR(10) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `password_reset_codes_customerId_idx`(`customerId`),
    INDEX `password_reset_codes_code_idx`(`code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `password_reset_codes` ADD CONSTRAINT `password_reset_codes_customerId_fkey`
  FOREIGN KEY (`customerId`) REFERENCES `customers`(`CustomerID`) ON DELETE CASCADE ON UPDATE CASCADE;
