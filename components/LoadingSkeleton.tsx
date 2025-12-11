/**
 * Reusable loading skeleton components for different UI sections
 */

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

/**
 * Code Editor skeleton
 */
export function CodeEditorSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2 p-4', className)}>
      {Array.from({ length: 20 }).map((_, i) => (
        <Skeleton
          key={i}
          className="h-4 bg-[#2a2a2a]"
          style={{ width: `${Math.random() * 40 + 60}%` }}
        />
      ))}
    </div>
  );
}

/**
 * Thread List skeleton
 */
export function ThreadListSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-2 p-4', className)}>
      <Skeleton className="mb-4 h-8 w-full bg-[#2a2a2a]" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-12 w-full bg-[#2a2a2a]" />
        ))}
      </div>
    </div>
  );
}

/**
 * AI Response skeleton
 */
export function AIResponseSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('space-y-3 p-4 rounded-lg border border-[#2a2a2a]', className)}>
      <Skeleton className="h-5 w-24 bg-[#2a2a2a]" />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-4 bg-[#2a2a2a]"
            style={{ width: `${Math.random() * 30 + 70}%` }}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Card skeleton
 */
export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('rounded-lg border border-[#2a2a2a] p-4', className)}>
      <Skeleton className="mb-3 h-6 w-3/4 bg-[#2a2a2a]" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full bg-[#2a2a2a]" />
        <Skeleton className="h-4 w-5/6 bg-[#2a2a2a]" />
      </div>
    </div>
  );
}

/**
 * List item skeleton
 */
export function ListItemSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center gap-3 p-2', className)}>
      <Skeleton className="h-10 w-10 rounded-full bg-[#2a2a2a]" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-3/4 bg-[#2a2a2a]" />
        <Skeleton className="h-3 w-1/2 bg-[#2a2a2a]" />
      </div>
    </div>
  );
}

/**
 * Table skeleton
 */
export function TableSkeleton({
  rows = 5,
  columns = 4,
  className,
}: {
  rows?: number;
  columns?: number;
  className?: string;
}) {
  return (
    <div className={cn('space-y-2', className)}>
      {/* Header */}
      <div className="flex gap-2 border-b border-[#2a2a2a] pb-2">
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className="h-5 flex-1 bg-[#2a2a2a]" />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-2 py-2">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className="h-4 flex-1 bg-[#2a2a2a]" />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * Header skeleton
 */
export function HeaderSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('flex h-12 items-center justify-between border-b border-[#2a2a2a] px-4', className)}>
      <div className="flex items-center gap-3">
        <Skeleton className="h-5 w-5 bg-[#2a2a2a]" />
        <Skeleton className="h-4 w-24 bg-[#2a2a2a]" />
      </div>
      <Skeleton className="h-8 w-8 bg-[#2a2a2a]" />
    </div>
  );
}

/**
 * Sidebar skeleton
 */
export function SidebarSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn('w-[280px] shrink-0 border-r border-[#2a2a2a] p-4', className)}>
      <Skeleton className="mb-4 h-8 w-full bg-[#2a2a2a]" />
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className="h-6 w-full bg-[#2a2a2a]" />
        ))}
      </div>
    </div>
  );
}

/**
 * Full page skeleton with layout
 */
export function FullPageSkeleton() {
  return (
    <div className="flex h-screen flex-col bg-[#0d0d0d]">
      <HeaderSkeleton />
      <div className="flex flex-1 overflow-hidden">
        <SidebarSkeleton />
        <CodeEditorSkeleton className="flex-1" />
        <div className="w-[380px] shrink-0 border-l border-[#2a2a2a] p-4">
          <Skeleton className="mb-4 h-8 w-full bg-[#2a2a2a]" />
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <AIResponseSkeleton key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Inline loading spinner
 */
export function InlineSpinner({ className }: { className?: string }) {
  return (
    <div className={cn('flex items-center justify-center', className)}>
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-[#2a2a2a] border-t-white" />
    </div>
  );
}

/**
 * Button loading state
 */
export function ButtonLoading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      <span>{text}</span>
    </div>
  );
}

/**
 * Unified LoadingSkeleton component with variant support
 */
type LoadingSkeletonVariant =
  | 'editor'
  | 'threadList'
  | 'aiResponse'
  | 'card'
  | 'listItem'
  | 'table'
  | 'header'
  | 'sidebar'
  | 'fullPage';

interface LoadingSkeletonProps {
  variant: LoadingSkeletonVariant;
  className?: string;
  rows?: number;
  columns?: number;
}

export function LoadingSkeleton({ variant, className, rows, columns }: LoadingSkeletonProps) {
  switch (variant) {
    case 'editor':
      return <CodeEditorSkeleton className={className} />;
    case 'threadList':
      return <ThreadListSkeleton className={className} />;
    case 'aiResponse':
      return <AIResponseSkeleton className={className} />;
    case 'card':
      return <CardSkeleton className={className} />;
    case 'listItem':
      return <ListItemSkeleton className={className} />;
    case 'table':
      return <TableSkeleton rows={rows} columns={columns} className={className} />;
    case 'header':
      return <HeaderSkeleton className={className} />;
    case 'sidebar':
      return <SidebarSkeleton className={className} />;
    case 'fullPage':
      return <FullPageSkeleton />;
    default:
      return <CodeEditorSkeleton className={className} />;
  }
}
