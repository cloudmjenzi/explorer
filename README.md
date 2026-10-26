# Explorer Botswana

A booking marketplace for tours and activities across Botswana. Travellers book and pay online; licensed local operators list experiences, manage their calendar and get paid out; an admin team approves operators and listings, confirms mobile money payments, handles refunds and runs payouts.

Built with Next.js 16, PostgreSQL 16 and Drizzle ORM. Deploys as a Docker Compose stack on a single VM with automatic HTTPS.

## What's in it

**Travellers**
- Browse by region (interactive Botswana map), category, price and keyword
- Experience pages with photos, itinerary, inclusions, cancellation policy, operator licence and verified reviews
- Live availability calendar and start times, with capacity enforced per departure (no double-booking: concurrent bookings for the same departure are serialised in the database)
- Checkout as a guest or with an account; pay in full or by deposit where the operator allows it
- Card payment through **DPO Pay** (or Stripe), or **Orange Money / MyZaka / Smega / EFT** with a held reservation
- Booking page from the emailed link: status, payment instructions, WhatsApp the operator, self-service cancellation with the exact refund shown first
- Reviews only from guests whose trip took place
- Prices in pula with optional approximate USD / EUR / GBP / ZAR

**Operators**
- Apply with BTO licence, CIPA number and payout details
- Create listings with up to 12 photos (re-encoded to WebP, GPS metadata stripped), per-person or per-group pricing, days, start times, lead time, cancellation policy and deposit option
- Block dates, see upcoming guests with "collect on the day" balances, cancel with automatic full refund
- Earnings: owed now, due after upcoming trips, payout history; reply to reviews

**Admin**
- To-do queue: manual payments to check, refunds due, operators and listings to review
- Approve, reject or suspend operators; set commission per operator
- Approve, send back, unpublish or feature listings
- Confirm mobile money payments by transaction ID (duplicate IDs rejected), cancel with refund, mark refunds processed (Stripe refunds are automatic)
- Payout batches per operator, mark paid with bank reference, CSV export
- Hide reviews, manage user roles; every sensitive action is written to an audit log

## Money rules

- Prices are stored in thebe (integer cents of pula). No floating-point money.
- Commission defaults to 15% (`DEFAULT_COMMISSION_BPS`) and is snapshotted on each booking.
- A deposit must at least cover the commission, so the platform is never owed money by an operator. The guest pays the balance to the operator on the day.
- Operator payout = paid online − refunds − commission. Commission on refunded amounts is waived.
- Cancellation policies: Flexible (24h), Moderate (7 days full / 48h half), Strict (30 days full / 14 days half), in Botswana time. Operator or admin cancellations always refund in full.

These rules are covered by unit tests in `tests/`.

## Run locally

```bash
cp .env.example .env          # set DATABASE_URL to a local Postgres, APP_URL=http://localhost:3000
npm install
npm run db:migrate
ADMIN_EMAIL=you@example.com ADMIN_PASSWORD='a-long-password' npm run seed
npm run seed:demo             # optional fictional operators and listings (never in production)
npm run dev
```

With no `SMTP_URL`, emails are printed to the server log. With `CARD_GATEWAY=none`, only the manual payment methods you fill in are offered.

`npm test` runs the unit tests. `npm run typecheck` checks types.

## Deploy to a VM

Requirements: a Linux VM with Docker and the Compose plugin, ports 80 and 443 open, and a DNS A record for your domain pointing at it.

Every push to `main` is tested, built into a Docker image and published to `ghcr.io/cloudmjenzi/explorer` by GitHub Actions (`.github/workflows/docker.yml`), then the image is booted against Postgres and smoke-tested. The VM only pulls it.

```bash
git clone https://github.com/cloudmjenzi/explorer.git && cd explorer
cp .env.example .env && nano .env      # fill every value, see LAUNCH.md
echo <github-token-with-read:packages> | docker login ghcr.io -u <github-user> --password-stdin   # only if the package is private
docker compose pull
docker compose up -d
docker compose exec -e ADMIN_EMAIL=you@example.com -e ADMIN_PASSWORD='long passphrase' app node scripts/seed.cjs
```

No registry access? `docker compose up -d --build` builds the image on the VM instead.

That gives you:

| Service | What it does |
| --- | --- |
| `caddy` | HTTPS with automatic Let's Encrypt certificates, compression, blocks the cron URL from the internet |
| `app` | The web app. Applies database migrations on start. Photos stored in the `uploads` volume |
| `db` | PostgreSQL 16 in the `pgdata` volume |
| `cron` | Hourly: expires unpaid holds, marks past trips complete, sends review requests |
| `backup` | Nightly database dump and photo archive to `./backups`, kept 14 days. Copy these off the VM |

Update: `git pull && docker compose pull && docker compose up -d`. Migrations run automatically. To roll back, set `APP_TAG=sha-<commit>` in `.env` and run the same command.

## Payments

**DPO Pay** is the default card gateway because it onboards Botswana-registered businesses and is what most Botswana tourism operators already use. Set `CARD_GATEWAY=dpo`, your `DPO_COMPANY_TOKEN` and `DPO_SERVICE_TYPE`. Payments are always verified server-to-server with `verifyToken` before a booking is confirmed; the redirect alone is never trusted, and the paid amount is checked.

**Stripe** does not onboard Botswana-registered companies. It works if you contract through an entity in a supported country (for example an Australian company), charging in USD. Set `CARD_GATEWAY=stripe`, `CHARGE_CURRENCY=USD`, the keys, and point a Stripe webhook at `https://<domain>/api/webhooks/stripe` for `checkout.session.completed`.

**Mobile money and EFT** are manual for launch: the guest gets your merchant details and their booking reference, the place is held for 24 hours, and an admin confirms once the money shows on the statement. Direct Orange Money / MyZaka API integration can replace this later without changing the booking model.

## Project layout

```
src/app/            pages and routes (public, /provider, /admin, /api)
src/app/actions/    server actions (all writes go through these, each checks the session and ownership)
src/lib/            bookings, payments, money, refunds, email, auth, uploads
src/db/             schema, regions, migrations runner
drizzle/            SQL migrations
scripts/            migrate, seed, seed-demo
tests/              unit tests for money, refunds and Botswana time
deploy/Caddyfile    reverse proxy config
```

Schema changes: edit `src/db/schema.ts`, run `npm run db:generate`, commit the new file in `drizzle/`.
