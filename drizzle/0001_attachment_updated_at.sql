ALTER TABLE `attachments` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
UPDATE `attachments` SET `updated_at` = `created_at`;--> statement-breakpoint
CREATE INDEX `attachments_user_updated_idx` ON `attachments` (`user_id`,`updated_at`);