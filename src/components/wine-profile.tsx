import type { Wine } from "@/domain/wine";
import { WineglassIcon } from "@/components/icons";

export function WineProfile({ wine, bottleCount }: { wine: Wine; bottleCount?: number }) {
  const { profile } = wine;
  const maturityAdvice = profile.drinking.currentMaturity
    ? (["ready", "mature", "past peak"].includes(profile.drinking.currentMaturity) ? "Drink now" : "Hold")
    : null;
  return <article className="wine-profile">
    <header className="profile-hero"><div className="app-icon app-icon-small"><WineglassIcon className="size-6" /></div><p>{wine.producer || "Unknown producer"}</p><h1>{wine.wineName || "Unnamed wine"}</h1><span>{[wine.vintage, wine.appellation, wine.region, wine.country].filter(Boolean).join(" · ") || "Origin unknown"}</span>{wine.grapeVarieties.length > 0 && <div className="profile-tags">{wine.grapeVarieties.map((grape) => <span key={grape}>{grape}</span>)}</div>}</header>
    <ProfileSection title="Wine"><Details values={[["Producer", wine.producer], ["Wine", wine.wineName], ["Vintage", wine.vintage], ["Country", wine.country], ["Region", wine.region], ["Appellation", wine.appellation], ["Grape varieties", wine.grapeVarieties.join(", ") || null], ["Color", wine.wineColor], ["Bottle size", wine.bottleSize], ["Alcohol", wine.alcoholPercentage === null ? null : `${wine.alcoholPercentage}%`], ...(bottleCount === undefined ? [] : [["Bottles", String(bottleCount)] as [string, string]])]} /></ProfileSection>
    <ProfileSection title="Drinking window"><Details emptyMessage="No reliable drinking guidance is currently available." values={[["Drink from", profile.drinking.drinkFrom], ["Drink until", profile.drinking.drinkUntil], ["Drink now / Hold", maturityAdvice], ["Current maturity", profile.drinking.currentMaturity]]} /></ProfileSection>
    <ProfileSection title="Serving advice"><Details emptyMessage="Serving guidance is currently unavailable." values={[["Temperature", profile.serving.temperature], ["Decant advice", profile.serving.decantAdvice]]} /></ProfileSection>
    <ProfileSection title="Style"><Details emptyMessage="Style information is currently unavailable." values={[["Style", profile.style.wineStyle], ["Body", profile.style.body], ["Acidity", profile.style.acidity], ["Tannin", profile.style.tannin], ["Sweetness", profile.style.sweetness], ["Alcohol intensity", profile.style.alcohol]]} /></ProfileSection>
    <ProfileSection title="Sommelier profile">
      {profile.sommelier.servingPersonality && <p className="profile-summary">{profile.sommelier.servingPersonality}</p>}
      <Details emptyMessage="Sommelier guidance is currently unavailable." values={[["Wine style", profile.sommelier.wineStyles.join(", ") || null], ["Ageing potential", profile.sommelier.ageingPotential], ["Drinking stage", profile.sommelier.drinkingStage]]} />
    </ProfileSection>
    <TagSection title="Best occasions" values={profile.sommelier.bestOccasions} />
    <TagSection title="Excellent with" values={profile.sommelier.excellentWith} />
    <TagSection title="Good with" values={profile.sommelier.goodWith} />
    <TagSection title="Avoid with" values={profile.sommelier.avoidWith} />
    <ProfileSection title="Food pairing">{profile.foodPairings.length ? <div className="profile-tags">{profile.foodPairings.map((food) => <span key={food}>{food}</span>)}</div> : <Empty message="Food pairing guidance is currently unavailable." />}</ProfileSection>
    <ProfileSection title="About this wine">{profile.summary ? <p className="profile-summary">{profile.summary}</p> : <Empty message="This information is currently unavailable." />}</ProfileSection>
    {profile.wineryInformation && <ProfileSection title="Winery information"><p className="profile-summary">{profile.wineryInformation}</p></ProfileSection>}
    {profile.vintageRemarks && <ProfileSection title="Vintage remarks"><p className="profile-summary">{profile.vintageRemarks}</p></ProfileSection>}
  </article>;
}

function ProfileSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="profile-section"><h2>{title}</h2>{children}</section>; }
function TagSection({ title, values }: { title: string; values: string[] }) { return values.length ? <ProfileSection title={title}><div className="profile-tags">{values.map((value) => <span key={value}>{value}</span>)}</div></ProfileSection> : null; }
function Details({ values, emptyMessage }: { values: Array<[string, string | null]>; emptyMessage?: string }) { const known = values.filter(([, value]) => value); return known.length ? <dl>{known.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl> : <Empty message={emptyMessage} />; }
function Empty({ message = "This information is currently unavailable." }: { message?: string }) { return <p className="profile-empty">{message}</p>; }
