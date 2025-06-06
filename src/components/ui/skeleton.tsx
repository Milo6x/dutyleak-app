import { cn } from "@/lib/utils"

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-primary/10", className)}
      {...props}
    />
  )
}

function DashboardCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
      <div className="flex flex-col space-y-1.5 p-6">
        <Skeleton className="h-4 w-[100px]" />
        <Skeleton className="h-3 w-[150px]" />
      </div>
      <div className="p-6 pt-0">
        <Skeleton className="h-8 w-[80px] mb-2" />
        <Skeleton className="h-3 w-full" />
      </div>
    </div>
  )
}

function DashboardGridSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <DashboardCardSkeleton key={i} />
      ))}
    </div>
  )
}

export { Skeleton, DashboardCardSkeleton, DashboardGridSkeleton }
