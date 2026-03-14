"use client";

import { useState } from "react";
import type { AdType } from "@/lib/ad-builder";
import { AD_TYPE_CONFIG } from "@/lib/ad-builder";

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

interface StepSelectProps {
  referenceAds: ReferenceAdSummary[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onNext: () => void;
}

const ALL_TYPES: (AdType | "all")[] = ["all", "pdp", "testimonial", "comparison", "offer", "ugc"];

export default function StepSelect({
  referenceAds,
  selectedIds,
  onToggle,
  onNext,
}: StepSelectProps) {
  const [filterType, setFilterType] = useState<AdType | "all">("all");

  const filtered =
    filterType === "all"
      ? referenceAds
      : referenceAds.filter((ad) => ad.type === filterType);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-2">
        {ALL_TYPES.map((type) => {
          const isActive = filterType === type;
          const label = type === "all" ? "All" : AD_TYPE_CONFIG[type].label;
          return (
            <button
              key={type}
              type="button"
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                isActive
                  ? "bg-accent text-white border-accent"
                  : "bg-background text-muted border-border hover:border-accent/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* Card grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">
          No reference ads found{filterType !== "all" ? ` for type "${AD_TYPE_CONFIG[filterType].label}"` : ""}.
          Add markdown files to <code className="text-xs">context/Examples/Ads/Static/</code>.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((ad) => {
            const isSelected = selectedIds.has(ad.id);
            const typeConfig = ad.type ? AD_TYPE_CONFIG[ad.type] : null;

            return (
              <button
                key={ad.id}
                type="button"
                onClick={() => onToggle(ad.id)}
                className={`relative rounded-lg border-2 overflow-hidden text-left transition-all ${
                  isSelected
                    ? "border-accent ring-2 ring-accent/30"
                    : "border-border hover:border-accent/40"
                }`}
              >
                {/* Thumbnail */}
                <div className="relative aspect-square bg-background">
                  {ad.imageFile ? (
                    <img
                      src={`/api/ad-reference/image?id=${ad.id}`}
                      alt={ad.label}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted text-xs">
                      No preview
                    </div>
                  )}

                  {/* Type badge */}
                  {typeConfig && (
                    <span
                      className={`absolute top-2 right-2 px-2 py-0.5 text-[10px] font-semibold rounded-full border ${typeConfig.color} ${typeConfig.textColor}`}
                    >
                      {typeConfig.label.split(" / ")[0]}
                    </span>
                  )}

                  {/* Selection indicator */}
                  {isSelected && (
                    <div className="absolute top-2 left-2 w-5 h-5 rounded-full bg-accent text-white flex items-center justify-center text-xs font-bold">
                      ✓
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{ad.label}</p>
                  {ad.angle && (
                    <p className="text-[10px] text-muted truncate mt-0.5">
                      {ad.angle.replace(/_/g, " ")}
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Sticky bottom bar */}
      {selectedIds.size > 0 && (
        <div className="sticky bottom-0 bg-surface border-t border-border -mx-6 px-6 py-3 flex items-center justify-between">
          <span className="text-sm text-muted">
            {selectedIds.size} template{selectedIds.size !== 1 ? "s" : ""} selected
          </span>
          <button
            type="button"
            onClick={onNext}
            className="px-5 py-2 text-sm font-medium bg-accent text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            Next: Configure →
          </button>
        </div>
      )}
    </div>
  );
}
