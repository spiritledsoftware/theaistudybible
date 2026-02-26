CREATE TABLE `daily_study_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL,
	`goal` text NOT NULL,
	`passage_or_topic` text NOT NULL,
	`passage_context` text NOT NULL,
	`concise_explanation` text NOT NULL,
	`reflection_prompt` text NOT NULL,
	`notes` text DEFAULT '' NOT NULL,
	`recap` text,
	`start_time` text NOT NULL,
	`end_time` text,
	`returned_within_7_days` integer DEFAULT false NOT NULL,
	`daily_active_study_baseline` integer DEFAULT true NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`failure_reason` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `daily_study_sessions_user_id_idx` ON `daily_study_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `daily_study_sessions_start_time_idx` ON `daily_study_sessions` (`start_time`);--> statement-breakpoint
CREATE INDEX `daily_study_sessions_end_time_idx` ON `daily_study_sessions` (`end_time`);--> statement-breakpoint
CREATE INDEX `daily_study_sessions_returned_within_7_days_idx` ON `daily_study_sessions` (`returned_within_7_days`);--> statement-breakpoint
CREATE INDEX `daily_study_sessions_status_idx` ON `daily_study_sessions` (`status`);
