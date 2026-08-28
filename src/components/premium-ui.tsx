import Link from "next/link";
import type { ComponentType, InputHTMLAttributes, ReactNode, SVGProps } from "react";

type Atmosphere = "home" | "cellar" | "scan" | "recommendation" | "sommelier";

export function HeroBackground({ atmosphere = "home" }: { atmosphere?: Atmosphere }) {
  const artwork = `/images/${atmosphere}-hero.webp`;
  return <><link rel="preload" as="image" href={artwork} /><div className={`hero-background hero-background-${atmosphere}`} aria-hidden="true"><span className="hero-glow" /><span className="hero-vignette" /><span className="hero-texture" /></div></>;
}

export function PremiumHeader({ eyebrow, title, subtitle, icon: Icon }: { eyebrow?: string; title: string; subtitle?: ReactNode; icon?: ComponentType<SVGProps<SVGSVGElement>> }) {
  return <header className="premium-header">{Icon && <span className="premium-mark"><Icon className="size-6" /></span>}{eyebrow && <p>{eyebrow}</p>}<h1>{title}</h1>{subtitle && <div className="premium-subtitle">{subtitle}</div>}</header>;
}

export function GlassCard({ children, className = "", as: Element = "section" }: { children: ReactNode; className?: string; as?: "section" | "article" | "div" }) {
  return <Element className={`glass-card ${className}`}>{children}</Element>;
}

export function PrimaryActionCard({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: ComponentType<SVGProps<SVGSVGElement>> }) {
  return <Link className="primary-action-card" href={href}><span className="action-card-icon"><Icon className="size-6" /></span><span><strong>{title}</strong><small>{description}</small></span><i aria-hidden="true">→</i></Link>;
}

export function SectionTitle({ eyebrow, children }: { eyebrow?: string; children: ReactNode }) {
  return <div className="section-title">{eyebrow && <p>{eyebrow}</p>}<h2>{children}</h2></div>;
}

export function PremiumButton({ children, className = "", variant = "primary", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" }) {
  return <button className={`action action-${variant} premium-button ${className}`} {...props}>{children}</button>;
}

export function PremiumInput(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`premium-input ${props.className ?? ""}`} {...props} />;
}
