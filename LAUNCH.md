# Launch checklist

Work through these in order. Items marked **blocker** must be done before the first real booking.

## Business and legal

- [ ] **Blocker.** Company that will collect money: a Botswana (Pty) Ltd registered with CIPA, with a business bank account. Set `COMPANY_LEGAL_NAME`.
- [ ] **Blocker.** Have a Botswana attorney review the booking terms, privacy notice, operator terms and cancellation page (`src/app/legal/[page]/page.tsx`). They are written for this model but are a starting point, not legal advice.
- [ ] Check whether you need your own BTO licence as a booking agent / tour operator intermediary, and register with the Information and Data Protection Commission as a data controller.
- [ ] VAT: confirm with BURS whether you must register and whether commission invoices to operators carry VAT.
- [ ] Operator agreement signed (or accepted in-app) by each launch operator, and a copy of each BTO licence on file.

## Payments

- [ ] **Blocker.** DPO Pay merchant account approved. Put `DPO_COMPANY_TOKEN` and `DPO_SERVICE_TYPE` in `.env`, set `CARD_GATEWAY=dpo`.
- [ ] Run one live card booking for a small amount end to end, then refund it from the DPO portal and mark it refunded in admin.
- [ ] **Blocker.** Orange Money / MyZaka / Smega merchant numbers and the EFT account details in `PAY_*`. Leave any method you don't have blank and it disappears from checkout.
- [ ] Decide who checks the merchant statements for manual payments, and how often (at least twice a day in season).
- [ ] Decide the payout day (the operator terms say weekly) and who runs it.

## Infrastructure

- [ ] **Blocker.** VM with Docker, ports 80/443 open, domain A record pointing at it. `SITE_DOMAIN` and `APP_URL` set (`APP_URL` must be `https://`).
- [ ] **Blocker.** Strong `POSTGRES_PASSWORD` and `CRON_SECRET` (`openssl rand -hex 32`).
- [ ] **Blocker.** SMTP working (`SMTP_URL`, `MAIL_FROM`), with SPF and DKIM set on the sending domain so confirmations don't land in spam. Send yourself a test booking and check the inbox, not just the log.
- [ ] `ADMIN_NOTIFY_EMAIL` set to an inbox someone watches.
- [ ] Copy `./backups` off the VM nightly (rclone to object storage, or another VM). Test a restore once.
- [ ] Create the first admin with `scripts/seed.cjs`. Do **not** run `seed-demo` on production.
- [ ] Uptime check on `https://<domain>/api/health`.

## Content

- [ ] At least 10 approved operators with real photos (the illustrated placeholders are for empty listings only).
- [ ] Each listing checked for: correct park fees, meeting point that a tourist can find, realistic start times, water-season notes for mokoro trips.
- [ ] Update `DISPLAY_RATES` with current exchange rates, and set a monthly reminder.
- [ ] Support WhatsApp number in `SUPPORT_WHATSAPP`.

## Go live

- [ ] Book one of each experience type yourself with real money and cancel one.
- [ ] Ask two launch operators to log in and process a booking from their phone.
- [ ] Submit `https://<domain>/sitemap.xml` to Google Search Console.
