"use client"; // Error components must be Client Components

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { AlertTriangle } from "lucide-react";

export default function StudentError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Student Portal Error:", error);
  }, [error]);

  return (
    <>
      <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <span className="text-sm text-muted-foreground">Something went wrong</span>
        </div>
      </header>

      <div className="flex flex-1 flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 mb-6">
          <AlertTriangle className="h-10 w-10 text-destructive" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>Something went wrong</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          An unexpected error occurred in the Student portal. This has been logged automatically. You can try again or return to the dashboard.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground mt-2 font-mono">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex gap-3 mt-6">
          <Button onClick={reset} variant="default">
            Try Again
          </Button>
          <Button variant="outline" asChild>
            <a href="/student">Back to Dashboard</a>
          </Button>
        </div>
      </div>
    </>
  );
}
