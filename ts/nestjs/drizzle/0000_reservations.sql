CREATE TABLE `idempotency_keys` (
	`key` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`reservation_id` text NOT NULL,
	`response` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reservation_id`) REFERENCES `reservations`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "idempotency_key_length" CHECK(length("idempotency_keys"."key") BETWEEN 1 AND 128)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idempotency_keys_reservation_id_unique` ON `idempotency_keys` (`reservation_id`);--> statement-breakpoint
CREATE TABLE `products` (
	`id` text PRIMARY KEY NOT NULL,
	`available` integer NOT NULL,
	CONSTRAINT "products_available_nonnegative" CHECK("products"."available" >= 0)
);
--> statement-breakpoint
CREATE TABLE `reservations` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE no action
);
