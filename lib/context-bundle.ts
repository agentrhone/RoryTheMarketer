import fs from "fs";
import path from "path";
import { getBrandContextDir } from "./brands";

function readMarkdownFile(filePath: string): string {
  if (!fs.existsSync(filePath)) return "";
  return fs.readFileSync(filePath, "utf-8").trim();
}

export interface ContextBundle {
  brand: string;
  voice: string;
  personas: string;
  usps: string;
  aboutMe: string;
  wineCopyGuidance: string;
  abTestLearnings: string;
  videoBrief: string;
  videoCreative: string;
  imagePromptModifier: string;
}

export function getContextBundle(brandId: string): ContextBundle {
  const dir = getBrandContextDir(brandId);

  return {
    brand: brandId,
    voice: readMarkdownFile(path.join(dir, "voice-guidelines.md")),
    personas: readMarkdownFile(path.join(dir, "personas.md")),
    usps: readMarkdownFile(path.join(dir, "usps.md")),
    aboutMe: readMarkdownFile(path.join(dir, "aboutme.md")),
    wineCopyGuidance: readMarkdownFile(path.join(dir, "wine-copy-guidance.md")),
    abTestLearnings: readMarkdownFile(path.join(dir, "ab-test-learnings.md")),
    videoBrief: readMarkdownFile(path.join(dir, "video_brief.md")),
    videoCreative: readMarkdownFile(path.join(dir, "video-creative.md")),
    imagePromptModifier: readMarkdownFile(path.join(dir, "image-prompt-modifier.md")),
  };
}

export function formatContextForPrompt(bundle: ContextBundle): string {
  const sections: string[] = [];

  if (bundle.voice) {
    sections.push(`## Brand Voice\n\n${bundle.voice}`);
  }
  if (bundle.personas) {
    sections.push(`## Target Personas\n\n${bundle.personas}`);
  }
  if (bundle.usps) {
    sections.push(`## Unique Selling Propositions\n\n${bundle.usps}`);
  }
  if (bundle.aboutMe) {
    sections.push(`## About the Brand\n\n${bundle.aboutMe}`);
  }
  if (bundle.wineCopyGuidance) {
    sections.push(`## Wine Copy Guidance\n\n${bundle.wineCopyGuidance}`);
  }
  if (bundle.abTestLearnings) {
    sections.push(`## A/B Test Learnings\n\n${bundle.abTestLearnings}`);
  }

  return sections.join("\n\n---\n\n");
}
