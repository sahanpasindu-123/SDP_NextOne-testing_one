-- AlterTable
ALTER TABLE `products` ADD COLUMN `Status` ENUM('ACTIVE') NOT NULL DEFAULT 'ACTIVE';

-- CreateTable
CREATE TABLE `product_requests` (
    `RequestID` INTEGER NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(191) NOT NULL,
    `Description` VARCHAR(191) NULL,
    `Price` DOUBLE NOT NULL,
    `Stock` INTEGER NOT NULL,
    `StockLimit` INTEGER NULL,
    `CategoryID` INTEGER NOT NULL,
    `PlaceID` INTEGER NULL,
    `ImageURL` VARCHAR(191) NULL,
    `Status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `RequestedBy` INTEGER NOT NULL,
    `ReviewedBy` INTEGER NULL,
    `ReviewedAt` DATETIME(3) NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    INDEX `product_requests_CategoryID_idx`(`CategoryID`),
    INDEX `product_requests_RequestedBy_idx`(`RequestedBy`),
    INDEX `product_requests_ReviewedBy_idx`(`ReviewedBy`),
    PRIMARY KEY (`RequestID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_requests` ADD CONSTRAINT `product_requests_CategoryID_fkey` FOREIGN KEY (`CategoryID`) REFERENCES `categories`(`CategoryID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_requests` ADD CONSTRAINT `product_requests_RequestedBy_fkey` FOREIGN KEY (`RequestedBy`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_requests` ADD CONSTRAINT `product_requests_ReviewedBy_fkey` FOREIGN KEY (`ReviewedBy`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
