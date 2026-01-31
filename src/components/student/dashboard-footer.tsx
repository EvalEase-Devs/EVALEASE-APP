"use client";

import { Button } from "@/components/ui/button";
import { IconListCheck, IconCheck } from "@tabler/icons-react";

interface DashboardFooterProps {
  onViewAll: () => void;
  onViewSubmitted: () => void;
}

export function DashboardFooter({ onViewAll, onViewSubmitted }: DashboardFooterProps) {
  return (
    <div className="flex items-center justify-center gap-3 pt-2 border-t">
      <Button variant="outline" className="flex-1 max-w-xs" onClick={onViewAll}>
        <IconListCheck className="mr-2 h-4 w-4" />
        All Assignments
      </Button>
      <Button variant="outline" className="flex-1 max-w-xs" onClick={onViewSubmitted}>
        <IconCheck className="mr-2 h-4 w-4" />
        Submitted
      </Button>
    </div>
  );
}
