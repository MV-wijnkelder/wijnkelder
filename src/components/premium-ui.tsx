import Link from "next/link";
import type {
  ComponentType,
  InputHTMLAttributes,
  ReactNode,
  SVGProps,
} from "react";
import { ChevronLeftIcon } from "@/components/icons";

type Atmosphere = "home" | "cellar" | "scan" | "recommendation" | "sommelier";

export function HeroBackground({
  atmosphere = "home",
}: {
  atmosphere?: Atmosphere;
}) {
  const artwork = `/images/${atmosphere}-hero.webp`;
  return (
    <>
      <link rel="preload" as="image" href={artwork} />
      <div
        className={`hero-background hero-background-${atmosphere}`}
        aria-hidden="true"
      >
        <span className="hero-glow" />
        <span className="hero-vignette" />
        <span className="hero-texture" />
      </div>
    </>
  );
}

export function PremiumHeader({
  eyebrow,
  title,
  subtitle,
  icon: Icon,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <header className="premium-header">
      {Icon && (
        <span className="premium-mark">
          <Icon className="size-6" />
        </span>
      )}
      {eyebrow && <p>{eyebrow}</p>}
      <h1>{title}</h1>
      {subtitle && <div className="premium-subtitle">{subtitle}</div>}
    </header>
  );
}

export function BackButton({
  href,
  children = "Home",
  onClick,
}: {
  href: string;
  children?: ReactNode;
  onClick?: () => void;
}) {
  return (
    <nav className="persistent-navigation" aria-label="Page navigation">
      <Link className="persistent-navigation-link" href={href} onClick={onClick}
        aria-label={`Back to ${typeof children === "string" ? children : "previous page"}`}>
        <ChevronLeftIcon /> Back
      </Link>
      <Link className="persistent-navigation-link" href="/">Home</Link>
    </nav>
  );
}

export function GlassCard({
  children,
  className = "",
  as: Element = "section",
}: {
  children: ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
}) {
  return <Element className={`glass-card ${className}`}>{children}</Element>;
}

export function PrimaryActionCard({
  href,
  title,
  description,
  icon: Icon,
}: {
  href: string;
  title: string;
  description: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  return (
    <PremiumLink className="primary-action-card" href={href}>
      <Icon />
      <span className="action-copy">
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
    </PremiumLink>
  );
}

export function SectionTitle({
  eyebrow,
  children,
}: {
  eyebrow?: string;
  children: ReactNode;
}) {
  return (
    <div className="section-title">
      {eyebrow && <p>{eyebrow}</p>}
      <h2>{children}</h2>
    </div>
  );
}

export function PremiumButton({
  children,
  className = "",
  variant = "primary",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "quiet";
}) {
  return (
    <button
      className={`action action-${variant} premium-button ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function PremiumLink({
  children,
  className = "",
  variant = "primary",
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  variant?: "primary" | "secondary" | "quiet";
  href: string;
  onClick?: () => void;
}) {
  return (
    <Link
      className={`action action-${variant} premium-button ${className}`}
      href={href}
      onClick={onClick}
    >
      {children}
    </Link>
  );
}

export function StatusMessage({
  children,
  tone = "neutral",
  role = "status",
}: {
  children: ReactNode;
  tone?: "neutral" | "error" | "success";
  role?: "status" | "alert";
}) {
  return (
    <p className={`status-message status-${tone}`} role={role}>
      {children}
    </p>
  );
}

export function PremiumInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input className={`premium-input ${props.className ?? ""}`} {...props} />
  );
}
