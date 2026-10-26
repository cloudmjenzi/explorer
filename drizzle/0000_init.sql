CREATE TYPE "public"."booking_status" AS ENUM('PENDING_PAYMENT', 'AWAITING_MANUAL_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'EXPIRED');--> statement-breakpoint
CREATE TYPE "public"."cancellation_policy" AS ENUM('FLEXIBLE', 'MODERATE', 'STRICT');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('GAME_DRIVE', 'MOKORO', 'BOAT_CRUISE', 'SCENIC_FLIGHT', 'WALKING_SAFARI', 'HORSEBACK', 'FISHING', 'CULTURAL', 'MULTI_DAY', 'TRANSFER', 'STAY');--> statement-breakpoint
CREATE TYPE "public"."payment_gateway" AS ENUM('DPO', 'STRIPE', 'MANUAL');--> statement-breakpoint
CREATE TYPE "public"."listing_status" AS ENUM('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'PAUSED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('CARD', 'ORANGE_MONEY', 'MYZAKA', 'SMEGA', 'BANK_TRANSFER');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');--> statement-breakpoint
CREATE TYPE "public"."payout_method" AS ENUM('BANK', 'ORANGE_MONEY', 'MYZAKA', 'SMEGA');--> statement-breakpoint
CREATE TYPE "public"."payout_status" AS ENUM('PENDING', 'PAID');--> statement-breakpoint
CREATE TYPE "public"."pricing_unit" AS ENUM('PER_PERSON', 'PER_GROUP');--> statement-breakpoint
CREATE TYPE "public"."provider_status" AS ENUM('PENDING', 'APPROVED', 'SUSPENDED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."refund_status" AS ENUM('NONE', 'DUE', 'PROCESSED');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('TOURIST', 'PROVIDER', 'ADMIN');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"actor_id" text,
	"action" text NOT NULL,
	"entity" text NOT NULL,
	"entity_id" text NOT NULL,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "blocked_dates" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"date" date NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"ref" text NOT NULL,
	"manage_token" text NOT NULL,
	"listing_id" text NOT NULL,
	"user_id" text,
	"lead_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"country" text NOT NULL,
	"date" date NOT NULL,
	"start_time" text NOT NULL,
	"guests" integer NOT NULL,
	"notes" text,
	"unit_price_thebe" integer NOT NULL,
	"total_thebe" integer NOT NULL,
	"commission_bps" integer NOT NULL,
	"commission_thebe" integer NOT NULL,
	"pay_deposit" boolean DEFAULT false NOT NULL,
	"due_now_thebe" integer NOT NULL,
	"paid_thebe" integer DEFAULT 0 NOT NULL,
	"method" "payment_method" NOT NULL,
	"status" "booking_status" NOT NULL,
	"expires_at" timestamp with time zone,
	"cancelled_at" timestamp with time zone,
	"cancel_reason" text,
	"refund_thebe" integer DEFAULT 0 NOT NULL,
	"refund_status" "refund_status" DEFAULT 'NONE' NOT NULL,
	"review_requested" boolean DEFAULT false NOT NULL,
	"payout_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "bookings_ref_unique" UNIQUE("ref"),
	CONSTRAINT "bookings_manage_token_unique" UNIQUE("manage_token")
);
--> statement-breakpoint
CREATE TABLE "listing_images" (
	"id" text PRIMARY KEY NOT NULL,
	"listing_id" text NOT NULL,
	"path" text NOT NULL,
	"alt" text NOT NULL,
	"width" integer NOT NULL,
	"height" integer NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "listings" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"region_id" text NOT NULL,
	"slug" text NOT NULL,
	"title" text NOT NULL,
	"category" "category" NOT NULL,
	"summary" text NOT NULL,
	"description" text NOT NULL,
	"highlights" text[] DEFAULT '{}' NOT NULL,
	"included" text[] DEFAULT '{}' NOT NULL,
	"excluded" text[] DEFAULT '{}' NOT NULL,
	"meeting_point" text NOT NULL,
	"duration_label" text NOT NULL,
	"price_thebe" integer NOT NULL,
	"pricing_unit" "pricing_unit" DEFAULT 'PER_PERSON' NOT NULL,
	"capacity" integer NOT NULL,
	"min_guests" integer DEFAULT 1 NOT NULL,
	"max_group_size" integer DEFAULT 8 NOT NULL,
	"start_times" text[] DEFAULT '{}' NOT NULL,
	"operating_days" integer[] DEFAULT '{0,1,2,3,4,5,6}' NOT NULL,
	"lead_time_hours" integer DEFAULT 24 NOT NULL,
	"cancellation_policy" "cancellation_policy" DEFAULT 'MODERATE' NOT NULL,
	"deposit_percent" integer DEFAULT 0 NOT NULL,
	"status" "listing_status" DEFAULT 'DRAFT' NOT NULL,
	"admin_note" text,
	"rating_avg" double precision DEFAULT 0 NOT NULL,
	"rating_count" integer DEFAULT 0 NOT NULL,
	"featured" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "listings_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"gateway" "payment_gateway" NOT NULL,
	"method" "payment_method" NOT NULL,
	"amount_thebe" integer NOT NULL,
	"currency" text NOT NULL,
	"amount_minor" integer NOT NULL,
	"status" "payment_status" DEFAULT 'PENDING' NOT NULL,
	"external_ref" text,
	"payer_ref" text,
	"confirmed_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payouts" (
	"id" text PRIMARY KEY NOT NULL,
	"provider_id" text NOT NULL,
	"amount_thebe" integer NOT NULL,
	"status" "payout_status" DEFAULT 'PENDING' NOT NULL,
	"reference" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"paid_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"business_name" text NOT NULL,
	"slug" text NOT NULL,
	"about" text NOT NULL,
	"phone" text NOT NULL,
	"whatsapp" text,
	"email" text NOT NULL,
	"region_id" text NOT NULL,
	"licence_number" text NOT NULL,
	"cipa_number" text,
	"status" "provider_status" DEFAULT 'PENDING' NOT NULL,
	"commission_bps" integer DEFAULT 1500 NOT NULL,
	"payout_method" "payout_method" DEFAULT 'BANK' NOT NULL,
	"payout_details" text DEFAULT '' NOT NULL,
	"admin_note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	CONSTRAINT "providers_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "regions" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"summary" text NOT NULL,
	"best_time" text NOT NULL,
	"gateway" text NOT NULL,
	"lon" double precision NOT NULL,
	"lat" double precision NOT NULL,
	"sort" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "regions_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "reviews" (
	"id" text PRIMARY KEY NOT NULL,
	"booking_id" text NOT NULL,
	"listing_id" text NOT NULL,
	"author" text NOT NULL,
	"country" text NOT NULL,
	"rating" integer NOT NULL,
	"body" text NOT NULL,
	"hidden" boolean DEFAULT false NOT NULL,
	"reply" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "reviews_booking_id_unique" UNIQUE("booking_id")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"name" text NOT NULL,
	"phone" text,
	"country" text,
	"role" "role" DEFAULT 'TOURIST' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "blocked_dates" ADD CONSTRAINT "blocked_dates_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_payout_id_payouts_id_fk" FOREIGN KEY ("payout_id") REFERENCES "public"."payouts"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listing_images" ADD CONSTRAINT "listing_images_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "listings" ADD CONSTRAINT "listings_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "providers" ADD CONSTRAINT "providers_region_id_regions_id_fk" FOREIGN KEY ("region_id") REFERENCES "public"."regions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_listing_id_listings_id_fk" FOREIGN KEY ("listing_id") REFERENCES "public"."listings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_entity_idx" ON "audit_logs" USING btree ("entity","entity_id");--> statement-breakpoint
CREATE UNIQUE INDEX "blocked_dates_listing_date" ON "blocked_dates" USING btree ("listing_id","date");--> statement-breakpoint
CREATE INDEX "bookings_listing_date_idx" ON "bookings" USING btree ("listing_id","date");--> statement-breakpoint
CREATE INDEX "bookings_email_idx" ON "bookings" USING btree ("email");--> statement-breakpoint
CREATE INDEX "bookings_status_idx" ON "bookings" USING btree ("status");--> statement-breakpoint
CREATE INDEX "listings_browse_idx" ON "listings" USING btree ("status","region_id","category");--> statement-breakpoint
CREATE INDEX "payments_external_idx" ON "payments" USING btree ("external_ref");--> statement-breakpoint
CREATE INDEX "reviews_listing_idx" ON "reviews" USING btree ("listing_id");--> statement-breakpoint
CREATE INDEX "sessions_user_idx" ON "sessions" USING btree ("user_id");