-- Add minimal, backward-compatible email delivery status tracking for admin replies
ALTER TABLE `contacts`
  ADD COLUMN `ReplyMailStatus` VARCHAR(20) NULL,
  ADD COLUMN `ReplyMailError` TEXT NULL,
  ADD COLUMN `ReplyMailSentAt` DATETIME(3) NULL;

