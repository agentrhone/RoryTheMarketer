import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { nanoid } from "nanoid";
import { getBrand } from "@/lib/brands";
import type { WineDetails, GeneratedAd, AspectRatio } from "@/lib/ad-builder";
import { GENERATED_SUBDIR, ASPECT_RATIO_CONFIG } from "@/lib/ad-builder";
import { getReferenceAdById, getReferenceAdStyleImagePath } from "@/lib/reference-ads";
import { addGeneration, ensureSubdir } from "@/lib/ad-builder-storage";
import { buildPrompt } from "@/lib/gemini";
import { generateWithFal } from "@/lib/fal";

export const maxDuration = 120;

function fileToDataUri(filePath: string): string {
  const buffer = fs.readFileSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap: Record<string, string> = {
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
  };
  const mime = mimeMap[ext] || "image/png";
  return `data:${mime};base64,${buffer.toString("base64")}`;
}

async function blobToDataUri(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;
}

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const brandId = formData.get("brand") as string;

  if (!brandId || !getBrand(brandId)) {
    return NextResponse.json({ error: "Invalid brand" }, { status: 400 });
  }

  const referenceId = formData.get("referenceId") as string;
  const wineDetailsRaw = formData.get("wineDetails") as string | null;
  const bottleImage = formData.get("bottleImage") as File | null;
  const backgroundImage = formData.get("backgroundImage") as File | null;
  const aspectRatio = (formData.get("aspectRatio") as AspectRatio) || "1:1";
  const imagesPerPrompt = Math.min(4, Math.max(1, parseInt(formData.get("imagesPerPrompt") as string) || 1));
  const imagePromptModifier = (formData.get("imagePromptModifier") as string) || "";

  if (!referenceId) {
    return NextResponse.json({ error: "referenceId is required" }, { status: 400 });
  }

  const referenceAd = getReferenceAdById(referenceId);
  if (!referenceAd) {
    return NextResponse.json({ error: `Reference ad not found: ${referenceId}` }, { status: 404 });
  }

  let wineDetails: WineDetails = { headline: "Wine offer" };
  if (wineDetailsRaw) {
    try {
      wineDetails = JSON.parse(wineDetailsRaw) as WineDetails;
    } catch {
      return NextResponse.json({ error: "Invalid wineDetails JSON" }, { status: 400 });
    }
  }

  const styleName = referenceAd.meta.label || referenceId;
  const prompt = buildPrompt(wineDetails, styleName, {
    imagePromptModifier: imagePromptModifier || undefined,
    aspectRatio,
  });

  const imageUrls: string[] = [];

  // Add reference style image
  const styleImagePath = getReferenceAdStyleImagePath(referenceId);
  if (styleImagePath) {
    imageUrls.push(fileToDataUri(styleImagePath));
  }

  // Add bottle image
  if (bottleImage && bottleImage.size > 0) {
    imageUrls.push(await blobToDataUri(bottleImage));
  }

  // Add background image
  if (backgroundImage && backgroundImage.size > 0) {
    imageUrls.push(await blobToDataUri(backgroundImage));
  }

  const dims = ASPECT_RATIO_CONFIG[aspectRatio];

  try {
    const result = await generateWithFal({
      prompt,
      imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
      numImages: imagesPerPrompt,
      imageSize: { width: dims.width, height: dims.height },
    });

    const genDir = ensureSubdir(brandId, GENERATED_SUBDIR);
    const generations: GeneratedAd[] = [];
    const failures: { index: number; error: string }[] = [];

    for (let i = 0; i < result.images.length; i++) {
      try {
        const img = result.images[i];
        const ext = img.mimeType.includes("png") ? ".png" : img.mimeType.includes("webp") ? ".webp" : ".jpg";
        const genFilename = `${nanoid()}${ext}`;
        fs.writeFileSync(
          path.join(genDir, genFilename),
          Buffer.from(img.base64, "base64"),
        );

        const gen: GeneratedAd = {
          id: nanoid(),
          styleId: referenceId,
          styleName: `${styleName} (FAL ${i + 1})`,
          filename: genFilename,
          wineDetails,
          createdAt: new Date().toISOString(),
          referenceAdId: referenceId,
          aspectRatio,
          backend: "fal",
        };

        addGeneration(brandId, gen);
        generations.push(gen);
      } catch (err) {
        failures.push({
          index: i,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return NextResponse.json({ generations, failures });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "FAL generation failed" },
      { status: 500 },
    );
  }
}
