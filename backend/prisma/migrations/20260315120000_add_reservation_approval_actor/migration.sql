-- Add approval/rejection actor tracking (nullable for backward compatibility)
ALTER TABLE `reservations`
  ADD COLUMN `ApprovedByUserId` INTEGER NULL,
  ADD COLUMN `ApprovedByRole` VARCHAR(20) NULL;

