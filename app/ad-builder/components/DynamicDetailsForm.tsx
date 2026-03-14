"use client";

import type { WineDetails } from "@/lib/ad-builder";

interface FieldDefinition {
  label: string;
  placeholder: string;
  type: "text" | "textarea";
  required?: boolean;
}

const FIELD_DEFINITIONS: Record<string, FieldDefinition> = {
  headline: { label: "Headline", placeholder: "e.g. 98-Point Napa Cab — $125 for $25", type: "text", required: true },
  score: { label: "Score / Points", placeholder: "e.g. 98 Points", type: "text" },
  pullQuote: { label: "Pull Quote", placeholder: "Short quote or tagline", type: "textarea" },
  retailPrice: { label: "Retail Price", placeholder: "$125", type: "text" },
  salePrice: { label: "Sale Price", placeholder: "$25", type: "text" },
  promoCode: { label: "Promo Code", placeholder: "FIRST50", type: "text" },
  ctaText: { label: "CTA Text", placeholder: "GET THIS DEAL", type: "text" },
  additionalNotes: { label: "Additional Notes", placeholder: "Any extra instructions...", type: "textarea" },
  reviewerName: { label: "Reviewer Name", placeholder: "e.g. Wine Spectator", type: "text" },
  quoteText: { label: "Quote Text", placeholder: "What the reviewer said...", type: "textarea" },
  starRating: { label: "Star Rating", placeholder: "5", type: "text" },
  productName: { label: "Product Name", placeholder: "e.g. 2023 Napa Valley Cabernet", type: "text" },
  comparisonPoint: { label: "Comparison Point", placeholder: "What are you comparing?", type: "text" },
  differentiators: { label: "Differentiators", placeholder: "Key differences from competitors...", type: "textarea" },
  urgencyText: { label: "Urgency Text", placeholder: "e.g. Only 12 bottles left!", type: "text" },
  casualCopy: { label: "Casual Copy", placeholder: "Conversational ad copy...", type: "textarea" },
  productMention: { label: "Product Mention", placeholder: "How to mention the product naturally", type: "text" },
  lifestyleContext: { label: "Lifestyle Context", placeholder: "e.g. backyard BBQ, date night", type: "text" },
};

interface DynamicDetailsFormProps {
  relevantFields: string[];
  details: WineDetails;
  onChange: (details: WineDetails) => void;
}

export default function DynamicDetailsForm({
  relevantFields,
  details,
  onChange,
}: DynamicDetailsFormProps) {
  // Always include headline + additionalNotes, then add type-specific fields
  const allFields = Array.from(
    new Set(["headline", ...relevantFields, "additionalNotes"]),
  );

  const handleChange = (key: string, value: string) => {
    onChange({ ...details, [key]: value });
  };

  const textFields = allFields.filter((f) => FIELD_DEFINITIONS[f]?.type === "text");
  const textareaFields = allFields.filter((f) => FIELD_DEFINITIONS[f]?.type === "textarea");

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {textFields.map((field) => {
          const def = FIELD_DEFINITIONS[field];
          if (!def) return null;
          return (
            <div key={field}>
              <label className="block text-xs font-medium text-muted mb-1">
                {def.label}
                {def.required && <span className="text-danger ml-0.5">*</span>}
              </label>
              <input
                type="text"
                value={(details as unknown as Record<string, string | undefined>)[field] ?? ""}
                onChange={(e) => handleChange(field, e.target.value)}
                placeholder={def.placeholder}
                className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background"
              />
            </div>
          );
        })}
      </div>
      {textareaFields.map((field) => {
        const def = FIELD_DEFINITIONS[field];
        if (!def) return null;
        return (
          <div key={field}>
            <label className="block text-xs font-medium text-muted mb-1">
              {def.label}
            </label>
            <textarea
              value={(details as unknown as Record<string, string | undefined>)[field] ?? ""}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder={def.placeholder}
              rows={3}
              className="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background resize-y"
            />
          </div>
        );
      })}
    </div>
  );
}
