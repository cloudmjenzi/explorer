import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { listings } from "@/db/schema";
import { departuresFor } from "@/lib/bookings";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const date = new URL(req.url).searchParams.get("date") ?? "";
  const [listing] = await db.select().from(listings).where(eq(listings.id, id)).limit(1);
  if (!listing || listing.status !== "PUBLISHED") return NextResponse.json({ departures: [] }, { status: 404 });
  const departures = await departuresFor(listing, date);
  return NextResponse.json({ departures }, { headers: { "Cache-Control": "no-store" } });
}
