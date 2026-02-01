import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Skeleton Loading System
 * 
 * Centralized skeleton components for consistent loading states across the app.
 * Each component matches the layout of its corresponding data component.
 */

// ============================================
// CARD GRID SKELETON
// For grids of cards (assignments, subjects, etc.)
// ============================================

interface CardsGridSkeletonProps {
    count?: number;
    className?: string;
}

export function CardsGridSkeleton({ count = 3, className }: CardsGridSkeletonProps) {
    return (
        <div className={className || "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"}>
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i} className="overflow-hidden">
                    <CardHeader className="space-y-2">
                        {/* Badge */}
                        <Skeleton className="h-5 w-20" />
                        {/* Title */}
                        <Skeleton className="h-6 w-3/4" />
                        {/* Subtitle */}
                        <Skeleton className="h-4 w-1/2" />
                    </CardHeader>
                    <CardContent className="space-y-2">
                        {/* Description lines */}
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                    </CardContent>
                    <CardFooter className="gap-2">
                        {/* Action buttons */}
                        <Skeleton className="h-9 w-24" />
                        <Skeleton className="h-9 w-24" />
                    </CardFooter>
                </Card>
            ))}
        </div>
    );
}

// ============================================
// STATS SKELETON
// For dashboard stat cards (4 small cards)
// ============================================

interface StatsSkeletonProps {
    count?: number;
}

export function StatsSkeleton({ count = 4 }: StatsSkeletonProps) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: count }).map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        {/* Icon placeholder */}
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        {/* Value */}
                        <Skeleton className="h-8 w-12 mb-1" />
                        {/* Label */}
                        <Skeleton className="h-3 w-20" />
                    </CardContent>
                </Card>
            ))}
        </div>
    );
}

// ============================================
// LIST SKELETON
// For simple list layouts
// ============================================

interface ListSkeletonProps {
    count?: number;
}

export function ListSkeleton({ count = 5 }: ListSkeletonProps) {
    return (
        <div className="space-y-3">
            {Array.from({ length: count }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-lg border bg-card">
                    {/* Avatar/Icon */}
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="flex-1 space-y-2">
                        {/* Title */}
                        <Skeleton className="h-4 w-1/3" />
                        {/* Subtitle */}
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                    {/* Action */}
                    <Skeleton className="h-8 w-20" />
                </div>
            ))}
        </div>
    );
}

// ============================================
// TABLE SKELETON
// For table layouts
// ============================================

interface TableSkeletonProps {
    rows?: number;
    columns?: number;
}

export function TableSkeleton({ rows = 5, columns = 4 }: TableSkeletonProps) {
    return (
        <div className="rounded-md border">
            {/* Header */}
            <div className="border-b bg-muted/50">
                <div className="flex items-center gap-4 p-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <Skeleton key={i} className="h-4 flex-1" />
                    ))}
                </div>
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIndex) => (
                <div key={rowIndex} className="border-b last:border-0">
                    <div className="flex items-center gap-4 p-4">
                        {Array.from({ length: columns }).map((_, colIndex) => (
                            <Skeleton key={colIndex} className="h-4 flex-1" />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
}

// ============================================
// CONTENT SKELETON
// For full-page content loading
// ============================================

export function ContentSkeleton() {
    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-2/3" />
            </div>
            {/* Content blocks */}
            <div className="space-y-3">
                <Skeleton className="h-20 w-full" />
                <Skeleton className="h-40 w-full" />
                <Skeleton className="h-32 w-full" />
            </div>
        </div>
    );
}
