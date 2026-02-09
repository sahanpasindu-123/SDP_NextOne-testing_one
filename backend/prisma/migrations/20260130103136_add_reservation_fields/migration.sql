/*
  Warnings:

  - You are about to drop the column `Address` on the `customers` table. All the data in the column will be lost.
  - You are about to drop the column `Category` on the `products` table. All the data in the column will be lost.
  - Added the required column `PasswordHash` to the `customers` table without a default value. This is not possible if the table is not empty.
  - Added the required column `CategoryID` to the `products` table without a default value. This is not possible if the table is not empty.
  - Added the required column `Total` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `UnitPrice` to the `reservations` table without a default value. This is not possible if the table is not empty.
  - Added the required column `EmployeeID` to the `sales` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `alerts` ADD COLUMN `CustomerID` INTEGER NULL,
    ADD COLUMN `Status` VARCHAR(191) NULL,
    ADD COLUMN `UserID` INTEGER NULL;

-- AlterTable
ALTER TABLE `customers` DROP COLUMN `Address`,
    ADD COLUMN `PasswordHash` VARCHAR(255) NOT NULL,
    ADD COLUMN `emailVerified` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `emailVerifyCode` VARCHAR(10) NULL,
    ADD COLUMN `emailVerifyExpires` DATETIME(3) NULL,
    ADD COLUMN `isActive` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `lastLogin` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `products` DROP COLUMN `Category`,
    ADD COLUMN `CategoryID` INTEGER NOT NULL,
    ADD COLUMN `StockLimit` INTEGER NULL;

-- AlterTable
ALTER TABLE `reports` ADD COLUMN `CreatedBy` INTEGER NULL,
    ADD COLUMN `ReportType` VARCHAR(191) NULL,
    ADD COLUMN `TimePeriod` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `reservations` ADD COLUMN `ApprovedBy` INTEGER NULL,
    ADD COLUMN `Notes` VARCHAR(191) NULL,
    ADD COLUMN `Total` DOUBLE NOT NULL,
    ADD COLUMN `UnitPrice` DOUBLE NOT NULL,
    MODIFY `Status` VARCHAR(191) NOT NULL DEFAULT 'CONFIRMED';

-- AlterTable
ALTER TABLE `sales` ADD COLUMN `EmployeeID` INTEGER NOT NULL,
    ADD COLUMN `Type` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `categories` (
    `CategoryID` INTEGER NOT NULL AUTO_INCREMENT,
    `CategoryCode` VARCHAR(191) NOT NULL,
    `Name` VARCHAR(191) NOT NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `categories_CategoryCode_key`(`CategoryCode`),
    UNIQUE INDEX `categories_Name_key`(`Name`),
    PRIMARY KEY (`CategoryID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `invoices` (
    `InvoiceID` INTEGER NOT NULL AUTO_INCREMENT,
    `SaleID` INTEGER NOT NULL,
    `Amount` DOUBLE NOT NULL,
    `Date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `invoices_SaleID_key`(`SaleID`),
    PRIMARY KEY (`InvoiceID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_updates` (
    `UpdateID` INTEGER NOT NULL AUTO_INCREMENT,
    `ProductID` INTEGER NOT NULL,
    `Changes` INTEGER NOT NULL,
    `Status` VARCHAR(191) NULL,
    `SubmittedBy` INTEGER NULL,
    `ApprovedBy` INTEGER NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `inventory_updates_ApprovedBy_fkey`(`ApprovedBy`),
    INDEX `inventory_updates_ProductID_fkey`(`ProductID`),
    INDEX `inventory_updates_SubmittedBy_fkey`(`SubmittedBy`),
    PRIMARY KEY (`UpdateID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `contacts` (
    `ContactID` INTEGER NOT NULL AUTO_INCREMENT,
    `CustomerID` INTEGER NOT NULL,
    `Subject` VARCHAR(191) NULL,
    `Message` VARCHAR(191) NOT NULL,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `RepliedBy` INTEGER NULL,

    INDEX `contacts_CustomerID_fkey`(`CustomerID`),
    INDEX `contacts_RepliedBy_fkey`(`RepliedBy`),
    PRIMARY KEY (`ContactID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `products_CategoryID_fkey` ON `products`(`CategoryID`);

-- CreateIndex
CREATE INDEX `reservations_ApprovedBy_fkey` ON `reservations`(`ApprovedBy`);

-- CreateIndex
CREATE INDEX `sales_EmployeeID_fkey` ON `sales`(`EmployeeID`);

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_CategoryID_fkey` FOREIGN KEY (`CategoryID`) REFERENCES `categories`(`CategoryID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `reservations` ADD CONSTRAINT `reservations_ApprovedBy_fkey` FOREIGN KEY (`ApprovedBy`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sales` ADD CONSTRAINT `sales_EmployeeID_fkey` FOREIGN KEY (`EmployeeID`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `invoices` ADD CONSTRAINT `invoices_SaleID_fkey` FOREIGN KEY (`SaleID`) REFERENCES `sales`(`SaleID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_updates` ADD CONSTRAINT `inventory_updates_ApprovedBy_fkey` FOREIGN KEY (`ApprovedBy`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_updates` ADD CONSTRAINT `inventory_updates_ProductID_fkey` FOREIGN KEY (`ProductID`) REFERENCES `products`(`ProductID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_updates` ADD CONSTRAINT `inventory_updates_SubmittedBy_fkey` FOREIGN KEY (`SubmittedBy`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_CustomerID_fkey` FOREIGN KEY (`CustomerID`) REFERENCES `customers`(`CustomerID`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `contacts` ADD CONSTRAINT `contacts_RepliedBy_fkey` FOREIGN KEY (`RepliedBy`) REFERENCES `admins`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
