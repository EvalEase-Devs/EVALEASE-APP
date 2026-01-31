"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { TablerIcon } from "@tabler/icons-react";

interface StatCardProps {
  icon: TablerIcon;
  value: string | number;
  label: string;
  variant?: "default" | "primary" | "destructive" | "accent";
}

const variantStyles = {
  default: {
    iconBg: "bg-muted",
    iconColor: "text-muted-foreground",
  },
  primary: {
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
  },
  destructive: {
    iconBg: "bg-destructive/10",
    iconColor: "text-destructive",
  },
  accent: {
    iconBg: "bg-accent",
    iconColor: "text-accent-foreground",
  },
};

export function StatCard({ icon: Icon, value, label, variant = "default" }: StatCardProps) {
  const styles = variantStyles[variant];

  return (
    <Card className="flex flex-col justify-center">
      <CardContent className="p-4 text-center">
        <div className={`inline-flex items-center justify-center w-10 h-10 rounded-full ${styles.iconBg} mb-2`}>
          <Icon className={`h-5 w-5 ${styles.iconColor}`} />
        </div>
        <p className="text-3xl font-bold tracking-tight">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </CardContent>
    </Card>
  );
}
