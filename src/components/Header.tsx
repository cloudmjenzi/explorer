import Link from "next/link";
import { getUser } from "@/lib/auth";
import { logout } from "@/app/actions/session";
import { config } from "@/lib/config";

export function Wordmark() {
  const [first, ...rest] = config.appName.split(" ");
  return (
    <span className="font-display text-[22px] font-extrabold leading-none tracking-[-0.03em] text-ink">
      {first}
      {rest.length > 0 && <span className="ml-1.5 font-semibold text-delta">{rest.join(" ")}</span>}
    </span>
  );
}

export async function Header() {
  const user = await getUser();
  return (
    <header className="bg-paper">
      <div className="mx-auto flex max-w-6xl items-center gap-6 px-4 py-4 sm:px-6">
        <Link href="/" aria-label={`${config.appName} home`}>
          <Wordmark />
        </Link>
        <nav className="hidden items-center gap-5 text-[15px] md:flex" aria-label="Main">
          <Link href="/explore" className="hover:text-delta">
            Explore
          </Link>
          <Link href="/regions" className="hover:text-delta">
            Regions
          </Link>
          <Link href="/partners" className="hover:text-delta">
            List your business
          </Link>
        </nav>
        <div className="ml-auto flex items-center gap-2 text-[15px]">
          {user ? (
            <>
              {user.role === "ADMIN" && (
                <Link href="/admin" className="btn-ghost px-3">
                  Admin
                </Link>
              )}
              {user.provider && (
                <Link href="/provider" className="btn-ghost px-3">
                  Dashboard
                </Link>
              )}
              <Link href="/trips" className="btn-ghost px-3">
                My trips
              </Link>
              <form action={logout}>
                <button className="btn-ghost px-3 text-ink-2">Log out</button>
              </form>
            </>
          ) : (
            <>
              <Link href="/trips" className="btn-ghost hidden px-3 sm:inline-flex">
                Find my booking
              </Link>
              <Link href="/login" className="btn-secondary px-3 py-2">
                Log in
              </Link>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-5 overflow-x-auto px-4 pb-3 text-[15px] md:hidden" aria-label="Main mobile">
        <Link href="/explore">Explore</Link>
        <Link href="/regions">Regions</Link>
        <Link href="/partners">List your business</Link>
      </nav>
      <div className="flag-band" />
    </header>
  );
}
