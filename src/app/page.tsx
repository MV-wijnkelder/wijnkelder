import Link from "next/link";
import { CameraIcon, SparklesIcon, WineglassIcon } from "@/components/icons";

const actions = [
  { label: "What should I drink?", icon: SparklesIcon, primary: true, href: "/recommendation" },
  { label: "Scan wine", icon: CameraIcon, primary: false, href: "/scan" },
  { label: "My cellar", icon: WineglassIcon, primary: false, href: "/cellar" },
] as const;

export default function Home() {
  return (
    <main className="app-shell home-shell relative flex h-dvh items-center justify-center overflow-hidden px-6 py-6">
      <div aria-hidden="true" className="ambient ambient-top" />
      <div aria-hidden="true" className="ambient ambient-bottom" />

      <section className="page-enter relative z-10 flex w-full max-w-xl flex-col items-center text-center">
        <div className="app-icon mb-6 sm:mb-8">
          <WineglassIcon className="size-8" />
        </div>

        <p className="mb-5 text-xs font-semibold tracking-[0.28em] text-wine/70 uppercase">
          Your collection, always close
        </p>
        <h1 className="text-balance text-5xl font-semibold tracking-[-0.055em] text-ink sm:text-6xl">
          Marcel&apos;s Wine Cellar
        </h1>
        <p className="mt-6 max-w-md text-pretty text-lg leading-8 text-muted sm:text-xl">
          Scan a wine label. AI does the rest.
        </p>

        <div className="mt-8 grid w-full gap-3 sm:mt-10 sm:grid-cols-2">
          {actions.map(({ label, icon: Icon, primary, href }) => {
            const content = <>
              <Icon className="size-5" />
              <span>{label}</span>
            </>;

            return href ? (
              <Link className={`${primary ? "action action-primary" : "action action-secondary"} ${primary ? "sm:col-span-2" : ""}`} href={href} key={label}>
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

        <p className="mt-8 text-xs tracking-wide text-muted/70 sm:mt-10">
          Carefully collected
        </p>
      </section>
    </main>
  );
}
