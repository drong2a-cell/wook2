CREATE TABLE `album_photos` (
	`id` int AUTO_INCREMENT NOT NULL,
	`albumId` int NOT NULL,
	`pairId` int NOT NULL,
	`uploaderId` int NOT NULL,
	`imageUrl` text NOT NULL,
	`imageKey` text NOT NULL,
	`aiCaption` text,
	`takenAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `album_photos_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `albums` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pairId` int NOT NULL,
	`title` varchar(100) NOT NULL,
	`coverUrl` text,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `albums_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `anniversaries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pairId` int NOT NULL,
	`title` varchar(100) NOT NULL,
	`date` timestamp NOT NULL,
	`repeatYearly` boolean NOT NULL DEFAULT true,
	`notified` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `anniversaries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `chat_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pairId` int NOT NULL,
	`senderId` int NOT NULL,
	`content` text,
	`imageUrl` text,
	`imageKey` text,
	`isRead` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `chat_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `couple_pairs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user1Id` int NOT NULL,
	`user2Id` int NOT NULL,
	`startDate` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `couple_pairs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `couple_pets` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pairId` int NOT NULL,
	`name` varchar(50) NOT NULL DEFAULT '우리 아이',
	`type` enum('cat','dog','plant','hamster') NOT NULL DEFAULT 'cat',
	`level` int NOT NULL DEFAULT 1,
	`exp` int NOT NULL DEFAULT 0,
	`hunger` int NOT NULL DEFAULT 80,
	`happiness` int NOT NULL DEFAULT 80,
	`lastFedAt` timestamp NOT NULL DEFAULT (now()),
	`lastPlayedAt` timestamp NOT NULL DEFAULT (now()),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `couple_pets_id` PRIMARY KEY(`id`),
	CONSTRAINT `couple_pets_pairId_unique` UNIQUE(`pairId`)
);
--> statement-breakpoint
CREATE TABLE `ddays` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pairId` int NOT NULL,
	`title` varchar(100) NOT NULL,
	`date` timestamp NOT NULL,
	`isMain` boolean NOT NULL DEFAULT false,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `ddays_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `housing_states` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pairId` int NOT NULL,
	`items` json NOT NULL,
	`wallColor` varchar(32) NOT NULL DEFAULT '#F5F5F0',
	`floorColor` varchar(32) NOT NULL DEFAULT '#E8E4DC',
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `housing_states_id` PRIMARY KEY(`id`),
	CONSTRAINT `housing_states_pairId_unique` UNIQUE(`pairId`)
);
--> statement-breakpoint
CREATE TABLE `invite_codes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(16) NOT NULL,
	`creatorId` int NOT NULL,
	`used` boolean NOT NULL DEFAULT false,
	`expiresAt` timestamp NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `invite_codes_id` PRIMARY KEY(`id`),
	CONSTRAINT `invite_codes_code_unique` UNIQUE(`code`)
);
--> statement-breakpoint
CREATE TABLE `locations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`pairId` int NOT NULL,
	`latitude` float NOT NULL,
	`longitude` float NOT NULL,
	`address` text,
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `locations_id` PRIMARY KEY(`id`),
	CONSTRAINT `locations_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
ALTER TABLE `users` ADD `profileBg` text;--> statement-breakpoint
ALTER TABLE `users` ADD `avatarUrl` text;