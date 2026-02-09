-- AlterTable
ALTER TABLE `products` ADD COLUMN `PlaceID` INTEGER NULL;

-- AlterTable
ALTER TABLE `reservations` MODIFY `Status` VARCHAR(191) NOT NULL DEFAULT 'PENDING';

-- CreateTable
CREATE TABLE `places` (
    `PlaceID` INTEGER NOT NULL AUTO_INCREMENT,
    `Code` VARCHAR(191) NOT NULL,
    `Name` VARCHAR(191) NOT NULL,
    `Address` VARCHAR(191) NULL,
    `City` VARCHAR(191) NULL,
    `Phone` VARCHAR(191) NULL,
    `IsActive` BOOLEAN NOT NULL DEFAULT true,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `UpdatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `places_Code_key`(`Code`),
    PRIMARY KEY (`PlaceID`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee_places` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `EmployeeID` INTEGER NOT NULL,
    `PlaceID` INTEGER NOT NULL,
    `IsPrimary` BOOLEAN NOT NULL DEFAULT false,
    `CreatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `employee_places_EmployeeID_idx`(`EmployeeID`),
    INDEX `employee_places_PlaceID_idx`(`PlaceID`),
    UNIQUE INDEX `employee_places_EmployeeID_PlaceID_key`(`EmployeeID`, `PlaceID`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `products` ADD CONSTRAINT `products_PlaceID_fkey` FOREIGN KEY (`PlaceID`) REFERENCES `places`(`PlaceID`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_places` ADD CONSTRAINT `employee_places_EmployeeID_fkey` FOREIGN KEY (`EmployeeID`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `employee_places` ADD CONSTRAINT `employee_places_PlaceID_fkey` FOREIGN KEY (`PlaceID`) REFERENCES `places`(`PlaceID`) ON DELETE RESTRICT ON UPDATE CASCADE;
