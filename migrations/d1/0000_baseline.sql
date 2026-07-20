CREATE TABLE `bible_contributors` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`uid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`content` integer DEFAULT false NOT NULL,
	`publication` integer DEFAULT false NOT NULL,
	`management` integer DEFAULT false NOT NULL,
	`finance` integer DEFAULT false NOT NULL,
	`qa` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bible_contributors_name_idx` ON `bible_contributors` (`name`);--> statement-breakpoint
CREATE TABLE `bible_countries` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`iso` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bible_countries_name_idx` ON `bible_countries` (`name`);--> statement-breakpoint
CREATE TABLE `bible_languages` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`iso` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_local` text NOT NULL,
	`script` text NOT NULL,
	`script_code` text NOT NULL,
	`script_direction` text NOT NULL,
	`ldml` text NOT NULL,
	`rod` integer,
	`numerals` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bible_languages_name_idx` ON `bible_languages` (`name`);--> statement-breakpoint
CREATE INDEX `bible_languages_name_local_idx` ON `bible_languages` (`name_local`);--> statement-breakpoint
CREATE INDEX `bible_languages_script_code_idx` ON `bible_languages` (`script_code`);--> statement-breakpoint
CREATE INDEX `bible_languages_script_direction_idx` ON `bible_languages` (`script_direction`);--> statement-breakpoint
CREATE TABLE `bible_rights_admins` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`uid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`url` text
);
--> statement-breakpoint
CREATE INDEX `bible_rights_admins_name_idx` ON `bible_rights_admins` (`name`);--> statement-breakpoint
CREATE TABLE `bible_rights_holders` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`uid` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`name_local` text NOT NULL,
	`abbr` text NOT NULL,
	`url` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bible_rights_holders_name_idx` ON `bible_rights_holders` (`name`);--> statement-breakpoint
CREATE INDEX `bible_rights_holders_abbr_idx` ON `bible_rights_holders` (`abbr`);--> statement-breakpoint
CREATE TABLE `bibles` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`abbreviation` text PRIMARY KEY NOT NULL,
	`abbreviation_local` text NOT NULL,
	`name` text NOT NULL,
	`name_local` text NOT NULL,
	`description` text NOT NULL,
	`copyright_statement` text NOT NULL,
	`ready_for_publication` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `bibles_abbreviation_local_idx` ON `bibles` (`abbreviation_local`);--> statement-breakpoint
CREATE INDEX `bibles_name_idx` ON `bibles` (`name`);--> statement-breakpoint
CREATE INDEX `bibles_name_local_idx` ON `bibles` (`name_local`);--> statement-breakpoint
CREATE INDEX `bibles_ready_for_publication_idx` ON `bibles` (`ready_for_publication`);--> statement-breakpoint
CREATE TABLE `bibles_to_contributors` (
	`bible_abbreviation` text NOT NULL,
	`contributor_uid` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `contributor_uid`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`contributor_uid`) REFERENCES `bible_contributors`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bibles_to_contributors_bible_abbreviation_idx` ON `bibles_to_contributors` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `bibles_to_contributors_contributor_uid_idx` ON `bibles_to_contributors` (`contributor_uid`);--> statement-breakpoint
CREATE TABLE `bibles_to_countries` (
	`bible_abbreviation` text NOT NULL,
	`country_iso` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `country_iso`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`country_iso`) REFERENCES `bible_countries`(`iso`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bibles_to_countries_bible_abbreviation_idx` ON `bibles_to_countries` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `bibles_to_countries_country_iso_idx` ON `bibles_to_countries` (`country_iso`);--> statement-breakpoint
CREATE TABLE `bibles_to_languages` (
	`bible_abbreviation` text NOT NULL,
	`language_iso` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `language_iso`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`language_iso`) REFERENCES `bible_languages`(`iso`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bibles_to_languages_bible_abbreviation_idx` ON `bibles_to_languages` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `bibles_to_languages_language_iso_idx` ON `bibles_to_languages` (`language_iso`);--> statement-breakpoint
CREATE TABLE `bibles_to_rights_admins` (
	`bible_abbreviation` text NOT NULL,
	`rights_admin_uid` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `rights_admin_uid`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rights_admin_uid`) REFERENCES `bible_rights_admins`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bibles_to_rights_admins_bible_abbreviation_idx` ON `bibles_to_rights_admins` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `bibles_to_rights_admins_rights_admin_uid_idx` ON `bibles_to_rights_admins` (`rights_admin_uid`);--> statement-breakpoint
CREATE TABLE `bibles_to_rights_holders` (
	`bible_abbreviation` text NOT NULL,
	`rights_holder_uid` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `rights_holder_uid`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`rights_holder_uid`) REFERENCES `bible_rights_holders`(`uid`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `bibles_to_rights_holders_bible_abbreviation_idx` ON `bibles_to_rights_holders` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `bibles_to_rights_holders_rights_holder_uid_idx` ON `bibles_to_rights_holders` (`rights_holder_uid`);--> statement-breakpoint
CREATE TABLE `books` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`bible_abbreviation` text NOT NULL,
	`previous_code` text,
	`next_code` text,
	`number` integer NOT NULL,
	`code` text NOT NULL,
	`abbreviation` text,
	`short_name` text NOT NULL,
	`long_name` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `code`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `books_bible_abbreviation_idx` ON `books` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `books_previous_code_idx` ON `books` (`previous_code`);--> statement-breakpoint
CREATE INDEX `books_next_code_idx` ON `books` (`next_code`);--> statement-breakpoint
CREATE INDEX `books_number_idx` ON `books` (`number`);--> statement-breakpoint
CREATE INDEX `books_code_idx` ON `books` (`code`);--> statement-breakpoint
CREATE INDEX `books_abbreviation_idx` ON `books` (`abbreviation`);--> statement-breakpoint
CREATE TABLE `chapter_bookmarks` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`bible_abbreviation` text NOT NULL,
	`chapter_code` text NOT NULL,
	`user_id` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `chapter_code`, `user_id`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`chapter_code`) REFERENCES `chapters`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chapter_bookmarks_bible_abbreviation_idx` ON `chapter_bookmarks` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `chapter_bookmarks_chapter_code_idx` ON `chapter_bookmarks` (`chapter_code`);--> statement-breakpoint
CREATE INDEX `chapter_bookmarks_user_id_idx` ON `chapter_bookmarks` (`user_id`);--> statement-breakpoint
CREATE TABLE `chapter_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`bible_abbreviation` text NOT NULL,
	`chapter_code` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`chapter_code`) REFERENCES `chapters`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chapter_notes_bible_abbreviation_idx` ON `chapter_notes` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `chapter_notes_chapter_code_idx` ON `chapter_notes` (`chapter_code`);--> statement-breakpoint
CREATE INDEX `chapter_notes_user_id_idx` ON `chapter_notes` (`user_id`);--> statement-breakpoint
CREATE TABLE `chapters` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`bible_abbreviation` text NOT NULL,
	`book_code` text NOT NULL,
	`previous_code` text,
	`next_code` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`number` integer NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `code`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`book_code`) REFERENCES `books`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chapters_bible_abbreviation_idx` ON `chapters` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `chapters_book_code_idx` ON `chapters` (`book_code`);--> statement-breakpoint
CREATE INDEX `chapters_previous_code_idx` ON `chapters` (`previous_code`);--> statement-breakpoint
CREATE INDEX `chapters_next_code_idx` ON `chapters` (`next_code`);--> statement-breakpoint
CREATE INDEX `chapters_code_idx` ON `chapters` (`code`);--> statement-breakpoint
CREATE INDEX `chapters_name_idx` ON `chapters` (`name`);--> statement-breakpoint
CREATE INDEX `chapters_number_idx` ON `chapters` (`number`);--> statement-breakpoint
CREATE TABLE `chapters_to_source_documents` (
	`bible_abbreviation` text NOT NULL,
	`chapter_code` text NOT NULL,
	`source_document_id` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `chapter_code`, `source_document_id`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`chapter_code`) REFERENCES `chapters`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `chapters_to_source_documents_bible_abbreviation_idx` ON `chapters_to_source_documents` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `chapters_to_source_documents_chapter_code_idx` ON `chapters_to_source_documents` (`chapter_code`);--> statement-breakpoint
CREATE INDEX `chapters_to_source_documents_source_document_id_idx` ON `chapters_to_source_documents` (`source_document_id`);--> statement-breakpoint
CREATE TABLE `chats` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text DEFAULT 'New Chat' NOT NULL,
	`custom_name` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `chats_user_id_idx` ON `chats` (`user_id`);--> statement-breakpoint
CREATE INDEX `chats_name_idx` ON `chats` (`name`);--> statement-breakpoint
CREATE TABLE `christian_tradition_approvals` (
	`tradition` text PRIMARY KEY NOT NULL,
	`framing_guide_version` text NOT NULL,
	`corpus_version` text NOT NULL,
	`test_suite_version` text NOT NULL,
	`approved_at` text NOT NULL,
	`reviewer_one_id` text NOT NULL,
	`reviewer_two_id` text NOT NULL,
	FOREIGN KEY (`reviewer_one_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`reviewer_two_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `christian_tradition_approvals_reviewer_one_idx` ON `christian_tradition_approvals` (`reviewer_one_id`);--> statement-breakpoint
CREATE INDEX `christian_tradition_approvals_reviewer_two_idx` ON `christian_tradition_approvals` (`reviewer_two_id`);--> statement-breakpoint
CREATE TABLE `data_sources` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`name` text NOT NULL,
	`url` text NOT NULL,
	`type` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`version` text DEFAULT 'unspecified' NOT NULL,
	`checksum` text,
	`rights_basis` text,
	`attribution` text,
	`tradition_classification` text DEFAULT '[]' NOT NULL,
	`approval_status` text DEFAULT 'PENDING' NOT NULL,
	`approved_at` text,
	`approved_by` text,
	`number_of_documents` integer DEFAULT 0 NOT NULL,
	`sync_schedule` text DEFAULT 'NEVER' NOT NULL,
	`last_manual_sync` text,
	`last_automatic_sync` text,
	FOREIGN KEY (`approved_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `data_sources_name_key` ON `data_sources` (`name`);--> statement-breakpoint
CREATE INDEX `data_sources_type_idx` ON `data_sources` (`type`);--> statement-breakpoint
CREATE INDEX `data_sources_metadata_idx` ON `data_sources` (`metadata`);--> statement-breakpoint
CREATE INDEX `data_sources_last_manual_sync_idx` ON `data_sources` (`last_manual_sync`);--> statement-breakpoint
CREATE INDEX `data_sources_last_automatic_sync_idx` ON `data_sources` (`last_automatic_sync`);--> statement-breakpoint
CREATE TABLE `data_sources_to_source_documents` (
	`data_source_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	PRIMARY KEY(`data_source_id`, `source_document_id`),
	FOREIGN KEY (`data_source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `data_sources_to_source_documents_data_source_id_idx` ON `data_sources_to_source_documents` (`data_source_id`);--> statement-breakpoint
CREATE INDEX `data_sources_to_source_documents_source_document_id_idx` ON `data_sources_to_source_documents` (`source_document_id`);--> statement-breakpoint
CREATE TABLE `devotion_images` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`devotion_id` text NOT NULL,
	`url` text,
	`prompt` text,
	`negative_prompt` text,
	`caption` text,
	FOREIGN KEY (`devotion_id`) REFERENCES `devotions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devotion_images_devotion_id_idx` ON `devotion_images` (`devotion_id`);--> statement-breakpoint
CREATE INDEX `devotion_images_caption_idx` ON `devotion_images` (`caption`);--> statement-breakpoint
CREATE TABLE `devotion_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`devotion_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reaction` text NOT NULL,
	`comment` text,
	FOREIGN KEY (`devotion_id`) REFERENCES `devotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devotion_reactions_unique_user_idx` ON `devotion_reactions` (`devotion_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `devotion_reactions_devotion_id_idx` ON `devotion_reactions` (`devotion_id`);--> statement-breakpoint
CREATE INDEX `devotion_reactions_user_id_idx` ON `devotion_reactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `devotion_reactions_reaction_idx` ON `devotion_reactions` (`reaction`);--> statement-breakpoint
CREATE TABLE `devotions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`topic` text DEFAULT 'general' NOT NULL,
	`bible_reading` text NOT NULL,
	`summary` text NOT NULL,
	`reflection` text NOT NULL,
	`prayer` text NOT NULL,
	`dive_deeper_queries` text DEFAULT '[]' NOT NULL,
	`publication_status` text DEFAULT 'PENDING' NOT NULL,
	`validation_errors` text DEFAULT '[]' NOT NULL,
	`failed` integer DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE INDEX `devotions_topic_idx` ON `devotions` (`topic`);--> statement-breakpoint
CREATE INDEX `devotions_created_at_idx` ON `devotions` (`created_at`);--> statement-breakpoint
CREATE INDEX `devotions_publication_status_idx` ON `devotions` (`publication_status`);--> statement-breakpoint
CREATE INDEX `devotions_failed_idx` ON `devotions` (`failed`);--> statement-breakpoint
CREATE TABLE `devotions_to_source_documents` (
	`devotion_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`distance` real DEFAULT 0 NOT NULL,
	`distance_metric` text DEFAULT 'cosine' NOT NULL,
	PRIMARY KEY(`devotion_id`, `source_document_id`),
	FOREIGN KEY (`devotion_id`) REFERENCES `devotions`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `devotions_to_source_documents_devotion_id_idx` ON `devotions_to_source_documents` (`devotion_id`);--> statement-breakpoint
CREATE INDEX `devotions_to_source_documents_source_document_id_idx` ON `devotions_to_source_documents` (`source_document_id`);--> statement-breakpoint
CREATE TABLE `forgotten_password_codes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`userId` text NOT NULL,
	`code` text NOT NULL,
	`expires_at` text NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `forgotten_password_codes_code_idx` ON `forgotten_password_codes` (`code`);--> statement-breakpoint
CREATE INDEX `forgotten_password_codes_user_id_idx` ON `forgotten_password_codes` (`userId`);--> statement-breakpoint
CREATE TABLE `index_operations` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`data_source_id` text NOT NULL,
	`status` text NOT NULL,
	`metadata` text DEFAULT '{}' NOT NULL,
	`error_messages` text DEFAULT '[]' NOT NULL,
	FOREIGN KEY (`data_source_id`) REFERENCES `data_sources`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `index_operation_data_source_id_idx` ON `index_operations` (`data_source_id`);--> statement-breakpoint
CREATE INDEX `index_operation_status_idx` ON `index_operations` (`status`);--> statement-breakpoint
CREATE INDEX `index_operation_metadata_idx` ON `index_operations` (`metadata`);--> statement-breakpoint
CREATE TABLE `message_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`message_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reaction` text NOT NULL,
	`comment` text,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `message_reactions_unique_user_idx` ON `message_reactions` (`message_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `message_reactions_message_id_idx` ON `message_reactions` (`message_id`);--> statement-breakpoint
CREATE INDEX `message_reactions_user_id_idx` ON `message_reactions` (`user_id`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`chat_id` text NOT NULL,
	`origin_message_id` text,
	`user_id` text NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`reasoning` text,
	`tool_call_id` text,
	`role` text NOT NULL,
	`data` text,
	`annotations` text,
	`tool_invocations` text,
	`finish_reason` text,
	`attachments` text,
	`parts` text,
	`anonymous` integer DEFAULT false NOT NULL,
	`regenerated` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`origin_message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`origin_message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_chat_id_idx` ON `messages` (`chat_id`);--> statement-breakpoint
CREATE INDEX `messages_user_id_idx` ON `messages` (`user_id`);--> statement-breakpoint
CREATE INDEX `messages_origin_message_id_idx` ON `messages` (`origin_message_id`);--> statement-breakpoint
CREATE INDEX `messages_role_idx` ON `messages` (`role`);--> statement-breakpoint
CREATE INDEX `messages_content_idx` ON `messages` (`content`);--> statement-breakpoint
CREATE INDEX `messages_finish_reason_idx` ON `messages` (`finish_reason`);--> statement-breakpoint
CREATE TABLE `messages_to_source_documents` (
	`message_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`distance` real DEFAULT 0 NOT NULL,
	`distance_metric` text DEFAULT 'cosine' NOT NULL,
	PRIMARY KEY(`message_id`, `source_document_id`),
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `messages_to_source_documents_message_id_idx` ON `messages_to_source_documents` (`message_id`);--> statement-breakpoint
CREATE INDEX `messages_to_source_documents_source_document_id_idx` ON `messages_to_source_documents` (`source_document_id`);--> statement-breakpoint
CREATE TABLE `passkey_credential` (
	`id` blob PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`algorithm_id` integer NOT NULL,
	`public_key` blob NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passkey_credential_user_id_idx` ON `passkey_credential` (`user_id`);--> statement-breakpoint
CREATE INDEX `passkey_credential_algorithm_id_idx` ON `passkey_credential` (`algorithm_id`);--> statement-breakpoint
CREATE TABLE `passwords` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`userId` text NOT NULL,
	`hash` text NOT NULL,
	`active` integer DEFAULT true NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passwords_user_id_idx` ON `passwords` (`userId`);--> statement-breakpoint
CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_subscriptions_endpoint_idx` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE INDEX `push_subscriptions_user_id_idx` ON `push_subscriptions` (`user_id`);--> statement-breakpoint
CREATE TABLE `queue_deliveries` (
	`key` text PRIMARY KEY NOT NULL,
	`queue` text NOT NULL,
	`message_id` text NOT NULL,
	`processed_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `queue_deliveries_queue_message_idx` ON `queue_deliveries` (`queue`,`message_id`);--> statement-breakpoint
CREATE INDEX `queue_deliveries_processed_at_idx` ON `queue_deliveries` (`processed_at`);--> statement-breakpoint
CREATE TABLE `reading_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL,
	`start_time` text NOT NULL,
	`end_time` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `reading_sessions_user_id_idx` ON `reading_sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `reading_sessions_start_time_idx` ON `reading_sessions` (`start_time`);--> statement-breakpoint
CREATE INDEX `reading_sessions_end_time_idx` ON `reading_sessions` (`end_time`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`name` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `roles_name_idx` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`userId` text NOT NULL,
	`expires_at` integer NOT NULL,
	FOREIGN KEY (`userId`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `sessions_user_id_idx` ON `sessions` (`userId`);--> statement-breakpoint
CREATE TABLE `share_chat_options` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`chat_id` text NOT NULL,
	FOREIGN KEY (`chat_id`) REFERENCES `chats`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `chat_share_options_chat_id_idx` ON `share_chat_options` (`chat_id`);--> statement-breakpoint
CREATE TABLE `source_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `user_generated_images` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text,
	`url` text,
	`user_prompt` text NOT NULL,
	`prompt` text,
	`negative_prompt` text,
	`search_queries` text DEFAULT '[]' NOT NULL,
	`failed` integer DEFAULT false NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_generated_images_user_id_idx` ON `user_generated_images` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_generated_images_message_id_idx` ON `user_generated_images` (`message_id`);--> statement-breakpoint
CREATE INDEX `user_generated_images_user_prompt_idx` ON `user_generated_images` (`user_prompt`);--> statement-breakpoint
CREATE INDEX `user_generated_images_failed_idx` ON `user_generated_images` (`failed`);--> statement-breakpoint
CREATE TABLE `user_generated_images_reactions` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_generated_image_id` text NOT NULL,
	`user_id` text NOT NULL,
	`reaction` text NOT NULL,
	`comment` text,
	FOREIGN KEY (`user_generated_image_id`) REFERENCES `user_generated_images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_generated_image_reaction_idx` ON `user_generated_images_reactions` (`user_generated_image_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `user_generated_images_reactions_user_generated_image_id_idx` ON `user_generated_images_reactions` (`user_generated_image_id`);--> statement-breakpoint
CREATE INDEX `user_generated_images_reactions_user_id_idx` ON `user_generated_images_reactions` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_generated_images_reactions_reaction_idx` ON `user_generated_images_reactions` (`reaction`);--> statement-breakpoint
CREATE TABLE `user_generated_images_to_source_documents` (
	`user_generated_image_id` text NOT NULL,
	`source_document_id` text NOT NULL,
	`distance` real DEFAULT 0 NOT NULL,
	`distance_metric` text DEFAULT 'cosine' NOT NULL,
	PRIMARY KEY(`user_generated_image_id`, `source_document_id`),
	FOREIGN KEY (`user_generated_image_id`) REFERENCES `user_generated_images`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_document_id`) REFERENCES `source_documents`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_generated_images_to_source_documents_user_generated_image_id_idx` ON `user_generated_images_to_source_documents` (`user_generated_image_id`);--> statement-breakpoint
CREATE INDEX `user_generated_images_to_source_documents_source_document_id_idx` ON `user_generated_images_to_source_documents` (`source_document_id`);--> statement-breakpoint
CREATE TABLE `user_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`user_id` text NOT NULL,
	`preferred_bible_abbreviation` text,
	`email_notifications` integer DEFAULT true NOT NULL,
	`ai_instructions` text,
	`christian_tradition` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`preferred_bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `user_settings_user_id_idx` ON `user_settings` (`user_id`);--> statement-breakpoint
CREATE INDEX `user_settings_preferred_bible_abbreviation_idx` ON `user_settings` (`preferred_bible_abbreviation`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`email` text NOT NULL,
	`first_name` text,
	`last_name` text,
	`image` text,
	`stripe_customer_id` text,
	`google_id` text,
	`apple_id` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_idx` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `users_stripe_customer_id_idx` ON `users` (`stripe_customer_id`);--> statement-breakpoint
CREATE INDEX `users_google_id_idx` ON `users` (`google_id`);--> statement-breakpoint
CREATE INDEX `users_apple_id_idx` ON `users` (`apple_id`);--> statement-breakpoint
CREATE TABLE `users_to_roles` (
	`user_id` text NOT NULL,
	`role_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `role_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `users_to_roles_user_id_idx` ON `users_to_roles` (`user_id`);--> statement-breakpoint
CREATE INDEX `users_to_roles_role_id_idx` ON `users_to_roles` (`role_id`);--> statement-breakpoint
CREATE TABLE `verse_highlights` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`bible_abbreviation` text NOT NULL,
	`verse_code` text NOT NULL,
	`user_id` text NOT NULL,
	`color` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `verse_code`, `user_id`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`verse_code`) REFERENCES `verses`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `verse_highlights_bible_abbreviation_idx` ON `verse_highlights` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `verse_highlights_verse_code_idx` ON `verse_highlights` (`verse_code`);--> statement-breakpoint
CREATE INDEX `verse_highlights_user_id_idx` ON `verse_highlights` (`user_id`);--> statement-breakpoint
CREATE TABLE `verse_notes` (
	`id` text PRIMARY KEY NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`bible_abbreviation` text NOT NULL,
	`verse_code` text NOT NULL,
	`user_id` text NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`verse_code`) REFERENCES `verses`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `verse_notes_bible_abbreviation_idx` ON `verse_notes` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `verse_notes_verse_code_idx` ON `verse_notes` (`verse_code`);--> statement-breakpoint
CREATE INDEX `verse_notes_user_id_idx` ON `verse_notes` (`user_id`);--> statement-breakpoint
CREATE TABLE `verses` (
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`bible_abbreviation` text NOT NULL,
	`book_code` text NOT NULL,
	`chapter_code` text NOT NULL,
	`previous_code` text,
	`next_code` text,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`number` integer NOT NULL,
	`content` text NOT NULL,
	PRIMARY KEY(`bible_abbreviation`, `code`),
	FOREIGN KEY (`bible_abbreviation`) REFERENCES `bibles`(`abbreviation`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`book_code`) REFERENCES `books`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`bible_abbreviation`,`chapter_code`) REFERENCES `chapters`(`bible_abbreviation`,`code`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `verses_bible_abbreviation_idx` ON `verses` (`bible_abbreviation`);--> statement-breakpoint
CREATE INDEX `verses_book_code_idx` ON `verses` (`book_code`);--> statement-breakpoint
CREATE INDEX `verses_chapter_code_idx` ON `verses` (`chapter_code`);--> statement-breakpoint
CREATE INDEX `verses_next_code_idx` ON `verses` (`next_code`);--> statement-breakpoint
CREATE INDEX `verses_code_idx` ON `verses` (`code`);--> statement-breakpoint
CREATE INDEX `verses_name_idx` ON `verses` (`name`);--> statement-breakpoint
CREATE INDEX `verses_number_idx` ON `verses` (`number`);
--> statement-breakpoint
INSERT INTO `roles` (`id`, `created_at`, `updated_at`, `name`) VALUES
	('admin', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Administrators'),
	('user', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, 'Readers')
ON CONFLICT (`id`) DO UPDATE SET
	`name` = excluded.`name`,
	`updated_at` = CURRENT_TIMESTAMP;