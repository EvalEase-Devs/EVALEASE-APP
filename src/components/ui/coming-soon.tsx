import type { TablerIcon } from "@tabler/icons-react";

interface ComingSoonProps {
  title: string;
  description: string;
  icon?: TablerIcon;
  variant?: "feature" | "settings" | "admin";
}

/**
 * Coming Soon — three distinct layouts to avoid the "17 identical pages" problem.
 *
 * Variant A ("feature")  — Horizontal: icon left, text right. For feature pages (Analytics, Reports).
 * Variant B ("settings") — Centered, minimal, no icon. For Settings, Notifications, Profile.
 * Variant C ("admin")    — Compact dashed-border card. For all Admin portal placeholders.
 */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  variant = "feature",
}: ComingSoonProps) {
  /* ─── Variant B: Settings / Config ─── */
  if (variant === "settings") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <h2 className="text-section-title">{title}</h2>
        <p className="text-caption mt-2 max-w-sm">{description}</p>
      </div>
    );
  }

  /* ─── Variant C: Admin / System ─── */
  if (variant === "admin") {
    return (
      <div className="flex flex-1 items-start p-4 pt-0 animate-in fade-in duration-500">
        <div className="w-full rounded-xl border border-dashed border-border/60 bg-muted/30 px-8 py-10 text-center">
          <p className="text-label">{title} — in development</p>
          <p className="text-caption mt-1">{description}</p>
        </div>
      </div>
    );
  }

  /* ─── Variant A: Feature (default) ─── */
  return (
    <div className="flex flex-1 items-start p-6 pt-2 animate-in fade-in duration-500">
      <div className="flex items-start gap-4 max-w-lg">
        {Icon && (
          <Icon
            size={24}
            className="text-muted-foreground mt-0.5 shrink-0"
          />
        )}
        <div>
          <h2 className="text-section-title">{title}</h2>
          <p className="text-caption mt-1">{description}</p>
        </div>
      </div>
    </div>
  );
}
