import type { AdType } from "./ad-builder";
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

// --- Type-specific prompt builders ---

function buildTypeSpecificInstructions(type: AdType): string {
  switch (type) {
    case "testimonial":
      return [
        "AD TYPE: Testimonial / Review",
        "- Lead with the reviewer quote or star rating as the primary hook",
        "- Include the reviewer name and credibility signal (publication, role, etc.)",
        "- The product name should be clearly visible but secondary to the social proof",
        "- Keep the tone authentic and trustworthy — avoid hard sell",
      ].join("\n");

    case "comparison":
      return [
        "AD TYPE: Us vs Them / Comparison",
        "- Structure the copy around a clear comparison point (price, quality, convenience)",
        "- Use specific differentiators — avoid vague claims",
        "- Make the value gap obvious in the first line",
        "- Include price anchoring if available (their price vs our price)",
      ].join("\n");

    case "offer":
      return [
        "AD TYPE: Offer / Promo",
        "- Lead with the urgency element (limited time, limited stock, deadline)",
        "- Make the discount/savings unmistakable and prominent",
        "- Include promo code prominently if available",
        "- CTA should be direct and action-oriented",
      ].join("\n");

    case "ugc":
      return [
        "AD TYPE: UGC-Style",
        "- Write in a casual, first-person voice — like a real customer sharing",
        "- Mention the product naturally, not as a sales pitch",
        "- Include lifestyle context (when/where/why they enjoy it)",
        "- Avoid marketing jargon — keep it conversational and authentic",
      ].join("\n");

    case "pdp":
    default:
      return [
        "AD TYPE: PDP / Product Hero",
        "- Lead with the strongest proof point (score, award, or expert quote)",
        "- Use price anchoring if available (retail vs sale)",
        "- CTA should drive direct purchase action",
      ].join("\n");
  }
}

export function buildPromptForType(
  type: AdType,
  options: MetaStaticPromptOptions,
): BuiltPrompt {
  const base = buildMetaStaticNanoBananaPrompt(options);

  const typeInstructions = buildTypeSpecificInstructions(type);

  const enhancedUser = [
    typeInstructions,
    "",
    base.user,
  ].join("\n");

  return {
    system: base.system,
    user: enhancedUser,
    numberOfVariations: base.numberOfVariations,
  };
}

