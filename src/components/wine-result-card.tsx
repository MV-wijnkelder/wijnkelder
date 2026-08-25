import { wineRecognitionFields } from "@/lib/wine-recognition";
import type { WineRecognition } from "@/lib/wine-recognition";

type WineResultCardProps = {
  result: WineRecognition;
};

function displayValue(value: string | string[]) {
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Unknown";
  return value.trim() || "Unknown";
}

export function WineResultCard({ result }: WineResultCardProps) {
  return (
    <section className="result-card" aria-labelledby="recognition-result-title">
      <div className="result-heading">
        <div>
          <p className="result-eyebrow">Recognition result</p>
          <h2 id="recognition-result-title">Wine details</h2>
        </div>
        <div className="confidence" aria-label={`${result.confidence}% confidence`}>
          <strong>{result.confidence}%</strong>
          <span>Confidence</span>
        </div>
      </div>

      <dl className="result-grid">
        {wineRecognitionFields.map(({ key, label }) => (
          <div className="result-field" key={key}>
            <dt>{label}</dt>
            <dd>{displayValue(result[key])}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
