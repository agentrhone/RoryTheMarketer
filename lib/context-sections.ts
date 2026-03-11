export type SectionType = "markdown" | "swipe-files" | "meta-comments" | "ad-account" | "placeholder";

export interface SectionDef {
  id: string;
  label: string;
  type: SectionType;
  /** Filename relative to brand context dir (markdown sections only) */
  file?: string;
}

export interface CategoryDef {
  id: string;
  number: number;
  title: string;
  subtitle: string;
  sections: SectionDef[];
}

export const CATEGORIES: CategoryDef[] = [
  {
    id: "brand-dna",
    number: 1,
    title: "Brand DNA",
    subtitle: "Identity & Core Values",
    sections: [
      { id: "voice-guidelines", label: "Brand Voice & Guidelines", type: "markdown", file: "voice-guidelines.md" },
      { id: "usps", label: "Products & USPs", type: "markdown", file: "usps.md" },
      { id: "personas", label: "Customer Personas", type: "markdown", file: "personas.md" },
      { id: "aboutme", label: "Founder Story", type: "markdown", file: "aboutme.md" },
      { id: "wine-copy-guidance", label: "Wine Copy Guidance", type: "markdown", file: "wine-copy-guidance.md" },
    ],
  },
  {
    id: "strategy",
    number: 2,
    title: "Strategy",
    subtitle: "Market Position & Testing",
    sections: [
      { id: "ab-test-learnings", label: "A/B Test Learnings", type: "markdown", file: "ab-test-learnings.md" },
      { id: "video-creative", label: "Video Creative Guidelines", type: "markdown", file: "video-creative.md" },
      { id: "video-brief", label: "Video Brief Template", type: "markdown", file: "video_brief.md" },
      { id: "competitive-landscape", label: "Competitive Landscape", type: "placeholder" },
    ],
  },
  {
    id: "creative-ops",
    number: 3,
    title: "Creative Ops",
    subtitle: "Execution & Resources",
    sections: [
      { id: "swipe-files", label: "Swipe Files", type: "swipe-files" },
      { id: "meta-comments", label: "Meta Ad Comments", type: "meta-comments" },
      { id: "ad-account", label: "Ad Account Details", type: "ad-account" },
    ],
  },
];

export const ALL_SECTIONS: SectionDef[] = CATEGORIES.flatMap((c) => c.sections);

export function getSectionDef(sectionId: string): SectionDef | undefined {
  return ALL_SECTIONS.find((s) => s.id === sectionId);
}

/** Only the markdown sections (ones with a file) */
export const MARKDOWN_SECTIONS = ALL_SECTIONS.filter(
  (s): s is SectionDef & { file: string } => s.type === "markdown" && !!s.file
);
