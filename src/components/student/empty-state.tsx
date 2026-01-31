"use client";

import { IconConfetti } from "@tabler/icons-react";

interface EmptyStateProps {
  title: string;
  description: string;
}

export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex-1 flex items-center justify-center bg-accent/10 rounded-xl border border-accent/30">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/20 mb-4">
          <IconConfetti className="h-8 w-8 text-accent-foreground" />
        </div>
        <h3 className="text-xl font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1">{description}</p>
      </div>
    </div>
  );
}
