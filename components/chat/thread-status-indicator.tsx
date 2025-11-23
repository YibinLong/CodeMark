"use client"

import { CheckCircleIcon, CircleDotIcon, AlertCircleIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { Thread } from "@/lib/types"

export interface ThreadStatusIndicatorProps {
  status: Thread["status"]
  variant?: "badge" | "icon" | "full"
  className?: string
}

export function ThreadStatusIndicator({ status, variant = "badge", className }: ThreadStatusIndicatorProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "active":
        return {
          label: "Active",
          icon: CircleDotIcon,
          color: "text-[#5B9EFF]",
          bg: "bg-[#5B9EFF]/10",
        }
      case "resolved":
        return {
          label: "Resolved",
          icon: CheckCircleIcon,
          color: "text-[#4ADE80]",
          bg: "bg-[#4ADE80]/10",
        }
      default:
        return {
          label: "Unknown",
          icon: AlertCircleIcon,
          color: "text-[#808080]",
          bg: "bg-[#808080]/10",
        }
    }
  }

  const config = getStatusConfig()
  const Icon = config.icon

  if (variant === "icon") {
    return <Icon className={cn("h-4 w-4", config.color, className)} />
  }

  if (variant === "full") {
    return (
      <div className={cn("flex items-center gap-2 px-2 py-1 rounded", config.bg, className)}>
        <Icon className={cn("h-3 w-3", config.color)} />
        <span className={cn("text-xs font-medium", config.color)}>{config.label}</span>
      </div>
    )
  }

  return (
    <Badge variant="secondary" className={cn("h-4 text-[10px] border-0", config.bg, config.color, className)}>
      {config.label}
    </Badge>
  )
}
