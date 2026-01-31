"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { IconSparkles } from "@tabler/icons-react";

interface WelcomeCardProps {
  firstName: string;
  pendingCount: number;
  completionRate: number;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Burning the midnight oil?";
}

export function WelcomeCard({ firstName, pendingCount, completionRate }: WelcomeCardProps) {
  const greeting = getGreeting();
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <Card className="lg:col-span-2 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground mb-1">{greeting}</p>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              {firstName}
              <IconSparkles className="h-5 w-5 text-secondary" />
            </h1>
            <p className="text-sm text-muted-foreground mt-2">{today}</p>
          </div>
          <div className="text-right">
            {completionRate === 100 ? (
              <Badge variant="secondary" className="text-xs">
                <IconSparkles className="h-3 w-3 mr-1" />
                All done!
              </Badge>
            ) : (
              pendingCount > 0 && (
                <Badge variant="outline" className="text-xs">
                  {pendingCount} pending
                </Badge>
              )
            )}
          </div>
        </div>

        {/* Progress Section */}
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Completion</span>
            <span className="font-semibold">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );
}
