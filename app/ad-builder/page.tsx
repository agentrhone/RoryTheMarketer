"use client";

import { useState, useEffect, useCallback } from "react";
import type { AdStyle, GeneratedAd, WineDetails } from "@/lib/ad-builder";
import ImageUploadZone from "./components/ImageUploadZone";
import WineDetailsForm from "./components/WineDetailsForm";
import StylePicker from "./components/StylePicker";

const BRAND_ID = "winespies";

const DEFAULT_DETAILS: WineDetails = {
  headline: "",
  score: "",
  pullQuote: "",
  retailPrice: "",
  salePrice: "",
  promoCode: "",
  ctaText: "",
  additionalNotes: "",
};

export default function AdBuilderPage() {
  // Images
  const [bottleFile, setBottleFile] = useState<File | null>(null);
  const [bottlePreview, setBottlePreview] = useState<string>();
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string>();

  // Wine details
  const [details, setDetails] = useState<WineDetails>(DEFAULT_DETAILS);

  // Styles
  const [styles, setStyles] = useState<AdStyle[]>([]);
  const [selectedStyleIds, setSelectedStyleIds] = useState<Set<string>>(
    new Set()
  );

  // Generations
  const [generations, setGenerations] = useState<GeneratedAd[]>([]);

  // State
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");

  // Load styles and generations on mount
  useEffect(() => {
    fetch(`/api/ad-builder/styles?brand=${BRAND_ID}`)
      .then((r) => r.json())
      .then((d) => setStyles(d.styles || []))
      .catch(() => {});
    fetch(`/api/ad-builder/generations?brand=${BRAND_ID}`)
      .then((r) => r.json())
      .then((d) => setGenerations(d.generations || []))
      .catch(() => {});
  }, []);

  // File preview helpers
  const handleBottleSelect = useCallback((file: File) => {
    setBottleFile(file);
    setBottlePreview(URL.createObjectURL(file));
  }, []);

  const handleBgSelect = useCallback((file: File) => {
    setBgFile(file);
    setBgPreview(URL.createObjectURL(file));
  }, []);

  const clearBottle = useCallback(() => {
    setBottleFile(null);
    setBottlePreview(undefined);
  }, []);

  const clearBg = useCallback(() => {
    setBgFile(null);
    setBgPreview(undefined);
  }, []);

  const toggleStyle = useCallback((id: string) => {
    setSelectedStyleIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canGenerate =
    bottleFile && details.headline.trim() && selectedStyleIds.size > 0;

  const handleGenerate = async () => {
    if (!canGenerate || !bottleFile) return;
    setGenerating(true);
    setError("");
    setProgress(
      `Generating ${selectedStyleIds.size} ad${selectedStyleIds.size > 1 ? "s" : ""}...`
    );

    try {
      const fd = new FormData();
      fd.append("brand", BRAND_ID);
      fd.append("bottleImage", bottleFile);
      if (bgFile) fd.append("backgroundImage", bgFile);
      fd.append("headline", details.headline);
      fd.append("styleIds", JSON.stringify([...selectedStyleIds]));

      // Append optional fields
      if (details.score) fd.append("score", details.score);
      if (details.pullQuote) fd.append("pullQuote", details.pullQuote);
      if (details.retailPrice) fd.append("retailPrice", details.retailPrice);
      if (details.salePrice) fd.append("salePrice", details.salePrice);
      if (details.promoCode) fd.append("promoCode", details.promoCode);
      if (details.ctaText) fd.append("ctaText", details.ctaText);
      if (details.additionalNotes)
        fd.append("additionalNotes", details.additionalNotes);

      const res = await fetch("/api/ad-builder/generate", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed");

      // Prepend new generations to list
      if (data.generations?.length) {
        setGenerations((prev) => [...data.generations, ...prev]);
      }

      if (data.failures?.length) {
        const failNames = data.failures
          .map((f: { styleId: string; error: string }) => f.error)
          .join("; ");
        setError(`Some styles failed: ${failNames}`);
      }

      setProgress("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setProgress("");
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteGeneration = async (id: string) => {
    try {
      const res = await fetch(
        `/api/ad-builder/generations?brand=${BRAND_ID}&id=${id}`,
        { method: "DELETE" }
      );
      if (!res.ok) return;
      setGenerations((prev) => prev.filter((g) => g.id !== id));
    } catch {
      // ignore
    }
  };

  const genImgUrl = (gen: GeneratedAd) =>
    `/api/ad-builder/images?brand=${BRAND_ID}&path=generated/${gen.filename}`;

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Ad Builder
      </h1>
      <p className="text-muted mb-6">
        Upload a bottle shot, fill in wine details, pick reference styles, and
        generate finished ads.
      </p>

      <div className="space-y-6">
        {/* Image Uploads */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-foreground mb-4">
            Images
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <ImageUploadZone
              label="Bottle Shot (required)"
              onFileSelect={handleBottleSelect}
              previewUrl={bottlePreview}
              onClear={clearBottle}
            />
            <ImageUploadZone
              label="Background (optional)"
              onFileSelect={handleBgSelect}
              previewUrl={bgPreview}
              onClear={clearBg}
            />
          </div>
        </div>

        {/* Wine Details */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-foreground mb-4">
            Wine Details
          </h2>
          <WineDetailsForm details={details} onChange={setDetails} />
        </div>

        {/* Style Picker */}
        <div className="rounded-xl border border-border bg-surface p-6">
          <h2 className="text-sm font-medium text-foreground mb-4">
            Reference Styles
            {selectedStyleIds.size > 0 && (
              <span className="ml-2 text-xs text-muted font-normal">
                ({selectedStyleIds.size} selected)
              </span>
            )}
          </h2>
          <StylePicker
            brandId={BRAND_ID}
            styles={styles}
            selectedIds={selectedStyleIds}
            onToggle={toggleStyle}
            onStyleAdded={(style) => setStyles((prev) => [...prev, style])}
            onStyleDeleted={(id) => {
              setStyles((prev) => prev.filter((s) => s.id !== id));
              setSelectedStyleIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }}
          />
        </div>

        {/* Generate Button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={!canGenerate || generating}
          className="w-full px-4 py-3 text-sm font-medium bg-accent text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {generating
            ? progress || "Generating..."
            : `Generate Ad${selectedStyleIds.size > 1 ? "s" : ""} (${selectedStyleIds.size} style${selectedStyleIds.size !== 1 ? "s" : ""})`}
        </button>

        {error && (
          <p className="text-sm text-danger bg-red-50 border border-red-200 rounded-lg p-3">
            {error}
          </p>
        )}

        {/* Results */}
        {generations.length > 0 && (
          <div className="rounded-xl border border-border bg-surface p-6">
            <h2 className="text-sm font-medium text-foreground mb-4">
              Generated Ads ({generations.length})
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {generations.map((gen) => (
                <div
                  key={gen.id}
                  className="rounded-lg border border-border overflow-hidden"
                >
                  <img
                    src={genImgUrl(gen)}
                    alt={gen.styleName}
                    className="w-full aspect-square object-cover"
                  />
                  <div className="p-2 space-y-1">
                    <p className="text-xs font-medium truncate">
                      {gen.styleName}
                    </p>
                    <p className="text-xs text-muted truncate">
                      {gen.wineDetails.headline}
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={genImgUrl(gen)}
                        download={`ad-${gen.styleName.toLowerCase().replace(/\s+/g, "-")}-${gen.id}.png`}
                        className="text-xs text-accent hover:underline"
                      >
                        Download
                      </a>
                      <button
                        type="button"
                        onClick={() => handleDeleteGeneration(gen.id)}
                        className="text-xs text-muted hover:text-danger transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
