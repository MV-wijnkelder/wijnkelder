import Link from "next/link";

const actions = [
  { label: "Scan etiket", icon: "📷", primary: true, href: "/scan" },
  { label: "Mijn kelder", icon: "🍷", primary: false, href: null },
] as const;

export default function Home() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-12">
      <div aria-hidden="true" className="ambient ambient-top" />
      <div aria-hidden="true" className="ambient ambient-bottom" />

      <section className="relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="mb-10 flex size-16 items-center justify-center rounded-[1.4rem] bg-wine text-3xl shadow-[0_18px_40px_rgba(99,31,50,0.2)]">
          <span aria-hidden="true">🍷</span>
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

        <div className="mt-12 grid w-full gap-3 sm:grid-cols-2">
          {actions.map(({ label, icon, primary, href }) => {
            const content = <>
              <span aria-hidden="true" className="text-xl">{icon}</span>
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
