// Ad Builder types and constants

export interface AdStyle {
  id: string;
  name: string;
  filename: string;
  addedAt: string;
}

export interface AdStylesData {
  updatedAt: string;
  styles: AdStyle[];
}

export interface GeneratedAd {
  id: string;
  styleId: string;
  styleName: string;
  filename: string;
  wineDetails: WineDetails;
  createdAt: string;
}

export interface GenerationsData {
  updatedAt: string;
  generations: GeneratedAd[];
}

export interface WineDetails {
  headline: string;
  score?: string;
  pullQuote?: string;
  retailPrice?: string;
  salePrice?: string;
  promoCode?: string;
  ctaText?: string;
  additionalNotes?: string;
}

export const STYLES_FILENAME = "styles.json";
export const GENERATIONS_FILENAME = "generations.json";
export const AD_BUILDER_DIR = "ad-builder";
export const STYLES_SUBDIR = "styles";
export const UPLOADS_SUBDIR = "uploads";
export const GENERATED_SUBDIR = "generated";
