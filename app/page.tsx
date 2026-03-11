import Link from "next/link";

export default function HomePage() {
  return (
    <div className="py-12">
      <h1 className="text-3xl font-semibold tracking-tight mb-2">
        Rory the Marketer
      </h1>
      <p className="text-muted text-lg mb-10 max-w-xl">
        Your marketing ops hub. Write briefs, get copy assistance, and manage brand context all in one place.
      </p>

      <div className="grid gap-4 sm:grid-cols-3">
        <Link
          href="/context-hub"
          className="group rounded-xl border border-border bg-surface p-6 hover:border-accent transition-colors"
        >
          <h2 className="font-semibold mb-1 group-hover:text-accent transition-colors">
            Context Hub
          </h2>
          <p className="text-sm text-muted">
            Brand voice, personas, swipe files, and reference material.
          </p>
        </Link>

        <Link
          href="/briefs"
          className="group rounded-xl border border-border bg-surface p-6 hover:border-accent transition-colors"
        >
          <h2 className="font-semibold mb-1 group-hover:text-accent transition-colors">
            Briefs
          </h2>
          <p className="text-sm text-muted">
            Generate ad creative briefs with brand context and persona targeting.
          </p>
        </Link>

        <Link
          href="/copywriter"
          className="group rounded-xl border border-border bg-surface p-6 hover:border-accent transition-colors"
        >
          <h2 className="font-semibold mb-1 group-hover:text-accent transition-colors">
            Copywriter
          </h2>
          <p className="text-sm text-muted">
            Get copy in your brand voice using swipes and context as reference.
          </p>
        </Link>
      </div>
    </div>
  );
}
