import type { ReferenceAd } from "./reference-ads";

export type MetaStaticPromptOptions = {
  brandName: string;
  contextText: string;
  referenceAd: ReferenceAd;
  reviewThemesText?: string;
  commentThemesText?: string;
  wineDetailsOverride?: {
    headline?: string;
    score?: string;
    pullQuote?: string;
    retailPrice?: string;
    salePrice?: string;
    promoCode?: string;
    ctaText?: string;
    additionalNotes?: string;
  };
};

export type BuiltPrompt = {
  system: string;
  user: string;
  numberOfVariations: number;
};

export function buildMetaStaticNanoBananaPrompt(
  options: MetaStaticPromptOptions,
): BuiltPrompt {
  const {
    brandName,
    contextText,
    referenceAd,
    reviewThemesText,
    commentThemesText,
    wineDetailsOverride,
  } = options;

  const overrides = referenceAd.meta.promptOverrides ?? {};
  const numberOfVariations =
    typeof overrides.numberOfVariations === "number"
      ? overrides.numberOfVariations
      : 3;
  const pricingDisplay =
    typeof overrides.pricingDisplay === "string"
      ? (overrides.pricingDisplay as string)
      : "";
  const ctaStyle =
    typeof overrides.ctaStyle === "string" ? (overrides.ctaStyle as string) : "";

  const system = [
    "You are an expert direct-response copywriter focused on paid Meta ads.",
    "You write conversion-focused static image ads that respect brand guidelines and platform policies.",
    "",
    "Here is the brand context you must follow:",
    "",
    contextText,
  ]
    .filter(Boolean)
    .join("\n");

  const reviewBlock = reviewThemesText
    ? `Review themes (for proof and language):\n${reviewThemesText}\n`
    : "";
  const commentBlock = commentThemesText
    ? `Ad comment themes (questions, objections, language):\n${commentThemesText}\n`
    : "";

  const userLines: string[] = [];

  userLines.push(
    `Write ${numberOfVariations} high-performing Meta static image ad variations for ${brandName}.`,
  );
  userLines.push("");
  userLines.push("CAMPAIGN & OFFER");
  userLines.push(
    `- Objective: ${referenceAd.meta.objective ?? "conversions (new customers / purchases)"}`,
  );
  userLines.push(
    `- Core “nano banana” (simple, concrete promise): ${referenceAd.meta.nanoBanana ?? ""}`,
  );
  if (pricingDisplay) {
    userLines.push(`- Price display style: ${pricingDisplay}`);
  }
  if (ctaStyle) {
    userLines.push(`- CTA style: ${ctaStyle}`);
  }
  if (referenceAd.meta.angle) {
    userLines.push(`- Angle: ${referenceAd.meta.angle}`);
  }

  if (wineDetailsOverride) {
    userLines.push("");
    userLines.push("NEW WINE DETAILS (use these instead of the original where appropriate):");
    if (wineDetailsOverride.headline) {
      userLines.push(`- New headline / short name: ${wineDetailsOverride.headline}`);
    }
    if (wineDetailsOverride.score) {
      userLines.push(`- Score / rating: ${wineDetailsOverride.score}`);
    }
    if (wineDetailsOverride.retailPrice || wineDetailsOverride.salePrice) {
      userLines.push(
        `- Pricing: retail ${wineDetailsOverride.retailPrice ?? "n/a"}, offer ${wineDetailsOverride.salePrice ?? "n/a"}`,
      );
    }
    if (wineDetailsOverride.promoCode) {
      userLines.push(`- Promo code / member incentive: ${wineDetailsOverride.promoCode}`);
    }
    if (wineDetailsOverride.additionalNotes) {
      userLines.push(`- Additional notes: ${wineDetailsOverride.additionalNotes}`);
    }
  }

  userLines.push("");
  userLines.push("REFERENCE AD (iterate on this, do not copy verbatim):");
  userLines.push(`- Label: ${referenceAd.meta.label}`);
  userLines.push("");
  userLines.push("Primary text:");
  userLines.push(referenceAd.primaryText || "(none provided)");
  userLines.push("");
  userLines.push("Headline:");
  userLines.push(referenceAd.headline || "(none provided)");
  userLines.push("");
  userLines.push("Description:");
  userLines.push(referenceAd.description || "(none provided)");
  userLines.push("");
  if (referenceAd.visualNotes) {
    userLines.push("Visual notes (to align copy with layout):");
    userLines.push(referenceAd.visualNotes);
    userLines.push("");
  }

  if (reviewBlock || commentBlock) {
    userLines.push("SOCIAL PROOF & THEMES TO LEVERAGE");
    if (reviewBlock) userLines.push(reviewBlock);
    if (commentBlock) userLines.push(commentBlock);
  }

  userLines.push("");
  userLines.push("RULES:");
  userLines.push(
    "- Make the core promise unmistakable in the first line of each variation.",
  );
  userLines.push(
    "- Preserve, in some form, any score, price anchor, promo code, and scarcity language from the reference ad, unless they clearly conflict with brand rules.",
  );
  userLines.push(
    "- Use vivid but plain language; avoid jargon unless it is clearly explained.",
  );
  userLines.push(
    "- Keep within Meta ad policies (no shaming, no prohibited claims, no excessive ALL CAPS).",
  );

  userLines.push("");
  userLines.push("OUTPUT FORMAT (critical):");
  userLines.push(
    `Reply with ONLY a raw JSON array of exactly ${numberOfVariations} objects. No markdown, no code fences, no text before or after the array.`,
  );
  userLines.push(
    'Each object must have exactly these keys: "primaryText", "headline", "description".',
  );
  userLines.push("Example: [{\"primaryText\":\"...\",\"headline\":\"...\",\"description\":\"...\"}, ...]");

  const user = userLines.join("\n");

  return { system, user, numberOfVariations };
}

