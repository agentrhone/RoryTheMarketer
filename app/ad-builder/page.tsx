"use client";

import { useState, useEffect, useCallback } from "react";
import type {
  GeneratedAd,
  WineDetails,
  AdType,
  AspectRatio,
  ImageBackend,
  CopyVariation,
} from "@/lib/ad-builder";
import StepIndicator from "./components/StepIndicator";
import StepSelect from "./components/StepSelect";
import StepConfigure from "./components/StepConfigure";
import StepGenerate from "./components/StepGenerate";

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

type ReferenceAdSummary = {
  id: string;
  label: string;
  angle?: string;
  nanoBanana?: string;
  imageFile?: string;
  platform?: string;
  format?: string;
  type?: AdType;
  aspectRatio?: string;
  notes?: string;
};

export default function AdBuilderPage() {
  // --- Step Navigation ---
  const [step, setStep] = useState(1);

  // --- Step 1: Select ---
  const [referenceAds, setReferenceAds] = useState<ReferenceAdSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // --- Step 2: Configure ---
  const [bottleFile, setBottleFile] = useState<File | null>(null);
  const [bottlePreview, setBottlePreview] = useState<string>();
  const [bgFile, setBgFile] = useState<File | null>(null);
  const [bgPreview, setBgPreview] = useState<string>();
  const [details, setDetails] = useState<WineDetails>(DEFAULT_DETAILS);
  const [copyVariations, setCopyVariations] = useState<
    Record<string, CopyVariation[]>
  >({});
  const [copyGenerating, setCopyGenerating] = useState(false);
  const [copyError, setCopyError] = useState("");
  const [backend, setBackend] = useState<ImageBackend>("gemini");
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("1:1");
  const [imagesPerPrompt, setImagesPerPrompt] = useState(1);
  const [imagePromptModifier, setImagePromptModifier] = useState("");

  // --- Step 3: Generate ---
  const [generations, setGenerations] = useState<GeneratedAd[]>([]);
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState<{
    current: number;
    total: number;
    message: string;
  } | null>(null);

  // --- Load data on mount ---
  useEffect(() => {
    fetch(`/api/ad-reference/list?brand=${BRAND_ID}`)
      .then((r) => r.json())
      .then((d) => setReferenceAds(d.referenceAds || []))
      .catch(() => {});

    fetch(`/api/ad-builder/generations?brand=${BRAND_ID}`)
      .then((r) => r.json())
      .then((d) => setGenerations(d.generations || []))
      .catch(() => {});

    fetch(`/api/context/image-prompt-modifier?brand=${BRAND_ID}`)
      .then((r) => r.json())
      .then((d) => setImagePromptModifier(d.content || ""))
      .catch(() => {});
  }, []);

  // --- Helpers ---
  const selectedAds = referenceAds.filter((a) => selectedIds.has(a.id));

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

  const toggleReference = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const canNavigateTo = useCallback(
    (s: number) => {
      if (s === 1) return true;
      if (s === 2) return selectedIds.size > 0;
      if (s === 3) return selectedIds.size > 0;
      return false;
    },
    [selectedIds.size],
  );

  // --- Copy Generation ---
  const handleGenerateCopy = async () => {
    setCopyGenerating(true);
    setCopyError("");

    const results: Record<string, CopyVariation[]> = {};

    for (const ad of selectedAds) {
      try {
        const res = await fetch("/api/ad-reference/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            brand: BRAND_ID,
            referenceId: ad.id,
            wineDetails: {
              headline: details.headline || undefined,
              score: details.score || undefined,
              retailPrice: details.retailPrice || undefined,
              salePrice: details.salePrice || undefined,
              promoCode: details.promoCode || undefined,
              ctaText: details.ctaText || undefined,
              additionalNotes: details.additionalNotes || undefined,
            },
          }),
        });
        const raw = await res.text();
        let data: {
          variations?: CopyVariation[];
          error?: string;
        };
        try {
          data = raw ? JSON.parse(raw) : {};
        } catch {
          setCopyError(`Invalid response for ${ad.label}`);
          continue;
        }
        if (!res.ok) {
          setCopyError(data.error || `Failed for ${ad.label}`);
          continue;
        }
        results[ad.id] = data.variations || [];
      } catch (err) {
        setCopyError(
          err instanceof Error ? err.message : `Failed for ${ad.label}`,
        );
      }
    }

    setCopyVariations(results);
    setCopyGenerating(false);
  };

  // --- Image Generation (batch) ---
  const handleGenerate = async () => {
    if (!bottleFile) return;
    setGenerating(true);
    setStep(3);

    // Build list of jobs: (referenceAd, copyVariation?) pairs
    type Job = { refAd: ReferenceAdSummary; variation?: CopyVariation };
    const jobs: Job[] = [];

    const hasCopy = Object.values(copyVariations).some((v) => v.length > 0);

    if (hasCopy) {
      for (const ad of selectedAds) {
        const vars = copyVariations[ad.id] ?? [];
        if (vars.length > 0) {
          for (const v of vars) {
            jobs.push({ refAd: ad, variation: v });
          }
        } else {
          jobs.push({ refAd: ad });
        }
      }
    } else {
      for (const ad of selectedAds) {
        jobs.push({ refAd: ad });
      }
    }

    const total = jobs.length * (backend === "fal" ? imagesPerPrompt : 1);
    let completed = 0;
    setProgress({ current: 0, total, message: "Starting generation..." });

    for (const job of jobs) {
      const wineDetails: WineDetails = job.variation
        ? {
            ...details,
            headline: job.variation.headline || details.headline,
            pullQuote:
              job.variation.primaryText?.slice(0, 120) || details.pullQuote,
            additionalNotes: [
              job.variation.primaryText,
              job.variation.description,
            ]
              .filter(Boolean)
              .join("\n\n") || details.additionalNotes,
          }
        : details;

      try {
        if (backend === "fal") {
          const fd = new FormData();
          fd.append("brand", BRAND_ID);
          fd.append("referenceId", job.refAd.id);
          fd.append("wineDetails", JSON.stringify(wineDetails));
          fd.append("bottleImage", bottleFile);
          if (bgFile) fd.append("backgroundImage", bgFile);
          fd.append("aspectRatio", aspectRatio);
          fd.append("imagesPerPrompt", String(imagesPerPrompt));
          if (imagePromptModifier)
            fd.append("imagePromptModifier", imagePromptModifier);

          const res = await fetch("/api/ad-builder/generate-fal", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (data.generations?.length) {
            setGenerations((prev) => [...data.generations, ...prev]);
            completed += data.generations.length;
          }
          if (data.failures?.length) {
            completed += data.failures.length;
          }
        } else {
          // Gemini: use generate-statics if we have a variation, otherwise use generate
          const fd = new FormData();
          fd.append("brand", BRAND_ID);
          fd.append("referenceId", job.refAd.id);
          fd.append(
            "variations",
            JSON.stringify([
              job.variation ?? {
                primaryText: "",
                headline: wineDetails.headline,
                description: "",
              },
            ]),
          );
          fd.append(
            "wineDetailsOverride",
            JSON.stringify({
              score: wineDetails.score || undefined,
              retailPrice: wineDetails.retailPrice || undefined,
              salePrice: wineDetails.salePrice || undefined,
              promoCode: wineDetails.promoCode || undefined,
              ctaText: wineDetails.ctaText || undefined,
            }),
          );
          fd.append("bottleImage", bottleFile);
          if (bgFile) fd.append("backgroundImage", bgFile);
          if (aspectRatio) fd.append("aspectRatio", aspectRatio);
          if (imagePromptModifier)
            fd.append("imagePromptModifier", imagePromptModifier);

          const res = await fetch("/api/ad-reference/generate-statics", {
            method: "POST",
            body: fd,
          });
          const data = await res.json();
          if (data.generations?.length) {
            setGenerations((prev) => [...data.generations, ...prev]);
            completed += data.generations.length;
          }
          if (data.failures?.length) {
            completed += data.failures.length;
          }
        }
      } catch {
        completed += backend === "fal" ? imagesPerPrompt : 1;
      }

      setProgress({
        current: completed,
        total,
        message: `Generating ${completed}/${total}...`,
      });
    }

    setProgress(null);
    setGenerating(false);
  };

  // --- Delete Generation ---
  const handleDeleteGeneration = async (id: string) => {
    try {
      const res = await fetch(
        `/api/ad-builder/generations?brand=${BRAND_ID}&id=${id}`,
        { method: "DELETE" },
      );
      if (!res.ok) return;
      setGenerations((prev) => prev.filter((g) => g.id !== id));
    } catch {
      // ignore
    }
  };

  // --- Save Modifier ---
  const handleSaveModifier = async () => {
    try {
      await fetch("/api/context/image-prompt-modifier", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand: BRAND_ID,
          content: imagePromptModifier,
        }),
      });
    } catch {
      // ignore
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight mb-1">
        Ad Builder
      </h1>
      <p className="text-muted mb-4">
        Select templates, configure details, and generate finished ads.
      </p>

      <StepIndicator
        currentStep={step}
        onStepClick={setStep}
        canNavigateTo={canNavigateTo}
      />

      <div className="rounded-xl border border-border bg-surface p-6">
        {step === 1 && (
          <StepSelect
            referenceAds={referenceAds}
            selectedIds={selectedIds}
            onToggle={toggleReference}
            onNext={() => setStep(2)}
          />
        )}

        {step === 2 && (
          <StepConfigure
            brandId={BRAND_ID}
            selectedAds={selectedAds}
            bottleFile={bottleFile}
            bottlePreview={bottlePreview}
            onBottleSelect={handleBottleSelect}
            onBottleClear={clearBottle}
            bgFile={bgFile}
            bgPreview={bgPreview}
            onBgSelect={handleBgSelect}
            onBgClear={clearBg}
            details={details}
            onDetailsChange={setDetails}
            copyVariations={copyVariations}
            onCopyVariationsChange={setCopyVariations}
            copyGenerating={copyGenerating}
            copyError={copyError}
            onGenerateCopy={handleGenerateCopy}
            backend={backend}
            onBackendChange={setBackend}
            aspectRatio={aspectRatio}
            onAspectRatioChange={setAspectRatio}
            imagesPerPrompt={imagesPerPrompt}
            onImagesPerPromptChange={setImagesPerPrompt}
            imagePromptModifier={imagePromptModifier}
            onImagePromptModifierChange={setImagePromptModifier}
            onSaveModifier={handleSaveModifier}
            onGenerate={handleGenerate}
            onBack={() => setStep(1)}
            generating={generating}
          />
        )}

        {step === 3 && (
          <StepGenerate
            brandId={BRAND_ID}
            generations={generations}
            progress={progress}
            onDelete={handleDeleteGeneration}
            onBack={() => setStep(2)}
          />
        )}
      </div>
    </div>
  );
}
