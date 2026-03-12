"use client";

import { useCallback, useEffect, useState } from "react";
import { CATEGORIES, getSectionDef } from "@/lib/context-sections";
import Sidebar from "./components/Sidebar";
import MarkdownEditor from "./components/MarkdownEditor";
import SwipeFilesPanel from "./components/SwipeFilesPanel";
import MetaCommentsPanel from "./components/MetaCommentsPanel";
import AdAccountPanel from "./components/AdAccountPanel";
import PlaceholderPanel from "./components/PlaceholderPanel";
import ReviewsPanel from "./components/ReviewsPanel";
import CompetitorAdsPanel from "./components/CompetitorAdsPanel";

const BRAND_ID = "winespies";

export default function ContextHubPage() {
  const [activeSection, setActiveSection] = useState(
    CATEGORIES[0].sections[0].id
  );
  const [status, setStatus] = useState<Record<string, boolean>>({});

  const fetchStatus = useCallback(() => {
    fetch(`/api/context/status?brand=${BRAND_ID}`)
      .then((r) => r.json())
      .then((d) => setStatus(d.status ?? {}))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchStatus();
  }, [fetchStatus]);

  const section = getSectionDef(activeSection);

  const renderContent = () => {
    if (!section) return null;

    switch (section.type) {
      case "markdown":
        return (
          <MarkdownEditor
            key={section.id}
            sectionId={section.id}
            label={section.label}
            onSaved={fetchStatus}
          />
        );
      case "swipe-files":
        return <SwipeFilesPanel onChanged={fetchStatus} />;
      case "meta-comments":
        return <MetaCommentsPanel />;
      case "reviews":
        return <ReviewsPanel onChanged={fetchStatus} />;
      case "competitor-ads":
        return <CompetitorAdsPanel />;
      case "ad-account":
        return <AdAccountPanel />;
      case "placeholder":
        return <PlaceholderPanel label={section.label} />;
      default:
        return null;
    }
  };

  return (
    <div className="-mx-6 -mt-8 flex min-h-[calc(100vh-57px)]">
      <Sidebar
        activeSection={activeSection}
        onSelect={setActiveSection}
        status={status}
      />

      <main className="flex-1 min-w-0 p-8 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
