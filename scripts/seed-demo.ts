/**
 * DEMO DATA for local testing and staging only. Never run against production.
 * Creates fictional operators (all names prefixed "Demo"), listings and a few bookings.
 *   npm run seed:demo
 */
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import * as s from "../src/db/schema";
import { bookingRef, secureToken } from "../src/lib/ids";
import { addDays, todayInBotswana } from "../src/lib/dates";

if (process.env.NODE_ENV === "production" && process.env.ALLOW_DEMO !== "1") {
  console.error("Refusing to seed demo data in production.");
  process.exit(1);
}

type L = Omit<typeof s.listings.$inferInsert, "providerId" | "regionId" | "slug"> & { region: string };

const OPERATORS: {
  key: string;
  name: string;
  region: string;
  about: string;
  listings: L[];
}[] = [
  {
    key: "polers",
    name: "Demo Boro Polers Trust",
    region: "okavango-delta",
    about:
      "A community trust of licensed polers from Boro and Xharaxao villages. Every trip is led by a poler who grew up on these channels, and part of each booking goes to the village fund.",
    listings: [
      {
        region: "okavango-delta",
        title: "Sunrise mokoro trip through the Boro channels",
        category: "MOKORO",
        summary: "Glide through papyrus and water lilies in a traditional dugout as the Delta wakes up, with a short guided walk on an island.",
        description:
          "We pick you up from your Maun lodge at 05:30 and drive 45 minutes to the mokoro station at Boro.\n\nYour poler guides the mokoro through narrow channels lined with papyrus, stopping for reed frogs, malachite kingfishers and, often, elephants crossing the water. Mid-morning we land on an island for a walk to read tracks and learn which plants the Bayei use for food and medicine.\n\nBring a hat, sunscreen and a waterproof bag for your phone. Mokoro trips depend on water levels: from November to February some channels are shallow and we may use a different station.",
        highlights: ["Two hours in a traditional mokoro", "Island walk with a poler who reads tracks", "Village fund supported by every booking"],
        included: ["Return transfer from Maun", "Licensed poler", "Water and a snack"],
        excluded: ["Gratuities"],
        meetingPoint: "Pick-up from your lodge in Maun town",
        durationLabel: "5 hours",
        priceThebe: 95000,
        pricingUnit: "PER_PERSON",
        capacity: 10,
        maxGroupSize: 6,
        startTimes: ["05:30"],
        operatingDays: [0, 1, 2, 3, 4, 5, 6],
        leadTimeHours: 18,
        cancellationPolicy: "MODERATE",
        depositPercent: 30,
        status: "PUBLISHED",
        featured: true,
      },
      {
        region: "okavango-delta",
        title: "Two-night mokoro and fly camp in the Delta",
        category: "MULTI_DAY",
        summary: "Pole deep into the Delta, sleep in dome tents on an island, and walk at dawn with your guide. Simple, wild and quiet.",
        description:
          "Day one: transfer to the mokoro station and pole three hours to a remote island camp. Afternoon walk and sundowners.\n\nDay two: walks at dawn and dusk, time by the water at midday.\n\nDay three: morning walk and pole back to the station for the transfer to Maun.\n\nYou'll sleep in dome tents with bedrolls. Meals are cooked on the fire. Bring your own sleeping bag or hire one from us.",
        highlights: ["Two nights on an island camp", "Four guided walks", "No vehicles, no crowds"],
        included: ["Transfers", "Poler and guide", "All meals", "Tents and bedrolls", "Community and wildlife fees"],
        excluded: ["Sleeping bag hire (P100)", "Drinks other than water and tea"],
        meetingPoint: "Pick-up from your lodge in Maun town",
        durationLabel: "3 days / 2 nights",
        priceThebe: 520000,
        pricingUnit: "PER_PERSON",
        capacity: 6,
        maxGroupSize: 6,
        minGuests: 2,
        startTimes: ["07:00"],
        operatingDays: [1, 3, 5],
        leadTimeHours: 72,
        cancellationPolicy: "STRICT",
        depositPercent: 40,
        status: "PUBLISHED",
      },
    ],
  },
  {
    key: "air",
    name: "Demo Delta Air Charters",
    region: "okavango-delta",
    about: "Scenic flights over the Okavango in high-wing aircraft with window seats for everyone. Based at Maun International Airport since 2009.",
    listings: [
      {
        region: "okavango-delta",
        title: "One-hour scenic flight over the Okavango Delta",
        category: "SCENIC_FLIGHT",
        summary: "See the shape of the Delta from 500 feet: elephant herds, hippo pools and channels spreading across the Kalahari. Every seat is a window seat.",
        description:
          "Check in at the Maun airport charter terminal 30 minutes before take-off. Your pilot briefs you on the route, which changes with the flood and recent sightings.\n\nThe flight follows the Thamalakane up into the Delta's lower reaches and over the edge of Moremi. Afternoon flights have the softest light for photos.",
        highlights: ["Private aircraft, up to 5 guests", "Window seat for everyone", "Route chosen by water levels and sightings"],
        included: ["Flight with commercial pilot", "Airport taxes"],
        excluded: ["Transfers to the airport"],
        meetingPoint: "Charter terminal, Maun International Airport",
        durationLabel: "1 hour",
        priceThebe: 780000,
        pricingUnit: "PER_GROUP",
        capacity: 2,
        maxGroupSize: 5,
        startTimes: ["08:00", "11:00", "16:00"],
        operatingDays: [0, 1, 2, 3, 4, 5, 6],
        leadTimeHours: 24,
        cancellationPolicy: "MODERATE",
        depositPercent: 0,
        status: "PUBLISHED",
      },
    ],
  },
  {
    key: "chobe",
    name: "Demo Chobe Riverfront Safaris",
    region: "chobe",
    about: "A Kasane family business running small-boat cruises and open-vehicle game drives on the Chobe riverfront.",
    listings: [
      {
        region: "chobe",
        title: "Sunset boat cruise on the Chobe River",
        category: "BOAT_CRUISE",
        summary: "Elephants swimming, hippos, crocodiles and fish eagles from a small boat with eight guests at most, ending with sunset over Namibia.",
        description:
          "We leave from the Kasane jetty at 15:00 and spend three hours on the river inside Chobe National Park.\n\nOur boats carry eight guests, so everyone gets a clear view and we can get closer than the big double-deckers. In the dry season, herds of hundreds of elephants come to drink and swim across to Sedudu Island.",
        highlights: ["Small boat, maximum 8 guests", "Elephants at the river in the dry season", "Sunset over the floodplain"],
        included: ["Guide and boat", "Park entry fees", "Soft drinks and water"],
        excluded: ["Alcoholic drinks", "Hotel transfers outside Kasane"],
        meetingPoint: "Kasane public jetty, next to the immigration office",
        durationLabel: "3 hours",
        priceThebe: 68000,
        pricingUnit: "PER_PERSON",
        capacity: 16,
        maxGroupSize: 8,
        startTimes: ["15:00"],
        operatingDays: [0, 1, 2, 3, 4, 5, 6],
        leadTimeHours: 6,
        cancellationPolicy: "FLEXIBLE",
        depositPercent: 0,
        status: "PUBLISHED",
        featured: true,
      },
      {
        region: "chobe",
        title: "Morning game drive on the Chobe riverfront",
        category: "GAME_DRIVE",
        summary: "Look for lion, leopard and sable on the riverfront tracks in an open vehicle while it's cool and the predators are moving.",
        description:
          "We collect you from your Kasane lodge at 06:00 and enter the park as the gates open. Mornings are the best time for predators.\n\nCoffee and rusks at a riverside viewpoint mid-way.",
        highlights: ["First into the park at gate opening", "Open 4x4 with a window seat for everyone", "Coffee stop on the river"],
        included: ["Guide and vehicle", "Park entry fees", "Coffee and rusks"],
        excluded: ["Gratuities"],
        meetingPoint: "Pick-up from lodges in Kasane and Kazungula",
        durationLabel: "3.5 hours",
        priceThebe: 72000,
        pricingUnit: "PER_PERSON",
        capacity: 9,
        maxGroupSize: 9,
        startTimes: ["06:00"],
        operatingDays: [0, 1, 2, 3, 4, 5, 6],
        leadTimeHours: 12,
        cancellationPolicy: "FLEXIBLE",
        depositPercent: 0,
        status: "PUBLISHED",
      },
    ],
  },
  {
    key: "kalahari",
    name: "Demo Ghanzi Trackers",
    region: "ghanzi",
    about: "San-owned guiding outfit near D'Kar. Walks are led by Ju/'hoansi and Naro trackers in their own language, with interpretation.",
    listings: [
      {
        region: "ghanzi",
        title: "Bushwalk with San trackers near D'Kar",
        category: "CULTURAL",
        summary: "Walk the Kalahari with San guides who show how they find water, track animals and gather food, in their own words.",
        description:
          "Meet at our base outside D'Kar village. The walk is about 2 km at an easy pace.\n\nYour guides will show you how to dig for water roots, set a traditional snare (released after) and read tracks in the sand. Afterwards there's time at the craft centre, where you can buy direct from the makers.",
        highlights: ["Led by San guides", "Tracking, plants and survival skills", "Craft centre visit"],
        included: ["Guides and interpreter", "Community fee", "Water"],
        excluded: ["Crafts"],
        meetingPoint: "Ghanzi Trackers base, 2 km north of D'Kar on the A3",
        durationLabel: "3 hours",
        priceThebe: 45000,
        pricingUnit: "PER_PERSON",
        capacity: 12,
        maxGroupSize: 12,
        startTimes: ["07:30", "15:30"],
        operatingDays: [1, 2, 3, 4, 5, 6],
        leadTimeHours: 24,
        cancellationPolicy: "FLEXIBLE",
        depositPercent: 0,
        status: "PUBLISHED",
      },
    ],
  },
  {
    key: "pending",
    name: "Demo Nata Pan Adventures",
    region: "makgadikgadi",
    about: "New operator waiting for approval. Used to test the review queue.",
    listings: [
      {
        region: "makgadikgadi",
        title: "Quad bikes and sleep-out on Ntwetwe Pan",
        category: "MULTI_DAY",
        summary: "Ride out onto the salt pan, sleep under the stars on bedrolls, and ride back at sunrise.",
        description:
          "An overnight trip onto Ntwetwe Pan in the dry season. Quad bikes, dinner around the fire and a night on bedrolls in the middle of the pan, with no light pollution for a hundred kilometres in every direction.",
        highlights: ["Night on the pan", "Quad bikes", "Star-gazing"],
        included: ["Quad bikes", "Guide", "Dinner and breakfast", "Bedrolls"],
        excluded: ["Drinks"],
        meetingPoint: "Gweta village",
        durationLabel: "Overnight",
        priceThebe: 310000,
        pricingUnit: "PER_PERSON",
        capacity: 8,
        maxGroupSize: 8,
        startTimes: ["15:00"],
        operatingDays: [0, 2, 4, 6],
        leadTimeHours: 48,
        cancellationPolicy: "MODERATE",
        depositPercent: 30,
        status: "PENDING_REVIEW",
      },
    ],
  },
];

async function main() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema: s });
  const regions = new Map((await db.select().from(s.regions)).map((r) => [r.slug, r.id]));
  if (!regions.size) throw new Error("Run `npm run seed` first to create regions.");
  const hash = await bcrypt.hash("demo-password-123", 10);

  const touristEmail = "guest@demo.test";
  let [tourist] = await db.select().from(s.users).where(eq(s.users.email, touristEmail));
  if (!tourist) [tourist] = await db.insert(s.users).values({ email: touristEmail, name: "Anna Demo", country: "Germany", passwordHash: hash }).returning();

  const created: { listingId: string; title: string }[] = [];
  for (const op of OPERATORS) {
    const email = `${op.key}@demo.test`;
    const existing = await db.select().from(s.users).where(eq(s.users.email, email));
    if (existing.length) {
      console.log(`skip ${op.name} (exists)`);
      continue;
    }
    const [u] = await db.insert(s.users).values({ email, name: op.name, role: "PROVIDER", passwordHash: hash }).returning();
    const approved = op.key !== "pending";
    const [p] = await db
      .insert(s.providers)
      .values({
        userId: u.id,
        businessName: op.name,
        slug: op.key + "-demo",
        about: op.about,
        phone: "+267 71 000 000",
        whatsapp: "+26771000000",
        email,
        regionId: regions.get(op.region)!,
        licenceNumber: `DEMO-${op.key.toUpperCase()}-001`,
        status: approved ? "APPROVED" : "PENDING",
        approvedAt: approved ? new Date() : null,
        payoutMethod: "BANK",
        payoutDetails: "Demo Bank, branch 000, acc 000000",
      })
      .returning();
    for (const l of op.listings) {
      const { region, ...rest } = l;
      const [row] = await db
        .insert(s.listings)
        .values({ ...rest, providerId: p.id, regionId: regions.get(region)!, slug: `${l.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 60)}-demo` })
        .returning();
      created.push({ listingId: row.id, title: row.title });
    }
    console.log(`created ${op.name}`);
  }

  // A completed booking with a review, and an upcoming confirmed one.
  const mokoro = created.find((c) => c.title.startsWith("Sunrise mokoro"));
  const cruise = created.find((c) => c.title.startsWith("Sunset boat"));
  const today = todayInBotswana();
  if (mokoro) {
    const [past] = await db
      .insert(s.bookings)
      .values({
        ref: bookingRef(), manageToken: secureToken(), listingId: mokoro.listingId, userId: tourist.id,
        leadName: "Anna Demo", email: touristEmail, phone: "+49 151 000000", country: "Germany",
        date: addDays(today, -6), startTime: "05:30", guests: 2, unitPriceThebe: 95000, totalThebe: 190000,
        commissionBps: 1500, commissionThebe: 28500, payDeposit: false, dueNowThebe: 190000, paidThebe: 190000,
        method: "CARD", status: "COMPLETED", reviewRequested: true,
      })
      .returning();
    await db.insert(s.reviews).values({
      bookingId: past.id, listingId: mokoro.listingId, author: "Anna", country: "Germany", rating: 5,
      body: "Our poler Kago spotted a family of elephants crossing ten metres ahead and stopped so we could watch in silence. Pick-up was on time and the island walk was the highlight.",
    });
    await db.update(s.listings).set({ ratingAvg: 5, ratingCount: 1 }).where(eq(s.listings.id, mokoro.listingId));
  }
  if (cruise) {
    await db.insert(s.bookings).values({
      ref: bookingRef(), manageToken: secureToken(), listingId: cruise.listingId, userId: tourist.id,
      leadName: "Anna Demo", email: touristEmail, phone: "+49 151 000000", country: "Germany",
      date: addDays(today, 5), startTime: "15:00", guests: 2, unitPriceThebe: 68000, totalThebe: 136000,
      commissionBps: 1500, commissionThebe: 20400, payDeposit: false, dueNowThebe: 136000, paidThebe: 136000,
      method: "CARD", status: "CONFIRMED",
    });
  }
  console.log("Demo logins (password demo-password-123): guest@demo.test, polers@demo.test, chobe@demo.test, pending@demo.test");
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
