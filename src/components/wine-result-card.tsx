import type { Wine } from "@/domain/wine";
import { wineFields } from "@/lib/wine-recognition";

type WineResultCardProps = {
  result: Wine;
};

function displayValue(key: Exclude<keyof Wine, "confidence">, value: Wine[typeof key]) {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Onbekend";
  if (value === null || value === "") return "Onbekend";
  if (key === "alcoholPercentage") return `${value}%`;
  return value;
}

export function WineResultCard({ result }: WineResultCardProps) {
  return (
    <section className="result-card" aria-labelledby="recognition-result-title">
      <div className="result-heading">
        <div>
          <p className="result-eyebrow">Herkenningsresultaat</p>
          <h2 id="recognition-result-title">Wijndetails</h2>
        </div>
        <div className="confidence" aria-label={`${result.confidence}% zekerheid`}>
          <strong>{result.confidence}%</strong>
          <span>Zekerheid</span>
        </div>
      </div>

      <dl className="result-grid">
        {wineFields.map(({ key, label }) => (
          <div className="result-field" key={key}>
            <dt>{label}</dt>
            <dd>{displayValue(key, result[key])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
