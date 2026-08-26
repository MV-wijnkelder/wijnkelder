import Link from "next/link";
import { cookies } from "next/headers";
import { CameraIcon, WineglassIcon } from "@/components/icons";
import { MICROSOFT_AUTH_COOKIE, readAuthCookie } from "@/lib/microsoft-auth";

const actions = [
  { label: "Scan etiket", icon: CameraIcon, primary: true, href: "/scan" },
  { label: "Mijn kelder", icon: WineglassIcon, primary: false, href: null },
] as const;

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ authError?: string }>;
}) {
  const cookieStore = await cookies();
  const email = readAuthCookie(cookieStore.get(MICROSOFT_AUTH_COOKIE)?.value);
  const { authError } = await searchParams;

  return (
    <main className="app-shell relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden="true" className="ambient ambient-top" />
      <div aria-hidden="true" className="ambient ambient-bottom" />

      <section className="page-enter relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="app-icon mb-10">
          <WineglassIcon className="size-8" />
        </div>

        <p className="mb-5 text-xs font-semibold tracking-[0.28em] text-wine/70 uppercase">
          Jouw collectie, altijd dichtbij
        </p>
        <h1 className="text-balance text-5xl font-semibold tracking-[-0.055em] text-ink sm:text-6xl">
          Marcel&apos;s Wijnkelder
        </h1>
        <p className="mt-6 max-w-md text-pretty text-lg leading-8 text-muted sm:text-xl">
          Scan a wine label. AI does the rest.
        </p>

        <div className="mt-8 w-full max-w-sm">
          {email ? (
            <div className="microsoft-account" aria-live="polite">
              <span>Verbonden met Microsoft</span>
              <strong>{email}</strong>
              <Link href="/api/auth/microsoft/logout">Uitloggen</Link>
            </div>
          ) : (
            <Link className="action action-microsoft w-full" href="/api/auth/microsoft">
              <span className="microsoft-mark" aria-hidden="true">
                <i /><i /><i /><i />
              </span>
              Connect Microsoft
            </Link>
          )}
          {authError ? (
            <p className="auth-error" role="alert">
              Microsoft aanmelden is niet gelukt. Probeer het opnieuw.
            </p>
          ) : null}
        </div>

        <div className="mt-8 grid w-full gap-3 sm:grid-cols-2">
          {actions.map(({ label, icon: Icon, primary, href }) => {
            const content = <>
              <Icon className="size-5" />
              <span>{label}</span>
            </>;

            return href ? (
              <Link className="action action-primary" href={href} key={label}>
                {content}
              </Link>
            ) : (
              <button
                className={primary ? "action action-primary" : "action action-secondary"}
                key={label}
                type="button"
              >
                {content}
              </button>
            );
          })}
        </div>

        <p className="mt-12 text-xs tracking-wide text-muted/70">
          Met aandacht bewaard
        </p>
      </section>
    </main>
  );
}
