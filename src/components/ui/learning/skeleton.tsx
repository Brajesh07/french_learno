import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("animate-pulse rounded-md bg-[var(--lla-accent)]", className)}
      {...props}
    />
  )
}

export { Skeleton }
