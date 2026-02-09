-- AlterTable
ALTER TABLE `contacts` ADD COLUMN `RepliedAt` DATETIME(3) NULL,
    ADD COLUMN `ReplyMessage` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `ReturnReason` VARCHAR(255) NULL,
    ADD COLUMN `ReturnedAt` DATETIME(3) NULL,
    ADD COLUMN `ReturnedById` INTEGER NULL,
    ADD COLUMN `ReturnedByRole` VARCHAR(191) NULL,
    ADD COLUMN `Status` VARCHAR(191) NOT NULL DEFAULT 'COMPLETED';

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `actorRole` VARCHAR(191) NOT NULL,
    `adminId` INTEGER NULL,
    `employeeId` INTEGER NULL,
    `customerId` INTEGER NULL,
    `action` VARCHAR(191) NOT NULL,
    `entityType` VARCHAR(191) NOT NULL,
    `entityId` VARCHAR(191) NOT NULL,
    `beforeData` LONGTEXT NULL,
    `afterData` LONGTEXT NULL,
    `meta` LONGTEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `audit_logs_actorRole_idx`(`actorRole`),
    INDEX `audit_logs_adminId_idx`(`adminId`),
    INDEX `audit_logs_employeeId_idx`(`employeeId`),
    INDEX `audit_logs_customerId_idx`(`customerId`),
    INDEX `audit_logs_entityType_idx`(`entityType`),
    INDEX `audit_logs_entityId_idx`(`entityId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `sales_Status_idx` ON `sales`(`Status`);

-- CreateIndex
CREATE INDEX `sales_SaleDate_idx` ON `sales`(`SaleDate`);

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`CustomerID`) ON DELETE SET NULL ON UPDATE CASCADE;
