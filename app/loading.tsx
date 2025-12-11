import { Skeleton } from '@/components/ui/skeleton'

export default function Loading() {
  return (
    <div className="flex h-screen flex-col bg-[#0d0d0d]">
      {/* Header Skeleton */}
      <div className="flex h-12 items-center justify-between border-b border-[#2a2a2a] bg-[#0d0d0d] px-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-5 w-5 bg-[#2a2a2a]" />
          <Skeleton className="h-4 w-24 bg-[#2a2a2a]" />
        </div>
        <Skeleton className="h-8 w-8 bg-[#2a2a2a]" />
      </div>

      {/* Main Content Skeleton */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar Skeleton */}
        <div className="w-[280px] shrink-0 border-r border-[#2a2a2a] p-4">
          <Skeleton className="mb-4 h-8 w-full bg-[#2a2a2a]" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-6 w-full bg-[#2a2a2a]" />
            ))}
          </div>
        </div>

        {/* Editor Skeleton */}
        <div className="flex-1 p-4">
          <div className="space-y-2">
            {Array.from({ length: 20 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-4 bg-[#2a2a2a]"
                style={{ width: `${Math.random() * 40 + 60}%` }}
              />
            ))}
          </div>
        </div>

        {/* Right Sidebar Skeleton */}
        <div className="w-[380px] shrink-0 border-l border-[#2a2a2a] p-4">
          <Skeleton className="mb-4 h-8 w-full bg-[#2a2a2a]" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-4 w-3/4 bg-[#2a2a2a]" />
                <Skeleton className="h-20 w-full bg-[#2a2a2a]" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
