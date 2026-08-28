"use client";

import { useEffect, useMemo, useState } from "react";
import { SparklesIcon, WineglassIcon } from "@/components/icons";
import { BackButton, GlassCard, HeroBackground, PremiumHeader, SectionTitle } from "@/components/premium-ui";
import { buildCellarInsights, type DistributionItem } from "@/lib/cellar-insights";
import type { StoredWine } from "@/services/wine-service";
import { WineService } from "@/services/wine-service";

export default function CellarInsightsPage() {
  const [wines, setWines] = useState<StoredWine[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    void WineService.list().then(setWines).catch(() => setError("Cellar insights could not be loaded.")).finally(() => setIsLoading(false));
  }, []);
  const report = useMemo(() => buildCellarInsights(wines), [wines]);
  const maxHorizon = Math.max(1, ...report.horizon.map((item) => item.wines));

  return <main className="app-shell premium-page insights-page">
    <HeroBackground atmosphere="cellar" />
    <section className="page-enter insights-content">
      <BackButton href="/">Home</BackButton>
      <PremiumHeader icon={WineglassIcon} eyebrow="Private collection" title="Cellar Insights" subtitle="A considered view of your collection, its balance and its moment." />
      {error && <p className="error-message" role="alert">{error}</p>}
      {isLoading ? <p className="insights-status" role="status">Preparing your cellar view…</p> : report.bottles === 0 ? <GlassCard className="insights-empty"><WineglassIcon /><h2>Your story starts with a bottle.</h2><p>Add wines to reveal collection insights.</p></GlassCard> : <div className="insights-sections">
        <InsightSection eyebrow="Section 01" title="Collection">
          <div className="insights-kpis"><Kpi value={report.bottles} label="Total bottles" /><Kpi value={report.wines} label="Different wines" /><Kpi value={report.countries} label="Countries" /><Kpi value={report.regions} label="Regions" /></div>
        </InsightSection>

        <InsightSection eyebrow="Section 02" title="Drink Readiness">
          <p className="section-intro">Each wine rises towards its drinking peak, then gently recedes.</p>
          <div className="readiness-list">{report.readiness.map((item) => <div className="readiness-row" key={item.stars}><span className="stars" aria-label={`${item.stars} out of 5 stars`}>{"★".repeat(item.stars)}<i>{"★".repeat(5 - item.stars)}</i></span><span><strong>{item.label}</strong><small>{item.bottles} {item.bottles === 1 ? "bottle" : "bottles"}</small></span></div>)}</div>
        </InsightSection>

        <InsightSection eyebrow="Section 03" title="Drink Horizon">
          <p className="section-intro">Wines reaching the start of their optimal drinking window.</p>
          {report.horizon.length ? <div className="horizon-chart">{report.horizon.map((item) => <div className="horizon-row" key={item.year}><span>{item.year}</span><div><i style={{ width: `${Math.max(5, item.wines / maxHorizon * 100)}%` }} /></div><strong>{item.wines}</strong></div>)}</div> : <EmptyData>Drinking windows have not been recorded yet.</EmptyData>}
        </InsightSection>

        <InsightSection eyebrow="Section 04" title="Collection Mix">
          <div className="mix-grid"><MixChart title="Colour" items={report.mix.colours} /><MixChart title="Country" items={report.mix.countries} /><MixChart title="Region" items={report.mix.regions} /><MixChart title="Grape variety" items={report.mix.grapes} /></div>
        </InsightSection>

        <InsightSection eyebrow="Section 05" title="Estimated Collection Value">
          <div className="value-feature"><span>Estimated Collection Value</span><strong>{money(report.value.total, report.value.currency)}</strong><small>Based on current estimated market prices.</small><small>{report.value.valuedBottles} of {report.value.totalBottles} bottles valued ({report.value.coveragePercentage}%)</small>{report.value.unvaluedBottles > 0 && <small>{report.value.unvaluedBottles} {report.value.unvaluedBottles === 1 ? "bottle" : "bottles"} awaiting market valuation</small>}</div>
        </InsightSection>

        <InsightSection eyebrow="Section 06" title="Collection Highlights">
          <dl className="highlights"><Highlight label="Oldest vintage" value={report.highlights.oldest} /><Highlight label="Youngest vintage" value={report.highlights.youngest} /><Highlight label="Largest producer" value={report.highlights.producer} /><Highlight label="Largest country" value={report.highlights.country} /><Highlight label="Largest region" value={report.highlights.region} /></dl>
        </InsightSection>

        <InsightSection eyebrow="Section 07" title="AI Insights" className="executive-insights">
          <span className="insight-spark"><SparklesIcon /></span>
          {report.insights.length ? <ul>{report.insights.map((insight) => <li key={insight}>{insight}</li>)}</ul> : <EmptyData>More cellar detail will unlock executive insights.</EmptyData>}
        </InsightSection>

        <InsightSection eyebrow="Section 08" title="Collection Health" className="health-card">
          <div className="health-score" aria-label={`Collection health ${report.health} out of 100`}><strong>{report.health}</strong><span>/100</span></div>
          <p>An advisory view of readiness, balance, variety, horizon and duplicates.</p>
        </InsightSection>
      </div>}
    </section>
  </main>;
}

function InsightSection({ eyebrow, title, className = "", children }: { eyebrow: string; title: string; className?: string; children: React.ReactNode }) {
  return <GlassCard className={`insight-section ${className}`}><SectionTitle eyebrow={eyebrow}>{title}</SectionTitle>{children}</GlassCard>;
}
function Kpi({ value, label }: { value: React.ReactNode; label: string }) { return <div className="insight-kpi"><strong>{value}</strong><span>{label}</span></div>; }
function MixChart({ title, items }: { title: string; items: DistributionItem[] }) {
  const shown = items.slice(0, 5);
  return <div className="mix-chart"><h3>{title}</h3>{shown.length ? shown.map((item) => <div className="mix-item" key={item.label}><div><span>{item.label}</span><strong>{item.percentage}%</strong></div><i><b style={{ width: `${item.percentage}%` }} /></i></div>) : <small>No data recorded</small>}</div>;
}
function Highlight({ label, value }: { label: string; value: string | null }) { return <div><dt>{label}</dt><dd>{value ?? "Not recorded"}</dd></div>; }
function EmptyData({ children }: { children: React.ReactNode }) { return <p className="insights-no-data">{children}</p>; }
function money(value: number, currency: string) { try { return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: 0 }).format(value); } catch { return `${currency} ${Math.round(value).toLocaleString("en")}`; } }
