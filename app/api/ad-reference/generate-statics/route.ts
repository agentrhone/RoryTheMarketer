import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getBrand } from "@/lib/brands";
import type { WineDetails, GeneratedAd, AspectRatio } from "@/lib/ad-builder";
import { GENERATED_SUBDIR } from "@/lib/ad-builder";
import {
  getReferenceAdById,
  getReferenceAdStyleImagePath,
} from "@/lib/reference-ads";
import { addGeneration, ensureSubdir } from "@/lib/ad-builder-storage";
import { generateAdImage } from "@/lib/gemini";

export const maxDuration = 120;

function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const map: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  return map[ext] || "image/png";
}

type VariationInput = {
  primaryText: string;
  headline: string;
  description: string;
};

function variationToWineDetails(
  v: VariationInput,
  override?: Partial<WineDetails>,
): WineDetails {
  const headline = v.headline?.trim() || "Wine offer";
  const pullQuote =
    v.primaryText?.trim().slice(0, 120) ||
    v.description?.trim().slice(0, 120) ||
    undefined;
  const additionalNotes = [
    v.primaryText?.trim(),
    v.description?.trim(),
  ]
    .filter(Boolean)
    .join("\n\n");
  return {
    headline,
    pullQuote: pullQuote || undefined,
    additionalNotes: additionalNotes || undefined,
    ...override,
  };
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const brandId = formData.get("brand") as string;
  const referenceId = formData.get("referenceId") as string;
  const variationsRaw = formData.get("variations") as string;
  const wineDetailsOverrideRaw = formData.get("wineDetailsOverride") as string | null;
  const bottleImage = formData.get("bottleImage") as File | null;
  const backgroundImage = formData.get("backgroundImage") as File | null;
  const aspectRatio = (formData.get("aspectRatio") as AspectRatio) || undefined;
  const imagePromptModifier = (formData.get("imagePromptModifier") as string) || undefined;

  if (!brandId || !getBrand(brandId)) {
    return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  }
  if (!referenceId) {
    return NextResponse.json(
      { error: "referenceId is required" },
      { status: 400 },
    );
  }
  if (!variationsRaw || !bottleImage?.size) {
    return NextResponse.json(
      {
        error:
          "variations (JSON array) and bottleImage are required. Use the bottle (and optional background) from the Images section.",
      },
      { status: 400 },
    );
  }

  let variations: VariationInput[];
  try {
    const parsed = JSON.parse(variationsRaw);
    if (!Array.isArray(parsed) || parsed.length === 0)
      throw new Error("Need at least one variation");
    variations = parsed as VariationInput[];
  } catch {
    return NextResponse.json(
      { error: "variations must be a JSON array of { primaryText, headline, description }" },
      { status: 400 },
    );
  }

  const referenceAd = getReferenceAdById(referenceId);
  if (!referenceAd) {
    return NextResponse.json(
      { error: `Reference ad not found: ${referenceId}` },
      { status: 404 },
    );
  }
  if (referenceAd.meta.brand && referenceAd.meta.brand !== brandId) {
    return NextResponse.json(
      { error: "Reference ad is for a different brand" },
      { status: 400 },
    );
  }

  const styleImagePath = getReferenceAdStyleImagePath(referenceId);
  if (!styleImagePath) {
    return NextResponse.json(
      {
        error: `Reference ad has no style image (imageFile). Add an image (e.g. PNG) next to the markdown in context/Examples/Ads/Static.`,
      },
      { status: 400 },
    );
  }

  const bottleBuffer = Buffer.from(await bottleImage.arrayBuffer());
  const bottleBase64 = bottleBuffer.toString("base64");
  const bottleMimeType = getMimeType(bottleImage.name);

  let bgBase64: string | undefined;
  let bgMimeType: string | undefined;
  if (backgroundImage?.size) {
    const bgBuffer = Buffer.from(await backgroundImage.arrayBuffer());
    bgBase64 = bgBuffer.toString("base64");
    bgMimeType = getMimeType(backgroundImage.name);
  }

  const styleBuffer = fs.readFileSync(styleImagePath);
  const styleBase64 = styleBuffer.toString("base64");
  const styleMimeType = getMimeType(path.basename(styleImagePath));
  const styleName = referenceAd.meta.label || referenceId;

  let wineDetailsOverride: Partial<WineDetails> = {};
  if (wineDetailsOverrideRaw) {
    try {
      wineDetailsOverride = JSON.parse(wineDetailsOverrideRaw) as Partial<WineDetails>;
    } catch {
      // ignore
    }
  }

  const results = await Promise.allSettled(
    variations.map(async (v, idx) => {
      const wineDetails = variationToWineDetails(v, wineDetailsOverride);
      const result = await generateAdImage({
        referenceImageBase64: styleBase64,
        referenceImageMimeType: styleMimeType,
        bottleImageBase64: bottleBase64,
        bottleImageMimeType: bottleMimeType,
        backgroundImageBase64: bgBase64,
        backgroundImageMimeType: bgMimeType,
        wineDetails,
        styleName: `${styleName} – variation ${idx + 1}`,
        imagePromptModifier,
        aspectRatio,
      });

      const genDir = ensureSubdir(brandId, GENERATED_SUBDIR);
      const ext =
        result.mimeType === "image/png"
          ? ".png"
          : result.mimeType === "image/webp"
            ? ".webp"
            : ".jpg";
      const genFilename = `${nanoid()}${ext}`;
      fs.writeFileSync(
        path.join(genDir, genFilename),
        Buffer.from(result.imageBase64, "base64"),
      );

      const gen: GeneratedAd = {
        id: nanoid(),
        styleId: referenceId,
        styleName: `${styleName} (${idx + 1})`,
        filename: genFilename,
        wineDetails,
        createdAt: new Date().toISOString(),
      };
      addGeneration(brandId, gen);
      return gen;
    }),
  );

  const generations: GeneratedAd[] = [];
  const failures: { index: number; error: string }[] = [];

  results.forEach((r, i) => {
    if (r.status === "fulfilled") generations.push(r.value);
    else
      failures.push({
        index: i + 1,
        error: r.reason instanceof Error ? r.reason.message : String(r.reason),
      });
  });

  return NextResponse.json({ generations, failures });
}
