import {
  pgTable,
  pgEnum,
  text,
  integer,
  boolean,
  timestamp,
  date,
  doublePrecision,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createId } from "@/lib/ids";

export const roleEnum = pgEnum("role", ["TOURIST", "PROVIDER", "ADMIN"]);
export const providerStatusEnum = pgEnum("provider_status", ["PENDING", "APPROVED", "SUSPENDED", "REJECTED"]);
export const listingStatusEnum = pgEnum("listing_status", ["DRAFT", "PENDING_REVIEW", "PUBLISHED", "PAUSED", "REJECTED"]);
export const categoryEnum = pgEnum("category", [
  "GAME_DRIVE",
  "MOKORO",
  "BOAT_CRUISE",
  "SCENIC_FLIGHT",
  "WALKING_SAFARI",
  "HORSEBACK",
  "FISHING",
  "CULTURAL",
  "MULTI_DAY",
  "TRANSFER",
  "STAY",
]);
export const pricingUnitEnum = pgEnum("pricing_unit", ["PER_PERSON", "PER_GROUP"]);
export const cancellationEnum = pgEnum("cancellation_policy", ["FLEXIBLE", "MODERATE", "STRICT"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "PENDING_PAYMENT",
  "AWAITING_MANUAL_PAYMENT",
  "CONFIRMED",
  "COMPLETED",
  "CANCELLED",
  "EXPIRED",
]);
export const paymentMethodEnum = pgEnum("payment_method", ["CARD", "ORANGE_MONEY", "MYZAKA", "SMEGA", "BANK_TRANSFER"]);
export const gatewayEnum = pgEnum("payment_gateway", ["DPO", "STRIPE", "MANUAL"]);
export const paymentStatusEnum = pgEnum("payment_status", ["PENDING", "SUCCEEDED", "FAILED", "REFUNDED"]);
export const payoutMethodEnum = pgEnum("payout_method", ["BANK", "ORANGE_MONEY", "MYZAKA", "SMEGA"]);
export const payoutStatusEnum = pgEnum("payout_status", ["PENDING", "PAID"]);
export const refundStatusEnum = pgEnum("refund_status", ["NONE", "DUE", "PROCESSED"]);

const id = () => text("id").primaryKey().$defaultFn(createId);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const users = pgTable("users", {
  id: id(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  country: text("country"),
  role: roleEnum("role").notNull().default("TOURIST"),
  createdAt: createdAt(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: text("id").primaryKey(), // sha256 of the cookie token
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("sessions_user_idx").on(t.userId)],
);

export const regions = pgTable("regions", {
  id: id(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  summary: text("summary").notNull(),
  bestTime: text("best_time").notNull(),
  gateway: text("gateway").notNull(),
  lon: doublePrecision("lon").notNull(),
  lat: doublePrecision("lat").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const providers = pgTable("providers", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: "cascade" }),
  businessName: text("business_name").notNull(),
  slug: text("slug").notNull().unique(),
  about: text("about").notNull(),
  phone: text("phone").notNull(),
  whatsapp: text("whatsapp"),
  email: text("email").notNull(),
  regionId: text("region_id")
    .notNull()
    .references(() => regions.id),
  licenceNumber: text("licence_number").notNull(),
  cipaNumber: text("cipa_number"),
  status: providerStatusEnum("status").notNull().default("PENDING"),
  commissionBps: integer("commission_bps").notNull().default(1500),
  payoutMethod: payoutMethodEnum("payout_method").notNull().default("BANK"),
  payoutDetails: text("payout_details").notNull().default(""),
  adminNote: text("admin_note"),
  createdAt: createdAt(),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
});

export const listings = pgTable(
  "listings",
  {
    id: id(),
    providerId: text("provider_id")
      .notNull()
      .references(() => providers.id, { onDelete: "cascade" }),
    regionId: text("region_id")
      .notNull()
      .references(() => regions.id),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    category: categoryEnum("category").notNull(),
    summary: text("summary").notNull(),
    description: text("description").notNull(),
    highlights: text("highlights").array().notNull().default([]),
    included: text("included").array().notNull().default([]),
    excluded: text("excluded").array().notNull().default([]),
    meetingPoint: text("meeting_point").notNull(),
    durationLabel: text("duration_label").notNull(),
    priceThebe: integer("price_thebe").notNull(),
    pricingUnit: pricingUnitEnum("pricing_unit").notNull().default("PER_PERSON"),
    capacity: integer("capacity").notNull(),
    minGuests: integer("min_guests").notNull().default(1),
    maxGroupSize: integer("max_group_size").notNull().default(8),
    startTimes: text("start_times").array().notNull().default([]),
    operatingDays: integer("operating_days").array().notNull().default([0, 1, 2, 3, 4, 5, 6]),
    leadTimeHours: integer("lead_time_hours").notNull().default(24),
    cancellationPolicy: cancellationEnum("cancellation_policy").notNull().default("MODERATE"),
    depositPercent: integer("deposit_percent").notNull().default(0),
    status: listingStatusEnum("status").notNull().default("DRAFT"),
    adminNote: text("admin_note"),
    ratingAvg: doublePrecision("rating_avg").notNull().default(0),
    ratingCount: integer("rating_count").notNull().default(0),
    featured: boolean("featured").notNull().default(false),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("listings_browse_idx").on(t.status, t.regionId, t.category)],
);

export const listingImages = pgTable("listing_images", {
  id: id(),
  listingId: text("listing_id")
    .notNull()
    .references(() => listings.id, { onDelete: "cascade" }),
  path: text("path").notNull(),
  alt: text("alt").notNull(),
  width: integer("width").notNull(),
  height: integer("height").notNull(),
  sort: integer("sort").notNull().default(0),
});

export const blockedDates = pgTable(
  "blocked_dates",
  {
    id: id(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    reason: text("reason"),
  },
  (t) => [uniqueIndex("blocked_dates_listing_date").on(t.listingId, t.date)],
);

export const payouts = pgTable("payouts", {
  id: id(),
  providerId: text("provider_id")
    .notNull()
    .references(() => providers.id),
  amountThebe: integer("amount_thebe").notNull(),
  status: payoutStatusEnum("status").notNull().default("PENDING"),
  reference: text("reference"),
  createdAt: createdAt(),
  paidAt: timestamp("paid_at", { withTimezone: true }),
});

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    ref: text("ref").notNull().unique(),
    manageToken: text("manage_token").notNull().unique(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    leadName: text("lead_name").notNull(),
    email: text("email").notNull(),
    phone: text("phone").notNull(),
    country: text("country").notNull(),
    date: date("date").notNull(),
    startTime: text("start_time").notNull(),
    guests: integer("guests").notNull(),
    notes: text("notes"),
    unitPriceThebe: integer("unit_price_thebe").notNull(),
    totalThebe: integer("total_thebe").notNull(),
    commissionBps: integer("commission_bps").notNull(),
    commissionThebe: integer("commission_thebe").notNull(),
    payDeposit: boolean("pay_deposit").notNull().default(false),
    dueNowThebe: integer("due_now_thebe").notNull(),
    paidThebe: integer("paid_thebe").notNull().default(0),
    method: paymentMethodEnum("method").notNull(),
    status: bookingStatusEnum("status").notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    cancelReason: text("cancel_reason"),
    refundThebe: integer("refund_thebe").notNull().default(0),
    refundStatus: refundStatusEnum("refund_status").notNull().default("NONE"),
    reviewRequested: boolean("review_requested").notNull().default(false),
    payoutId: text("payout_id").references(() => payouts.id),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    index("bookings_listing_date_idx").on(t.listingId, t.date),
    index("bookings_email_idx").on(t.email),
    index("bookings_status_idx").on(t.status),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    bookingId: text("booking_id")
      .notNull()
      .references(() => bookings.id, { onDelete: "cascade" }),
    gateway: gatewayEnum("gateway").notNull(),
    method: paymentMethodEnum("method").notNull(),
    amountThebe: integer("amount_thebe").notNull(),
    currency: text("currency").notNull(),
    amountMinor: integer("amount_minor").notNull(),
    status: paymentStatusEnum("status").notNull().default("PENDING"),
    externalRef: text("external_ref"),
    payerRef: text("payer_ref"),
    confirmedBy: text("confirmed_by"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("payments_external_idx").on(t.externalRef)],
);

export const reviews = pgTable(
  "reviews",
  {
    id: id(),
    bookingId: text("booking_id")
      .notNull()
      .unique()
      .references(() => bookings.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    author: text("author").notNull(),
    country: text("country").notNull(),
    rating: integer("rating").notNull(),
    body: text("body").notNull(),
    hidden: boolean("hidden").notNull().default(false),
    reply: text("reply"),
    createdAt: createdAt(),
  },
  (t) => [index("reviews_listing_idx").on(t.listingId)],
);

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: id(),
    actorId: text("actor_id"),
    action: text("action").notNull(),
    entity: text("entity").notNull(),
    entityId: text("entity_id").notNull(),
    meta: jsonb("meta"),
    createdAt: createdAt(),
  },
  (t) => [index("audit_entity_idx").on(t.entity, t.entityId)],
);

// Relations (for the relational query API)
export const usersRelations = relations(users, ({ one, many }) => ({
  provider: one(providers, { fields: [users.id], references: [providers.userId] }),
  bookings: many(bookings),
}));

export const regionsRelations = relations(regions, ({ many }) => ({
  listings: many(listings),
  providers: many(providers),
}));

export const providersRelations = relations(providers, ({ one, many }) => ({
  user: one(users, { fields: [providers.userId], references: [users.id] }),
  region: one(regions, { fields: [providers.regionId], references: [regions.id] }),
  listings: many(listings),
  payouts: many(payouts),
}));

export const listingsRelations = relations(listings, ({ one, many }) => ({
  provider: one(providers, { fields: [listings.providerId], references: [providers.id] }),
  region: one(regions, { fields: [listings.regionId], references: [regions.id] }),
  images: many(listingImages),
  blockedDates: many(blockedDates),
  bookings: many(bookings),
  reviews: many(reviews),
}));

export const listingImagesRelations = relations(listingImages, ({ one }) => ({
  listing: one(listings, { fields: [listingImages.listingId], references: [listings.id] }),
}));

export const blockedDatesRelations = relations(blockedDates, ({ one }) => ({
  listing: one(listings, { fields: [blockedDates.listingId], references: [listings.id] }),
}));

export const bookingsRelations = relations(bookings, ({ one, many }) => ({
  listing: one(listings, { fields: [bookings.listingId], references: [listings.id] }),
  user: one(users, { fields: [bookings.userId], references: [users.id] }),
  payout: one(payouts, { fields: [bookings.payoutId], references: [payouts.id] }),
  payments: many(payments),
  review: one(reviews, { fields: [bookings.id], references: [reviews.bookingId] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  booking: one(bookings, { fields: [payments.bookingId], references: [bookings.id] }),
}));

export const reviewsRelations = relations(reviews, ({ one }) => ({
  booking: one(bookings, { fields: [reviews.bookingId], references: [bookings.id] }),
  listing: one(listings, { fields: [reviews.listingId], references: [listings.id] }),
}));

export const payoutsRelations = relations(payouts, ({ one, many }) => ({
  provider: one(providers, { fields: [payouts.providerId], references: [providers.id] }),
  bookings: many(bookings),
}));

export type User = typeof users.$inferSelect;
export type Provider = typeof providers.$inferSelect;
export type Listing = typeof listings.$inferSelect;
export type Region = typeof regions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ListingImage = typeof listingImages.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Category = (typeof categoryEnum.enumValues)[number];
export type PaymentMethod = (typeof paymentMethodEnum.enumValues)[number];
export type BookingStatus = (typeof bookingStatusEnum.enumValues)[number];
export type CancellationPolicy = (typeof cancellationEnum.enumValues)[number];
