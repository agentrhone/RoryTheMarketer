"use client";

import { useState } from "react";

const COPY_TYPES = [
  "Wine write up",
  "Ad headline",
  "Ad body copy",
  "Email subject line",
  "Email body",
  "Social caption",
  "Landing page hero",
  "CTA variations",
  "General",
] as const;

type CopyType = (typeof COPY_TYPES)[number];

const BRAND_ID = "winespies";

const isWineWriteUp = (t: string) => t === "Wine write up";

export default function CopywriterPage() {
  const [prompt, setPrompt] = useState("");
  const [copyType, setCopyType] = useState<CopyType>(COPY_TYPES[0]);
  const [persona, setPersona] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Wine write up fields (only used when copyType === "Wine write up")
  const [wineName, setWineName] = useState("");
  const [varietal, setVarietal] = useState("");
  const [region, setRegion] = useState("");
  const [points, setPoints] = useState("");
  const [priceDiscount, setPriceDiscount] = useState("");
  const [tastingNotes, setTastingNotes] = useState("");
  const [scarcityAngle, setScarcityAngle] = useState("");

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    const hasPrompt = prompt.trim().length > 0;
    const hasWineContext = isWineWriteUp(copyType) && wineName.trim().length > 0;
    if (!hasPrompt && !hasWineContext) return;
    setLoading(true);
    setError("");
    setResult("");

    try {
      const body: Record<string, unknown> = {
        brand: BRAND_ID,
        copyType,
        persona: persona || undefined,
      };
      if (isWineWriteUp(copyType)) {
        body.wineWriteUp = {
          wineName: wineName.trim() || undefined,
          varietal: varietal.trim() || undefined,
          region: region.trim() || undefined,
          points: points.trim() || undefined,
          priceDiscount: priceDiscount.trim() || undefined,
          tastingNotes: tastingNotes.trim() || undefined,
          scarcityAngle: scarcityAngle.trim() || undefined,
        };
        body.prompt = prompt.trim() || undefined;
      } else {
        body.prompt = prompt.trim();
      }

      const res = await fetch("/api/copywriter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate");
      setResult(data.copy);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = isWineWriteUp(copyType)
    ? wineName.trim().length > 0
    : prompt.trim().length > 0;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">Copywriter</h1>
      <p className="text-muted mb-6">Get copy in your brand voice. Uses your voice guidelines, personas, and USPs as context.</p>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input */}
        <form
          onSubmit={handleGenerate}
          className="rounded-xl border border-border bg-surface p-6 space-y-4"
        >
          <div>
            <label className="block text-xs font-medium text-muted mb-1">Copy Type</label>
            <select
              value={copyType}
              onChange={(e) => setCopyType(e.target.value as CopyType)}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
            >
              {COPY_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {isWineWriteUp(copyType) ? (
            <>
              <div className="space-y-4 rounded-lg border border-border bg-background/50 p-4">
                <p className="text-xs font-medium text-muted">Wine details — fill in what you have; the more context, the better the copy.</p>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Wine name *</label>
                  <input
                    type="text"
                    value={wineName}
                    onChange={(e) => setWineName(e.target.value)}
                    placeholder="e.g. 2019 Smith Vineyard Cabernet"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  />
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Varietal</label>
                    <input
                      type="text"
                      value={varietal}
                      onChange={(e) => setVarietal(e.target.value)}
                      placeholder="e.g. Cabernet Sauvignon"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Region / AVA</label>
                    <input
                      type="text"
                      value={region}
                      onChange={(e) => setRegion(e.target.value)}
                      placeholder="e.g. Napa Valley, Oakville"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Points / rating</label>
                    <input
                      type="text"
                      value={points}
                      onChange={(e) => setPoints(e.target.value)}
                      placeholder="e.g. 96 pts, 94 WA"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted mb-1">Price / discount</label>
                    <input
                      type="text"
                      value={priceDiscount}
                      onChange={(e) => setPriceDiscount(e.target.value)}
                      placeholder="e.g. 60% off, was $85 now $34"
                      className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Tasting notes (optional)</label>
                  <textarea
                    value={tastingNotes}
                    onChange={(e) => setTastingNotes(e.target.value)}
                    rows={2}
                    placeholder="e.g. Black cherry, tobacco, structured tannins"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted mb-1">Scarcity / angle (optional)</label>
                  <input
                    type="text"
                    value={scarcityAngle}
                    onChange={(e) => setScarcityAngle(e.target.value)}
                    placeholder="e.g. Two barrels to the US; runs with Caymus at half the price"
                    className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Additional instructions (optional)</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder="e.g. Lead with the score and discount. Keep under 150 words. Mention the Locker for free shipping."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
                />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">Target Persona (optional)</label>
                <input
                  type="text"
                  value={persona}
                  onChange={(e) => setPersona(e.target.value)}
                  placeholder="e.g. The Casual Explorer"
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted mb-1">What do you need?</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={5}
                  required
                  placeholder="e.g. Write 5 headline variations for a 95-point Napa Cab at 60% off. Emphasize urgency and value."
                  className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
                />
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading || !canSubmit}
            className="w-full px-4 py-2.5 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? "Writing..." : "Generate Copy"}
          </button>

          {error && (
            <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg p-3">
              {error}
            </p>
          )}
        </form>

        {/* Output */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-muted mb-3">Output</h2>
          {result ? (
            <div className="text-sm whitespace-pre-wrap leading-relaxed">
              {result}
            </div>
          ) : (
            <p className="text-sm text-muted">
              Describe what you need and the copywriter will use your brand voice, USPs, and persona context.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
