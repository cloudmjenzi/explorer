import Link from "next/link";
import { config } from "@/lib/config";
import { setCurrency } from "@/app/actions/session";
import { displayCurrency } from "@/lib/currency";
import { DISPLAY_CURRENCIES } from "@/lib/money";
import { CurrencySelect } from "./CurrencySelect";

export async function Footer() {
  const cur = await displayCurrency();
  return (
    <footer className="mt-20 border-t border-line bg-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold">{config.appName}</p>
          <p className="mt-2 text-[14px] text-ink-2">
            Bookings with licensed Botswana operators. Prices in pula, paid securely by card or mobile money.
          </p>
        </div>
        <div className="text-[15px]">
          <p className="mb-2 font-bold">Travellers</p>
          <ul className="space-y-1.5 text-ink-2">
            <li><Link href="/explore" className="hover:text-delta">All experiences</Link></li>
            <li><Link href="/regions" className="hover:text-delta">Regions</Link></li>
            <li><Link href="/trips" className="hover:text-delta">Find my booking</Link></li>
            <li><Link href="/legal/cancellation" className="hover:text-delta">Cancellations and refunds</Link></li>
          </ul>
        </div>
        <div className="text-[15px]">
          <p className="mb-2 font-bold">Operators</p>
          <ul className="space-y-1.5 text-ink-2">
            <li><Link href="/partners" className="hover:text-delta">List your business</Link></li>
            <li><Link href="/provider" className="hover:text-delta">Operator dashboard</Link></li>
            <li><Link href="/legal/operator-terms" className="hover:text-delta">Operator terms</Link></li>
          </ul>
        </div>
        <div className="text-[15px]">
          <p className="mb-2 font-bold">Help</p>
          <ul className="space-y-1.5 text-ink-2">
            <li><a href={`mailto:${config.supportEmail}`} className="hover:text-delta">{config.supportEmail}</a></li>
            {config.supportWhatsapp && (
              <li>
                <a href={`https://wa.me/${config.supportWhatsapp.replace(/\D/g, "")}`} className="hover:text-delta">
                  WhatsApp {config.supportWhatsapp}
                </a>
              </li>
            )}
            <li><Link href="/legal/terms" className="hover:text-delta">Terms</Link></li>
            <li><Link href="/legal/privacy" className="hover:text-delta">Privacy</Link></li>
          </ul>
          <form action={setCurrency} className="mt-4">
            <label htmlFor="currency" className="mb-1 block text-[13px] text-ink-2">Show prices also in</label>
            <CurrencySelect current={cur} options={[...DISPLAY_CURRENCIES]} />
          </form>
        </div>
      </div>
      <div className="border-t border-line-2">
        <p className="mx-auto max-w-6xl px-4 py-4 text-[13px] text-ink-3 sm:px-6">
          © {new Date().getFullYear()} {config.companyLegalName}. Registered in Botswana.
        </p>
      </div>
    </footer>
  );
}
